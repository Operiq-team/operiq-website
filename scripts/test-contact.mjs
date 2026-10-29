import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet, onRequestPost } from "../functions/api/contact.js";
import { buildMailto, parseInquiry } from "../src/lib/inquiry.js";
import { createRateLimiter } from "../src/lib/rate-limit.js";
import { sendEnquiry } from "../src/lib/mailer.js";

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
  return onRequestPost({
    request: new Request("https://operiq.no/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", accept: extra.accept || "application/json" },
      body: JSON.stringify(body),
    }),
    env: extra.env || {},
    limiter: extra.limiter || createRateLimiter(),
    fetchImpl: extra.fetchImpl,
  });
}

const ready = {
  RESEND_API_KEY: "test-key",
  CONTACT_TO: "post@operiq.no",
  CONTACT_FROM: "Operiq <skjema@send.operiq.no>",
};

test("missing delivery settings return 503 and do not claim success", async () => {
  const response = await post(valid);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.delivered, false);
  assert.equal(body.ok, false);
  assert.match(body.error, /kunne ikke sendes/);
});

test("english 503 uses the english error", async () => {
  const response = await post({ ...valid, locale: "en" });
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
  const first = await post(valid, { limiter });
  const second = await post(valid, { limiter });
  const third = await post(valid, { limiter });
  assert.equal(first.status, 503);
  assert.equal(second.status, 503);
  assert.equal(third.status, 429);
});

test("a mocked provider success is only reported on 2xx", async () => {
  const calls = [];
  const response = await post(valid, {
    env: ready,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.delivered, true);
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
  const response = await post({ ...valid, locale: "en" }, {
    env: ready,
    fetchImpl: async () => new Response("no", { status: 422 }),
  });
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.delivered, false);
  assert.match(body.error, /not sent/);
});

test("html error page escapes markup and shows the public contacts", async () => {
  const response = await post(
    { ...valid, name: "<script>alert(1)</script>" },
    { accept: "text/html" },
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
