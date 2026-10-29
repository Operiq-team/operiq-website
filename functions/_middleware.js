import {
  applyPreviewRobots,
  isIndexableHost,
  PREVIEW_ROBOTS,
  SECURITY_HEADERS,
} from "../src/lib/preview-robots.js";

/**
 * HTML on any host other than operiq.no gets a robots meta tag and
 * X-Robots-Tag. Static files are returned unchanged so public/_headers can
 * attach the pages.dev noindex rule and the security headers.
 * A function Response does not inherit _headers, so rewritten HTML sets
 * those security headers itself.
 */
export async function onRequest(context) {
  const response = await context.next();
  const host = new URL(context.request.url).hostname;
  if (isIndexableHost(host)) return response;

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", PREVIEW_ROBOTS);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  headers.delete("content-length");

  const html = applyPreviewRobots(await response.text());
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
