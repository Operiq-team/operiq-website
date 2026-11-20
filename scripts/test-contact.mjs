import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet, onRequestPost } from "../functions/api/contact.js";
import { onRequestGet as stampGet, onRequestPost as stampPost } from "../functions/api/contact-stamp.js";
import { issueFormStamp, MIN_FILL_MS, readFormStamp, submissionIsTooFast } from "../src/lib/form-stamp.js";
import { buildMailto, parseInquiry } from "../src/lib/inquiry.js";
import { mailConfig, sendEnquiry } from "../src/lib/mailer.js";
import { createRateLimiter } from "../src/lib/rate-limit.js";
import { TURNSTILE_VERIFY_URL, turnstileHostnameAllowed, verifyTurnstile } from "../src/lib/turnstile.js";

function mailtoSubject(href) {
  return new URLSearchParams(href.slice(href.indexOf("?") + 1)).get("subject");
}

const valid = {
  name: "Ada Nord",
  email: "ada@example.com",
  phone: "",
  company: "Nord Drift",
  building: "Eksempelveien 1",
  topic: "kamera",
  message: "Trenger befaring av et næringsbygg.",
  website: "",
};

test("parseInquiry accepts a complete request", () => {
  const parsed = parseInquiry(valid);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.topicLabel, "Kameraovervåkning");
});

test("parseInquiry rejects a missing message", () => {
  const parsed = parseInquiry({ ...valid, message: "  " });
  assert.equal(parsed.ok, false);
});

test("honeypot is treated as accepted spam", () => {
  const parsed = parseInquiry({ ...valid, website: "https://spam.example" });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.spam, true);
});

test("mailto contains the public address and escaped subject", () => {
  const parsed = parseInquiry(valid);
  const href = buildMailto(parsed.value);
  assert.ok(href.startsWith("mailto:post@operiq.no?"));
  assert.ok(href.includes(encodeURIComponent("Kameraovervåkning")));
  assert.ok(href.includes(encodeURIComponent("Ada Nord")));
  assert.equal(mailtoSubject(href), "Forespørsel til Operiq – Nytt anlegg");
});

test("a quoted display-name sender is kept for Resend", () => {
  const config = mailConfig({
    RESEND_API_KEY: "test-key",
    CONTACT_TO: "post@operiq.no",
    CONTACT_FROM: '"Operiq <skjema@send.operiq.no>"',
  });
  assert.equal(config.from, "Operiq <skjema@send.operiq.no>");
  assert.equal(config.to, "post@operiq.no");
});

test("company is required", () => {
  const parsed = parseInquiry({ ...valid, company: " " });
  assert.equal(parsed.ok, false);
});

test("subject is the bare enquiry line when no type is chosen", () => {
  const fields = { name: "Ada Nord", company: "Nord Drift", email: "ada@example.com", message: "Befaring av et bygg." };
  const english = parseInquiry(fields, "en");
  const norwegian = parseInquiry(fields, "nb");
  assert.equal(mailtoSubject(buildMailto(english.value, "post@operiq.no", "en")), "Enquiry to Operiq");
  assert.equal(mailtoSubject(buildMailto(norwegian.value, "post@operiq.no", "nb")), "Forespørsel til Operiq");
});

test("a chosen type is still named in the subject", () => {
  const parsed = parseInquiry({ name: "Ada Nord", company: "Nord Drift", email: "ada@example.com", message: "Review.", type: "eksisterende" }, "en");
  assert.equal(mailtoSubject(buildMailto(parsed.value, "post@operiq.no", "en")), "Enquiry to Operiq – Existing camera system");
});

function post(body, extra = {}) {
  const headers = {
    "content-type": "application/json",
    accept: extra.accept || "application/json",
  };
  if (extra.ip) headers["cf-connecting-ip"] = extra.ip;
  return onRequestPost({
    request: new Request("https://operiq.no/api/contact", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    env: extra.env || {},
    limiter: extra.limiter || createRateLimiter(),
    fetchImpl: extra.fetchImpl,
    verifyTurnstile: extra.verifyTurnstile,
    turnstileFetch: extra.turnstileFetch,
    now: extra.now,
  });
}

const allowHuman = async () => ({ ok: true });

function human(extra = {}) {
  return { verifyTurnstile: allowHuman, ...extra };
}

const ready = {
  RESEND_API_KEY: "test-key",
  CONTACT_TO: "post@operiq.no",
  CONTACT_FROM: "Operiq <skjema@send.operiq.no>",
};

test("missing delivery settings return 503 and do not claim success", async () => {
  const response = await post(valid, human());
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.delivered, false);
  assert.equal(body.ok, false);
  assert.match(body.error, /kunne ikke sendes/);
});

