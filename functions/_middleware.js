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
function isEnglishPath(pathname) {
  return pathname === "/en" || pathname.startsWith("/en/");
}

async function englishNotFoundHtml(context, origin) {
  if (!context.env?.ASSETS?.fetch) return null;
  for (const assetPath of ["/en/404/index.html", "/en/404.html"]) {
    const asset = await context.env.ASSETS.fetch(new URL(assetPath, origin));
    if (!asset.ok) continue;
    const html = await asset.text();
    if (html.includes('lang="en"') && html.includes("Page not found")) return html;
  }
  return null;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  let response = await context.next();

  if (response.status === 404 && isEnglishPath(url.pathname)) {
    const html = await englishNotFoundHtml(context, url.origin);
    if (html) {
      const headers = new Headers(response.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      headers.delete("content-length");
      response = new Response(html, { status: 404, statusText: "Not Found", headers });
    }
  }

  const host = url.hostname;
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
