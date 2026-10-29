import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet, onRequestPost } from "../functions/api/contact.js";
import { buildMailto, parseInquiry } from "../src/lib/inquiry.js";

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

test("subject is the bare enquiry line when no type is chosen", () => {
  const fields = { name: "Ada Nord", email: "ada@example.com", message: "Befaring av et bygg." };
  const english = parseInquiry(fields, "en");
  const norwegian = parseInquiry(fields, "nb");
  assert.equal(mailtoSubject(buildMailto(english.value, "post@operiq.no", "en")), "Enquiry to Operiq");
  assert.equal(mailtoSubject(buildMailto(norwegian.value, "post@operiq.no", "nb")), "Forespørsel til Operiq");
});

test("a chosen type is still named in the subject", () => {
  const parsed = parseInquiry({ name: "Ada Nord", email: "ada@example.com", message: "Review.", type: "eksisterende" }, "en");
  assert.equal(mailtoSubject(buildMailto(parsed.value, "post@operiq.no", "en")), "Enquiry to Operiq – Existing camera system");
});

test("unconfigured function asks the visitor to email", async () => {
  const response = await onRequestPost({
    request: new Request("https://operiq.no/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(valid),
    }),
    env: {},
  });
  assert.equal(response.status, 501);
  const body = await response.json();
  assert.equal(body.delivered, false);
  assert.equal(body.fallback, "mailto");
  assert.ok(body.mailto.startsWith("mailto:post@operiq.no?"));
});

test("html fallback escapes markup", async () => {
  const response = await onRequestPost({
    request: new Request("https://operiq.no/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/html" },
      body: JSON.stringify({ ...valid, name: "<script>alert(1)</script>" }),
    }),
    env: {},
  });
  const html = await response.text();
  assert.equal(response.status, 501);
  assert.equal(html.includes("<script>"), false);
  assert.ok(html.includes("%3Cscript%3E"));
});

test("http forward URL is refused", async () => {
  const response = await onRequestPost({
    request: new Request("https://operiq.no/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(valid),
    }),
    env: { CONTACT_FORWARD_URL: "http://example.com/hook" },
  });
  assert.equal(response.status, 501);
});

test("https forward posts the inquiry without reading a repo secret", async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: 204 });
  };
  try {
    const response = await onRequestPost({
      request: new Request("https://operiq.no/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(valid),
      }),
      env: {
        CONTACT_FORWARD_URL: "https://hooks.example.com/operiq",
        CONTACT_FORWARD_TOKEN: "from-dashboard",
      },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.delivered, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://hooks.example.com/operiq");
    assert.equal(calls[0].init.headers.authorization, "Bearer from-dashboard");
    assert.ok(calls[0].init.body.includes("Ada Nord"));
  } finally {
    globalThis.fetch = original;
  }
});

test("GET is not a form submission", async () => {
  const response = await onRequestGet();
  assert.equal(response.status, 405);
});
