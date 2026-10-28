/** Shared contact-form parsing for the page script and the Pages Function. */

export const CONTACT_EMAIL = "post@operiq.no";

export const TOPICS = {
  kamera: "Kameraovervåking",
  butikk: "Butikk og kjeder",
  annet: "Annet",
};

const LIMITS = {
  name: 120,
  email: 160,
  phone: 40,
  company: 160,
  building: 240,
  message: 4000,
};

function clean(value, max) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

export function parseInquiry(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const honeypot = clean(source.website, 200);

  if (honeypot) {
    return { ok: true, spam: true, value: null };
  }

  const topic = clean(source.topic, 20);
  const value = {
    name: clean(source.name, LIMITS.name),
    email: clean(source.email, LIMITS.email),
    phone: clean(source.phone, LIMITS.phone),
    company: clean(source.company, LIMITS.company),
    building: clean(source.building, LIMITS.building),
    topic,
    topicLabel: TOPICS[topic] || "",
    message: clean(source.message, LIMITS.message),
  };

  if (!value.name || !value.email || !value.message || !value.topicLabel) {
    return {
      ok: false,
      error: "Fyll inn navn, e-post, tema og hva du trenger hjelp til.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    return { ok: false, error: "Skriv inn en gyldig e-postadresse." };
  }

  return { ok: true, spam: false, value };
}

export function buildMailto(inquiry, email = CONTACT_EMAIL) {
  const subject = `Forespørsel til Operiq – ${inquiry.topicLabel}`;
  const body = [
    `Navn: ${inquiry.name}`,
    `E-post: ${inquiry.email}`,
    `Telefon: ${inquiry.phone || "–"}`,
    `Firma: ${inquiry.company || "–"}`,
    `Bygg: ${inquiry.building || "–"}`,
    `Tema: ${inquiry.topicLabel}`,
    "",
    inquiry.message,
  ].join("\n");

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