test("english 503 uses the english error", async () => {
  const response = await post({ ...valid, locale: "en" }, human());
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error, "The form could not be sent just now. Please try again, or use the email or phone below.");
});

test("honeypot is accepted without calling the mail provider", async () => {
  let called = false;
  const response = await post(
    { ...valid, website: "https://spam.example" },
    { env: ready, fetchImpl: async () => { called = true; return new Response(null, { status: 200 }); } },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).delivered, true);
  assert.equal(called, false);
});

test("rate limit blocks the attempt after the window is full", async () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
  const first = await post(valid, human({ limiter }));
  const second = await post(valid, human({ limiter }));
  const third = await post(valid, human({ limiter }));
  assert.equal(first.status, 503);
  assert.equal(second.status, 503);
  assert.equal(third.status, 429);
});

test("a mocked provider success is only reported on 2xx", async () => {
  const calls = [];
  const response = await post(valid, human({
    env: ready,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    },
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.delivered, true);
  assert.equal(body.id, "email_1");
  assert.equal(body.subject, "Forespørsel til Operiq – Nytt anlegg");
  assert.equal(body.message, "Takk for henvendelsen. Vi har mottatt forespørselen din og tar kontakt så snart vi kan.");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].init.headers.authorization, "Bearer test-key");
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.to[0], "post@operiq.no");
  assert.equal(sent.reply_to, "ada@example.com");
  assert.ok(sent.text.includes("Ada Nord"));
  assert.equal(sent.from, "Operiq <skjema@send.operiq.no>");
});

test("a provider error is not reported as success", async () => {
  const response = await post({ ...valid, locale: "en" }, human({
    env: ready,
    fetchImpl: async () => new Response("no", { status: 422 }),
  }));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.delivered, false);
  assert.match(body.error, /not sent/);
});

test("html error page escapes markup and shows the public contacts", async () => {
  const response = await post(
    { ...valid, name: "<script>alert(1)</script>" },
    human({ accept: "text/html" }),
  );
  const html = await response.text();
  assert.equal(response.status, 503);
  assert.equal(html.includes("<script>"), false);
  assert.ok(html.includes("post@operiq.no"));
  assert.ok(html.includes("+47 919 94 544"));
});

test("sendEnquiry reports only a 2xx provider response", async () => {
  const ok = await sendEnquiry({
    config: { apiKey: "k", to: "post@operiq.no", from: "Operiq <skjema@send.operiq.no>" },
    inquiry: { name: "Ada", company: "Nord", email: "ada@example.com", phone: "", location: "", propertyLabel: "", existingLabel: "", typeLabel: "", message: "Hi" },
    locale: "en",
    fetchImpl: async () => new Response(null, { status: 202 }),
  });
  assert.equal(ok.ok, true);
  const bad = await sendEnquiry({
    config: { apiKey: "k", to: "post@operiq.no", from: "Operiq <skjema@send.operiq.no>" },
    inquiry: { name: "Ada", company: "Nord", email: "ada@example.com", phone: "", location: "", propertyLabel: "", existingLabel: "", typeLabel: "", message: "Hi" },
    locale: "en",
    fetchImpl: async () => new Response(null, { status: 500 }),
  });
  assert.equal(bad.ok, false);
});

test("GET is not a form submission", async () => {
  const response = await onRequestGet();
  assert.equal(response.status, 405);
});

const STAMP_SECRET = "test-turnstile-secret";
const now = 1_763_000_000_000;

function passedTurnstile(hostname = "operiq.no", action = "contact") {
  return new Response(JSON.stringify({ success: true, hostname, action }));
}

test("a token-less submission is rejected and does not call the mail provider", async () => {
  let mailed = false;
  let verified = false;
  const response = await post(valid, {
    env: { ...ready, TURNSTILE_SECRET_KEY: STAMP_SECRET },
    fetchImpl: async () => {
      mailed = true;
      return new Response(JSON.stringify({ id: "email_x" }), { status: 200 });
    },
    turnstileFetch: async () => {
      verified = true;
      return passedTurnstile();
    },
  });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.delivered, false);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Sikkerhetssjekken ble ikke bekreftet. Opplysningene står fortsatt i skjemaet. Prøv å sende på nytt, eller skriv til oss direkte.");
  assert.equal(mailed, false);
  assert.equal(verified, false);
  assert.equal(JSON.stringify(body).includes(STAMP_SECRET), false);
});

