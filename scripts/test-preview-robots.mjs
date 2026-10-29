import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/_middleware.js";
import { readFile } from "node:fs/promises";
import {
  applyPreviewRobots,
  isIndexableHost,
  isPagesPreviewBuild,
} from "../src/lib/preview-robots.js";

test("only operiq.no is indexable", () => {
  assert.equal(isIndexableHost("operiq.no"), true);
  assert.equal(isIndexableHost("Operiq.no"), true);
  assert.equal(isIndexableHost("operiq.no."), true);
  assert.equal(isIndexableHost("www.operiq.no"), false);
  assert.equal(isIndexableHost("operiq-website.pages.dev"), false);
  assert.equal(isIndexableHost("abc123.operiq-website.pages.dev"), false);
  assert.equal(isIndexableHost("cursor-operiq-marketing-site-e337.operiq-website.pages.dev"), false);
  assert.equal(isIndexableHost(""), false);
});

test("preview builds are Cloudflare Pages branches other than main", () => {
  assert.equal(isPagesPreviewBuild({}), false);
  assert.equal(isPagesPreviewBuild({ CF_PAGES: "1" }), false);
  assert.equal(isPagesPreviewBuild({ CF_PAGES: "1", CF_PAGES_BRANCH: "main" }), false);
  assert.equal(
    isPagesPreviewBuild({ CF_PAGES: "1", CF_PAGES_BRANCH: "cursor/operiq-marketing-site-e337" }),
    true,
  );
  assert.equal(isPagesPreviewBuild({ CF_PAGES_BRANCH: "feature" }), false);
});

test("robots meta is added or replaced", () => {
  const added = applyPreviewRobots("<head><title>Operiq</title></head>");
  assert.match(added, /<head><meta name="robots" content="noindex, nofollow"><title>/);
  const replaced = applyPreviewRobots('<head><meta name="robots" content="index, follow"></head>');
  assert.equal(replaced.includes("index, follow"), false);
  assert.match(replaced, /content="noindex, nofollow"/);
  assert.equal(applyPreviewRobots("<p>Ingen head</p>"), "<p>Ingen head</p>");
});

test("pages.dev hosts are noindexed in _headers and the catch-all is not", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /https:\/\/:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
  assert.match(headers, /https:\/\/:version\.:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
  const catchAllAt = headers.indexOf("/*\n");
  const catchAllRest = headers.slice(catchAllAt + 3);
  const catchAllEnd = catchAllRest.search(/\n(?:\/|https:)/);
  const catchAll = catchAllRest.slice(0, catchAllEnd);
  assert.equal(/X-Robots-Tag:\s*noindex/i.test(catchAll), false);
  assert.match(catchAll, /X-Frame-Options: SAMEORIGIN/);
});

async function respond(url, body = "<head><title>Operiq</title></head>", contentType = "text/html; charset=utf-8") {
  return onRequest({
    request: new Request(url),
    async next() {
      return new Response(body, {
        status: 200,
        headers: { "content-type": contentType, "content-length": String(body.length) },
      });
    },
  });
}

test("pages.dev html is noindex and keeps security headers", async () => {
  const response = await respond("https://d981e9d.operiq-website.pages.dev/");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(response.headers.get("X-Frame-Options"), "SAMEORIGIN");
  assert.equal(response.headers.get("content-length"), null);
  const html = await response.text();
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
});

test("operiq.no responses stay indexable", async () => {
  const response = await respond("https://operiq.no/");
  assert.equal(response.headers.get("X-Robots-Tag"), null);
  const html = await response.text();
  assert.equal(html.includes("noindex"), false);
});

test("non-html preview assets are left unchanged for _headers", async () => {
  const response = await respond("https://operiq-website.pages.dev/og.jpg", "bytes", "image/jpeg");
  assert.equal(response.headers.get("X-Robots-Tag"), null);
  assert.equal(response.headers.get("X-Frame-Options"), null);
  assert.equal(await response.text(), "bytes");
});
