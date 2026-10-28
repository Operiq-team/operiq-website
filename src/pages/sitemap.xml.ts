import type { APIRoute } from "astro";
import { pages, site } from "../site";

export const prerender = true;

export const GET: APIRoute = () => {
  const body = pages
    .map((page) => {
      const loc = new URL(page.path, site.url).href;
      return `  <url><loc>${loc}</loc><lastmod>2026-10-28</lastmod></url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