test("english turnstile failure names the security check and keeps the enquiry", async () => {
  const response = await post({ ...valid, locale: "en", "cf-turnstile-response": "stale" }, {
    accept: "text/html",
    env: { ...ready, TURNSTILE_SECRET_KEY: STAMP_SECRET },
    turnstileFetch: async () => new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] })),
  });
  const html = await response.text();
  assert.equal(response.status, 403);
  assert.match(html, /The security check was not confirmed/);
  assert.match(html, /still in the form/);
  assert.ok(html.includes("post@operiq.no"));
  assert.equal(html.includes("timeout-or-duplicate"), false);
});

test("a client timestamp younger than 3 seconds is accepted as spam and sends no email", async () => {
  let mailed = false;
  const response = await post(
    { ...valid, renderedAt: String(now - 2999) },
    {
      now,
      env: { ...ready, TURNSTILE_SECRET_KEY: STAMP_SECRET },
      fetchImpl: async () => {
        mailed = true;
        return new Response(null, { status: 200 });
      },
      verifyTurnstile: async () => {
        throw new Error("turnstile should not run for a too-fast submission");
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).delivered, true);
  assert.equal(mailed, false);
});

test("a fresh signed stamp is spam even when the client timestamp looks old", async () => {
  let mailed = false;
  const stamp = await issueFormStamp(STAMP_SECRET, now - 1000);
  const response = await post(
    { ...valid, renderedAt: String(now - 60_000), formStamp: stamp },
    {
      now,
      env: { ...ready, TURNSTILE_SECRET_KEY: STAMP_SECRET },
      fetchImpl: async () => {
        mailed = true;
        return new Response(null, { status: 200 });
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).delivered, true);
  assert.equal(mailed, false);
});

test("an old signed stamp is authoritative and a fast client clock does not drop the enquiry", async () => {
  const calls = [];
  const stamp = await issueFormStamp(STAMP_SECRET, now - MIN_FILL_MS);
  const response = await post(
    {
      ...valid,
      renderedAt: String(now),
      formStamp: stamp,
      "cf-turnstile-response": "widget-token",
    },
    {
      now,
      ip: "203.0.113.9",
      env: { ...ready, TURNSTILE_SECRET_KEY: STAMP_SECRET },
      turnstileFetch: async (url, init) => {
        calls.push({ url, body: init.body });
        return passedTurnstile("cursor-contact-turnstile-9f4e.operiq-website.pages.dev");
      },
      fetchImpl: async (url, init) => {
        calls.push({ url, body: init.body });
        return new Response(JSON.stringify({ id: "email_ok" }), { status: 200 });
      },
    },
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.delivered, true);
  assert.equal(body.id, "email_ok");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, TURNSTILE_VERIFY_URL);
  const params = new URLSearchParams(calls[0].body);
  assert.equal(params.get("secret"), STAMP_SECRET);
  assert.equal(params.get("response"), "widget-token");
  assert.equal(params.get("remoteip"), "203.0.113.9");
  const sent = JSON.parse(calls[1].body);
  assert.equal(sent.reply_to, "ada@example.com");
  assert.equal(sent.subject, "Forespørsel til Operiq – Nytt anlegg");
});

test("a failed siteverify sends no email", async () => {
  let mailed = false;
  const stamp = await issueFormStamp(STAMP_SECRET, now - 10_000);
  const response = await post(
    { ...valid, formStamp: stamp, "cf-turnstile-response": "bad-token" },
    {
      now,
      env: { ...ready, TURNSTILE_SECRET_KEY: STAMP_SECRET },
      turnstileFetch: async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })),
      fetchImpl: async () => {
        mailed = true;
        return new Response(JSON.stringify({ id: "nope" }), { status: 200 });
      },
    },
  );
  assert.equal(response.status, 403);
  assert.equal(mailed, false);
});

