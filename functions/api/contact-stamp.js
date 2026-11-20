/**
 * Issues a short-lived HMAC stamp so the contact handler can measure how
 * long the form has been open. The key is TURNSTILE_SECRET_KEY, already
 * set in Cloudflare Pages. Nothing here is a secret response.
 */

import { issueFormStamp } from "../../src/lib/form-stamp.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestGet() {
  return new Response("Method not allowed", {
    status: 405,
    headers: { "content-type": "text/plain; charset=utf-8", allow: "POST", "cache-control": "no-store" },
  });
}

export async function onRequestPost(context) {
  const secret = context?.env?.TURNSTILE_SECRET_KEY;
  try {
    const stamp = await issueFormStamp(secret);
    return json({ stamp: stamp || "" });
  } catch {
    return json({ stamp: "" });
  }
}
