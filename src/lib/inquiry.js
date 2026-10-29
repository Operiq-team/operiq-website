/** Shared contact-form parsing for the page script and the Pages Function. */

import { copyFor } from "../i18n/form-copy.js";

export const CONTACT_EMAIL = "post@operiq.no";

export const TOPICS = {
  vurdering: "Vurdering av dagens anlegg",
  forslag: "Løsningsforslag",
  portefolje: "Flere eiendommer",
  kamera: "Kameraovervåkning",
  butikk: "Butikk og kjeder",
  annet: "Annet",
};

export const PROPERTY_TYPES = {
  naering: "Næringsbygg",
  lager: "Lager og logistikk",
  portefolje: "Eiendomsportefølje",
  butikk: "Butikk",
  annet: "Annet",
};

export const EXISTING = {
  ja: "Ja",
  nei: "Nei",
  usikker: "Usikker",
};

export const INQUIRY_TYPES = {
  eksisterende: "Eksisterende kameraanlegg",
  nytt: "Nytt anlegg",
  portefolje: "Flere eiendommer",
};

const TOPIC_TO_TYPE = {
  vurdering: "eksisterende",
  eksisterende: "eksisterende",
  forslag: "nytt",
  nytt: "nytt",
  kamera: "nytt",
  portefolje: "portefolje",
  butikk: "portefolje",
};

const LIMITS = {
  name: 120,
  email: 160,
  phone: 40,
  company: 160,
  building: 240,
  location: 240,
  message: 4000,
};

function clean(value, max) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

export function parseInquiry(raw, locale = "nb") {
  const copy = copyFor(locale);
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const honeypot = clean(source.website, 200);

  if (honeypot) {
    return { ok: true, spam: true, value: null };
  }

  const topic = clean(source.topic, 20);
  const requestedType = clean(source.type, 20);
  const inquiryType = INQUIRY_TYPES[requestedType] ? requestedType : TOPIC_TO_TYPE[topic] || "";
  const propertyType = clean(source.propertyType, 20);
  const existing = clean(source.existing, 20);
  const value = {
    name: clean(source.name, LIMITS.name),
    email: clean(source.email, LIMITS.email),
    phone: clean(source.phone, LIMITS.phone),
    company: clean(source.company, LIMITS.company),
    location: clean(source.location || source.building, LIMITS.location),
    propertyType,
    propertyLabel: copy.properties[propertyType] || "",
    existing,
    existingLabel: copy.existing[existing] || "",
    type: inquiryType,
    typeLabel: copy.types[inquiryType] || "",
    topic,
    topicLabel: copy.topics[topic] || copy.types[inquiryType] || copy.fallbackTopic,
    message: clean(source.message, LIMITS.message),
  };

  if (propertyType && !value.propertyLabel) {
    return { ok: false, error: copy.errProperty };
  }
  if (existing && !value.existingLabel) {
    return { ok: false, error: copy.errExisting };
  }

  if (!value.name || !value.company || !value.email || !value.message) {
    return {
      ok: false,
      error: copy.errRequired,
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    return { ok: false, error: copy.errEmail };
  }

  return { ok: true, spam: false, value };
}

export function inquirySubject(inquiry, locale = "nb") {
  const copy = copyFor(locale);
  const detail = inquiry.typeLabel || copy.topics[inquiry.topic] || "";
  const base = String(copy.subject).replace(/\s*[–—-]\s*$/, "").trim();
  return detail ? `${base} – ${detail}` : base;
}

export function buildMailto(inquiry, email = CONTACT_EMAIL, locale = "nb") {
  const copy = copyFor(locale);
  const [name, mail, phone, company, place, property, existing, kind, topic] = copy.labels;
  const topicText = copy.topics[inquiry.topic] || "";
  const subject = inquirySubject(inquiry, locale);
  const body = [
    `${name}: ${inquiry.name}`,
    `${mail}: ${inquiry.email}`,
    `${phone}: ${inquiry.phone || copy.empty}`,
    `${company}: ${inquiry.company || copy.empty}`,
    `${place}: ${inquiry.location || copy.empty}`,
    `${property}: ${inquiry.propertyLabel || copy.empty}`,
    `${existing}: ${inquiry.existingLabel || copy.empty}`,
    `${kind}: ${inquiry.typeLabel || topicText || copy.empty}`,
    `${topic}: ${topicText || copy.empty}`,
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
