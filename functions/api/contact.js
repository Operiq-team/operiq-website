/**
 * Cloudflare Pages Function for the contact form.
 *
 * Delivery is Resend's HTTP API. Set these in the Cloudflare dashboard only,
 * never in git:
 *   RESEND_API_KEY
 *   CONTACT_TO     for example post@operiq.no
 *   CONTACT_FROM   for example Operiq <skjema@send.operiq.no>
 * If any of them is missing, the function returns 503 and sends nothing.
 */

import { copyFor } from "../../src/i18n/form-copy.js";
import { escapeHtml, parseInquiry } from "../../src/lib/inquiry.js";
import { mailConfig, sendEnquiry } from "../../src/lib/mailer.js";
import { allowIp } from "../../src/lib/rate-limit.js";

const PUBLIC_EMAIL = "post@operiq.no";
const PUBLIC_PHONE = "+47 919 94 544";

function wantsHtml(request) {
  return (request.headers.get("accept") || "").includes("text/html");
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function htmlPage({ title, body, status, locale = "nb" }) {
  const back = locale === "en" ? "/en/contact/" : "/kontakt/";
  const lang = locale === "en" ? "en" : "nb-NO";
  const backLabel = locale === "en" ? "Back to the form" : "Tilbake til skjemaet";
  return new Response(
    `<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><body style="font-family:sans-serif;background:#0b1117;color:#e5e7eb;padding:2rem;line-height:1.5"><h1>${escapeHtml(title)}</h1>${body}<p><a style="color:#c7bda6" href="${back}">${backLabel}</a></p><p><a style="color:#c7bda6" href="mailto:${PUBLIC_EMAIL}">${PUBLIC_EMAIL}</a> · <a style="color:#c7bda6" href="tel:+4791994544">${PUBLIC_PHONE}</a></p></body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

async function readPayload(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return request.json();
  const form = await request.formData();
  const payload = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") payload[key] = value;
  }
  return payload;
}

function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

function fail(html, copy, locale, status, error) {
  return html
    ? htmlPage({ title: copy.apiTitleFail, body: `<p>${escapeHtml(error)}</p>`, status, locale })
    : json({ ok: false, delivered: false, error }, status);
}

export async function onRequestGet(context) {
  const locale = new URL(context?.request?.url || "https://operiq.no/").pathname.startsWith("/en") ? "en" : "nb";
  return new Response(copyFor(locale).apiGet, {
    status: 405,
    headers: { "content-type": "text/plain; charset=utf-8", allow: "POST" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const html = wantsHtml(request);

  let payload;
  try {
    payload = await readPayload(request);
  } catch {
    const error = copyFor("nb").apiRead;
    return fail(html, copyFor("nb"), "nb", 400, error);
  }

  const locale = payload?.locale === "en" ? "en" : "nb";
  const copy = copyFor(locale);
  const parsed = parseInquiry(payload, locale);
  if (!parsed.ok) return fail(html, copy, locale, 400, parsed.error);

  if (parsed.spam) {
    return html
      ? htmlPage({ title: copy.apiThanks, body: `<p>${copy.delivered}</p>`, status: 200, locale })
      : json({ ok: true, delivered: true }, 200);
  }

  const allowed = await allowIp(clientIp(request), {
    limiter: context.limiter,
    cache: context.cache ?? globalThis.caches?.default,
  });
  if (!allowed) return fail(html, copy, locale, 429, copy.errRate);

  const config = mailConfig(env);
  if (!config) return fail(html, copy, locale, 503, copy.errUnavailable);

  try {
    const sent = await sendEnquiry({
      config,
      inquiry: parsed.value,
      locale,
      fetchImpl: context.fetchImpl || globalThis.fetch,
    });
    if (!sent.ok) return fail(html, copy, locale, 502, copy.errSend);
  } catch {
    return fail(html, copy, locale, 502, copy.errSend);
  }

  if (html) {
    return htmlPage({ title: copy.apiThanks, body: `<p>${copy.delivered}</p>`, status: 200, locale });
  }
  return json({ ok: true, delivered: true, message: copy.delivered }, 200);
}
