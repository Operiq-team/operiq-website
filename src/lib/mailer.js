/**
 * Resend's HTTP API. The key and addresses come from the host environment.
 * Intended sender, once approved: Operiq <skjema@send.operiq.no>
 * Intended recipient: post@operiq.no
 */

import { inquirySubject } from "./inquiry.js";
import { copyFor } from "../i18n/form-copy.js";

/** Keep a display name such as Operiq <skjema@send.operiq.no>, and drop wrapping quotes. */
export function parseAddress(value) {
  let raw = String(value || "").trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  return raw.replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

export function mailConfig(env) {
  const apiKey = String(env?.RESEND_API_KEY || "").trim();
  const to = parseAddress(env?.CONTACT_TO);
  const from = parseAddress(env?.CONTACT_FROM);
  if (!apiKey || !to || !from) return null;
  return { apiKey, to, from };
}

export function inquiryText(inquiry, locale = "nb") {
  const copy = copyFor(locale);
  const [name, mail, phone, company, place, property, existing, kind] = copy.labels;
  return [
    `${name}: ${inquiry.name}`,
    `${company}: ${inquiry.company}`,
    `${mail}: ${inquiry.email}`,
    `${phone}: ${inquiry.phone || copy.empty}`,
    `${place}: ${inquiry.location || copy.empty}`,
    `${property}: ${inquiry.propertyLabel || copy.empty}`,
    `${existing}: ${inquiry.existingLabel || copy.empty}`,
    `${kind}: ${inquiry.typeLabel || copy.empty}`,
    "",
    inquiry.message,
  ].join("\n");
}

export async function sendEnquiry({ config, inquiry, locale, fetchImpl = globalThis.fetch }) {
  const subject = inquirySubject(inquiry, locale);
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      reply_to: inquiry.email,
      subject,
      text: inquiryText(inquiry, locale),
    }),
  });
  let id = "";
  try {
    const data = await response.json();
    if (typeof data?.id === "string") id = data.id;
  } catch {
    id = "";
  }
  return { ok: response.status >= 200 && response.status < 300, status: response.status, id, subject };
}
