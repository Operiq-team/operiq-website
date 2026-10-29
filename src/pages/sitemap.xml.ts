import type { APIRoute } from "astro";
import { pageIds, paths } from "../i18n/routes";
import { site } from "../site";

export const prerender = true;

export const GET: APIRoute = () => {
  const body = pageIds
    .filter((id) => id !== "notFound")
    .flatMap((id) => {
      const nb = new URL(paths[id].nb, site.url).href;
      const en = new URL(paths[id].en, site.url).href;
      const links = [
        `<xhtml:link rel="alternate" hreflang="nb-NO" href="${nb}"/>`,
        `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
        `<xhtml:link rel="alternate" hreflang="x-default" href="${nb}"/>`,
      ].join("");
      return [
        `  <url><loc>${nb}</loc>${links}<lastmod>2026-10-29</lastmod></url>`,
        `  <url><loc>${en}</loc>${links}<lastmod>2026-10-29</lastmod></url>`,
      ];
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
