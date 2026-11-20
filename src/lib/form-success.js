/**
 * A real delivery from /api/contact includes a string `id` from the mail provider.
 * Honeypot and too-fast accepts return `{ ok: true, delivered: true }` and nothing else,
 * so they must not be recorded as conversions.
 */
export function isMeasuredSubmission(payload) {
  return Boolean(payload && payload.delivered === true && typeof payload.id === "string");
}

export function thanksPathFor(locale) {
  return locale === "en" ? "/en/contact/thanks/" : "/kontakt/takk/";
}
