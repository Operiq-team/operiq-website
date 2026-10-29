/** Shared contact-form parsing for the page script and the Pages Function. */

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

export function parseInquiry(raw) {
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
    propertyLabel: PROPERTY_TYPES[propertyType] || "",
    existing,
    existingLabel: EXISTING[existing] || "",
    type: inquiryType,
    typeLabel: INQUIRY_TYPES[inquiryType] || "",
    topic,
    topicLabel: TOPICS[topic] || INQUIRY_TYPES[inquiryType] || "Henvendelse",
    message: clean(source.message, LIMITS.message),
  };

  if (propertyType && !value.propertyLabel) {
    return { ok: false, error: "Velg type eiendom fra listen." };
  }
  if (existing && !value.existingLabel) {
    return { ok: false, error: "Oppgi om det finnes et kameraanlegg fra før." };
  }

  if (!value.name || !value.email || !value.message) {
    return {
      ok: false,
      error: "Fyll inn navn, e-post og hva du trenger hjelp til.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    return { ok: false, error: "Skriv inn en gyldig e-postadresse." };
  }

  return { ok: true, spam: false, value };
}

export function buildMailto(inquiry, email = CONTACT_EMAIL) {
  const subject = `Forespørsel til Operiq – ${inquiry.typeLabel || inquiry.topicLabel}`;
  const body = [
    `Navn: ${inquiry.name}`,
    `E-post: ${inquiry.email}`,
    `Telefon: ${inquiry.phone || "–"}`,
    `Firma: ${inquiry.company || "–"}`,
    `Sted: ${inquiry.location || "–"}`,
    `Type eiendom: ${inquiry.propertyLabel || "–"}`,
    `Eksisterende anlegg: ${inquiry.existingLabel || "–"}`,
    `Type henvendelse: ${inquiry.typeLabel || inquiry.topicLabel}`,
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
