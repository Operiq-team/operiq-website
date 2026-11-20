/**
 * Minimum time between the form becoming interactive and a real submission.
 * A valid stamp is issued by /api/contact-stamp and is the clock we trust.
 * A client timestamp is only a fallback for requests that never received a
 * stamp. When the check itself fails, this returns false so a real enquiry
 * is not silently discarded. Turnstile remains the gate that can reject.
 */

export const MIN_FILL_MS = 3000;
const MAX_STAMP_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_STAMP_LENGTH = 200;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function issueFormStamp(secret, now = Date.now()) {
  const key = String(secret || "").trim();
  if (!key || !globalThis.crypto?.subtle) return "";
  const issuedAt = String(now);
  const signature = await sign(key, `v1:${issuedAt}`);
  return `v1.${issuedAt}.${signature}`;
}

export async function readFormStamp(stamp, secret) {
  const key = String(secret || "").trim();
  const raw = String(stamp || "");
  if (!key || !globalThis.crypto?.subtle || raw.length > MAX_STAMP_LENGTH) return null;
  const [version, issuedAt, signature, extra] = raw.split(".");
  if (version !== "v1" || extra || !/^\d{13}$/.test(issuedAt || "") || !signature) return null;
  const expected = await sign(key, `v1:${issuedAt}`);
  if (!timingSafeEqual(signature, expected)) return null;
  return Number(issuedAt);
}

function clientElapsed(renderedAt, now) {
  const clientAt = Number(String(renderedAt ?? "").trim());
  if (!Number.isFinite(clientAt)) return null;
  return now - clientAt;
}

async function tooFast({ renderedAt, stamp, secret, now }) {
  const key = String(secret || "").trim();
  if (key && stamp) {
    const issuedAt = await readFormStamp(stamp, key);
    if (issuedAt !== null) {
      const elapsed = now - issuedAt;
      if (elapsed >= 0 && elapsed <= MAX_STAMP_AGE_MS) return elapsed < MIN_FILL_MS;
    }
  }
  const elapsed = clientElapsed(renderedAt, now);
  return elapsed !== null && elapsed >= 0 && elapsed < MIN_FILL_MS;
}

export async function submissionIsTooFast(input = {}) {
  try {
    const now = Number.isFinite(input.now) ? input.now : Date.now();
    return await tooFast({ ...input, now });
  } catch {
    return false;
  }
}
