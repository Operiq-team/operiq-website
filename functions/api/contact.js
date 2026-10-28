/**
 * Cloudflare Pages Function – stub for skjemaet på /kontakt.
 *
 * TODO(eier): Funksjonen sender ikke e-post av seg selv, og trenger ingen
 * hemmelighet for å ligge i repoet. Uten miljøvariabelen CONTACT_FORWARD_URL
 * svarer den med en ferdig mailto-lenke til post@operiq.no.
 *
 * Når du vil ha serversending (fortsatt uten hemmeligheter i git):
 * 1. Sett CONTACT_FORWARD_URL til en https-adresse du kontrollerer.
 * 2. Valgfritt: CONTACT_FORWARD_TOKEN sendes som Bearer-token.
 * 3. Sett contactMode til "server" i src/site.ts og bygg på nytt,
 *    ellers åpner skjemaet e-postprogrammet før funksjonen blir brukt.
 *
 * Ikke legg token eller URL i dette repoet.
 */

import {
  CONTACT_EMAIL,
  buildMailto,
  escapeHtml,
  parseInquiry,
} from "../../src/lib/inquiry.js";

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

function htmlPage({ title, body, status }) {
  return new Response(
    `<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><body style="font-family:sans-serif;background:#0b1117;color:#e5e7eb;padding:2rem;line-height:1.5"><h1>${escapeHtml(title)}</h1>${body}<p><a style="color:#c7bda6" href="/kontakt">Tilbake til skjemaet</a></p></body></html>`,
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
  if (type.includes("application/json")) {
    const data = await request.json();
    return data;
  }
  const form = await request.formData();
  const payload = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") payload[key] = value;
  }
  return payload;
}

function mailtoFallback(inquiry, status, message) {
  const href = buildMailto(inquiry, CONTACT_EMAIL);
  return { href, status, message };
}

export async function onRequestGet() {
  return new Response("Skjemaet sendes fra /kontakt.", {
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
    const error = "Kunne ikke lese skjemaet. Send e-post til post@operiq.no.";
    return html
      ? htmlPage({ title: "Skjemaet ble ikke sendt", body: `<p>${error}</p>`, status: 400 })
      : json({ ok: false, error }, 400);
  }

  const parsed = parseInquiry(payload);
  if (!parsed.ok) {
    return html
      ? htmlPage({
          title: "Sjekk feltene",
          body: `<p>${escapeHtml(parsed.error)}</p>`,
          status: 400,
        })
      : json({ ok: false, error: parsed.error }, 400);
  }

  if (parsed.spam) {
    return html
      ? htmlPage({
          title: "Takk",
          body: "<p>Henvendelsen er registrert.</p>",
          status: 200,
        })
      : json({ ok: true, delivered: true }, 200);
  }

  const forwardUrl = env?.CONTACT_FORWARD_URL || "";
  let forward;
  try {
    forward = forwardUrl ? new URL(forwardUrl) : null;
  } catch {
    forward = null;
  }

  if (!forward || forward.protocol !== "https:") {
    const fallback = mailtoFallback(
      parsed.value,
      501,
      "Skjemaet er ikke koblet til utsending ennå. Send e-posten selv.",
    );
    if (html) {
      return htmlPage({
        title: "Send e-posten",
        status: 501,
        body: `<p>${escapeHtml(fallback.message)}</p><p><a style="color:#c7bda6" href="${escapeHtml(fallback.href)}">Åpne e-post til ${escapeHtml(CONTACT_EMAIL)}</a></p>`,
      });
    }
    return json(
      {
        ok: false,
        delivered: false,
        fallback: "mailto",
        mailto: fallback.href,
        error: fallback.message,
      },
      501,
    );
  }

  try {
    const headers = { "content-type": "application/json" };
    if (env.CONTACT_FORWARD_TOKEN) {
      headers.authorization = `Bearer ${env.CONTACT_FORWARD_TOKEN}`;
    }
    const response = await globalThis.fetch(forward.href, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...parsed.value,
        source: "operiq.no",
      }),
    });
    if (!response.ok) throw new Error("forward failed");
  } catch {
    const fallback = mailtoFallback(
      parsed.value,
      502,
      "Utsendingen svarte ikke. Send e-posten selv.",
    );
    if (html) {
      return htmlPage({
        title: "Send e-posten",
        status: 502,
        body: `<p>${escapeHtml(fallback.message)}</p><p><a style="color:#c7bda6" href="${escapeHtml(fallback.href)}">Åpne e-post til ${escapeHtml(CONTACT_EMAIL)}</a></p>`,
      });
    }
    return json(
      {
        ok: false,
        delivered: false,
        fallback: "mailto",
        mailto: fallback.href,
        error: fallback.message,
      },
      502,
    );
  }

  if (html) {
    return htmlPage({
      title: "Takk",
      status: 200,
      body: "<p>Vi har mottatt henvendelsen og svarer på e-post.</p>",
    });
  }

  return json({ ok: true, delivered: true }, 200);
}
