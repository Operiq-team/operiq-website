import { applyPreviewRobots, isIndexableHost, PREVIEW_ROBOTS } from "../src/lib/preview-robots.js";

/**
 * Sends X-Robots-Tag and a robots meta tag for every host other than operiq.no.
 * That covers *.pages.dev preview deployments and the project's pages.dev alias
 * without noindexing the production domain, which shares this build.
 */
export async function onRequest(context) {
  const response = await context.next();
  const host = new URL(context.request.url).hostname;
  if (isIndexableHost(host)) return response;

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", PREVIEW_ROBOTS);

  const type = headers.get("content-type") || "";
  if (!type.includes("text/html")) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  headers.delete("content-length");
  const html = applyPreviewRobots(await response.text());
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
