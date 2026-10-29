/**
 * operiq.no is the only host that should be indexed.
 * *.pages.dev previews, including the production branch's pages.dev alias,
 * must send noindex. Cloudflare Pages `_headers` cannot vary by host, so
 * preview branch builds append the header in dist, and functions/_middleware.js
 * applies it per request.
 */

export const INDEXABLE_HOST = "operiq.no";
export const PREVIEW_ROBOTS = "noindex, nofollow";
export const PREVIEW_ROBOTS_HEADER = `X-Robots-Tag: ${PREVIEW_ROBOTS}`;

export function isIndexableHost(host) {
  const name = String(host || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  return name === INDEXABLE_HOST;
}

/**
 * Cloudflare sets CF_PAGES=1 and CF_PAGES_BRANCH for every Pages build.
 * The production branch is `main`. Every other branch is a preview and is
 * served only on pages.dev, so the static output can carry noindex.
 * An empty branch does not count: a misconfigured production build stays indexable.
 */
export function isPagesPreviewBuild(env = process.env) {
  if (env.CF_PAGES !== "1") return false;
  const branch = String(env.CF_PAGES_BRANCH || "").trim();
  if (!branch) return false;
  return branch !== "main";
}

export function applyPreviewRobots(html) {
  const tag = `<meta name="robots" content="${PREVIEW_ROBOTS}">`;
  const metaRe = /<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/i;
  if (metaRe.test(html)) return html.replace(metaRe, tag);
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (open) => `${open}${tag}`);
  }
  return html;
}

export function withPreviewRobotsHeader(headersText) {
  if (headersText.includes(PREVIEW_ROBOTS_HEADER)) return headersText;
  return `${headersText.replace(/\s*$/, "")}\n\n/*\n  ${PREVIEW_ROBOTS_HEADER}\n`;
}