test("siteverify success for another host or action sends no email", async () => {
  const stamp = await issueFormStamp(STAMP_SECRET, now - 10_000);
  for (const result of [
    { success: true, hostname: "evil.example", action: "contact" },
    { success: true, hostname: "operiq.no", action: "login" },
  ]) {
    let mailed = false;
    const response = await post(
      { ...valid, formStamp: stamp, "cf-turnstile-response": "token" },
      {
        now,
        env: { ...ready, TURNSTILE_SECRET_KEY: STAMP_SECRET },
        turnstileFetch: async () => new Response(JSON.stringify(result)),
        fetchImpl: async () => {
          mailed = true;
          return new Response(JSON.stringify({ id: "nope" }), { status: 200 });
        },
      },
    );
    assert.equal(response.status, 403);
    assert.equal(mailed, false);
  }
});

test("too-fast submissions do not consume the rate limit", async () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
  const fast = await post({ ...valid, renderedAt: String(now) }, { now, limiter, env: ready });
  const later = await post(valid, human({ limiter }));
  assert.equal(fast.status, 200);
  assert.equal((await fast.json()).delivered, true);
  assert.equal(later.status, 503);
});

test("a missing message is still a validation error when the fill time has passed", async () => {
  const response = await post({ ...valid, message: "" });
  assert.equal(response.status, 400);
});

test("verifyTurnstile posts the token and omits a missing remote ip", async () => {
  let seen;
  const ok = await verifyTurnstile({
    token: "widget-token",
    secret: STAMP_SECRET,
    fetchImpl: async (url, init) => {
      seen = { url, redirect: init.redirect, params: new URLSearchParams(init.body) };
      return passedTurnstile();
    },
  });
  assert.equal(ok.ok, true);
  assert.equal(seen.url, TURNSTILE_VERIFY_URL);
  assert.equal(seen.redirect, "manual");
  assert.equal(seen.params.get("response"), "widget-token");
  assert.equal(seen.params.get("secret"), STAMP_SECRET);
  assert.equal(seen.params.has("remoteip"), false);

  const rejected = await verifyTurnstile({
    token: "widget-token",
    secret: STAMP_SECRET,
    remoteip: "198.51.100.4",
    fetchImpl: async () => {
      throw new Error("network");
    },
  });
  assert.equal(rejected.ok, false);
  const missing = await verifyTurnstile({ token: "", secret: STAMP_SECRET, fetchImpl: async () => {
    throw new Error("should not be called");
  } });
  assert.equal(missing.ok, false);
});

test("turnstile hostnames are limited to the site and its pages previews", () => {
  assert.equal(turnstileHostnameAllowed("operiq.no"), true);
  assert.equal(turnstileHostnameAllowed("www.operiq.no"), true);
  assert.equal(turnstileHostnameAllowed("operiq-website.pages.dev"), true);
  assert.equal(turnstileHostnameAllowed("cursor-contact-turnstile-9f4e.operiq-website.pages.dev"), true);
  assert.equal(turnstileHostnameAllowed("localhost"), true);
  assert.equal(turnstileHostnameAllowed("evil.example"), false);
  assert.equal(turnstileHostnameAllowed("notoperiq-website.pages.dev"), false);
  assert.equal(turnstileHostnameAllowed("operiq.no.evil.example"), false);
});

test("stamps round-trip and a forged stamp does not count as time served", async () => {
  const stamp = await issueFormStamp(STAMP_SECRET, now - 4000);
  assert.equal(await readFormStamp(stamp, STAMP_SECRET), now - 4000);
  assert.equal(await readFormStamp(stamp, "other-secret"), null);
  assert.equal(await readFormStamp(`${stamp}x`, STAMP_SECRET), null);
  assert.equal(await submissionIsTooFast({ stamp, secret: STAMP_SECRET, now, renderedAt: String(now) }), false);
  assert.equal(
    await submissionIsTooFast({ stamp: "v1.1.forged", secret: STAMP_SECRET, now, renderedAt: String(now - 500) }),
    true,
  );
});

test("the stamp endpoint returns a usable stamp and does not echo the secret", async () => {
  const response = await stampPost({
    request: new Request("https://operiq.no/api/contact-stamp", { method: "POST" }),
    env: { TURNSTILE_SECRET_KEY: STAMP_SECRET },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes(STAMP_SECRET), false);
  const issuedAt = await readFormStamp(body.stamp, STAMP_SECRET);
  assert.equal(typeof issuedAt, "number");
  assert.ok(Math.abs(Date.now() - issuedAt) < 5000);

  const empty = await stampPost({
    request: new Request("https://operiq.no/api/contact-stamp", { method: "POST" }),
    env: {},
  });
  assert.equal((await empty.json()).stamp, "");
  const get = await stampGet();
  assert.equal(get.status, 405);
});
