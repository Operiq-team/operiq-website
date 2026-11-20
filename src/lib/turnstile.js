/**
 * Server-side Cloudflare Turnstile check. The site key is public.
 * TURNSTILE_SECRET_KEY stays in the Pages environment and is never committed.
 */

export const TURNSTILE_ACTION = "contact";
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const ALLOWED_HOSTS = new Set([
  "operiq.no",
  "www.operiq.no",
  "localhost",
  "127.0.0.1",
  "operiq-website.pages.dev",
]);

export function turnstileHostnameAllowed(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/:\d+$/, "");
  if (!host || host.includes("/") || host.includes(" ")) return false;
  if (ALLOWED_HOSTS.has(host)) return true;
  return host.endsWith(".operiq-website.pages.dev");
}

export async function verifyTurnstile({ token, secret, remoteip, fetchImpl = globalThis.fetch } = {}) {
  const responseToken = String(token || "").trim();
  const key = String(secret || "").trim();
  if (!responseToken || !key || responseToken.length > 2048) return { ok: false };

  const params = new URLSearchParams({
    secret: key,
    response: responseToken,
  });
  const ip = String(remoteip || "").trim();
  if (ip && ip !== "unknown") params.set("remoteip", ip);

  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
      redirect: "manual",
    });
    if (!response || response.status < 200 || response.status >= 300) return { ok: false };
    const data = await response.json();
    if (data?.success !== true) return { ok: false };
    if (data.action !== TURNSTILE_ACTION) return { ok: false };
    if (!turnstileHostnameAllowed(data.hostname)) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
