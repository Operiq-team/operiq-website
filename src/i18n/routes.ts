export const locales = ["nb", "en"] as const;
export type Locale = (typeof locales)[number];

export const pageIds = [
  "home",
  "commercial",
  "warehouse",
  "portfolio",
  "existing",
  "retail",
  "secure",
  "about",
  "contact",
  "privacy",
  "notice",
  "notFound",
] as const;

export type PageId = (typeof pageIds)[number];

/**
 * Directory URLs, with a trailing slash, match Cloudflare Pages.
 * The Norwegian 404 is the special file /404.html, so its public path stays /404.
 */
export const paths: Record<PageId, Record<Locale, string>> = {
  home: { nb: "/", en: "/en/" },
  commercial: { nb: "/naeringsbygg/", en: "/en/commercial-buildings/" },
  warehouse: { nb: "/lager-og-logistikk/", en: "/en/warehouse-logistics/" },
  portfolio: { nb: "/eiendomsportefoljer/", en: "/en/portfolios/" },
  existing: { nb: "/eksisterende-kameraanlegg/", en: "/en/existing-systems/" },
  retail: { nb: "/butikk/", en: "/en/retail-chains/" },
  secure: { nb: "/kameraovervaking/", en: "/en/camera-surveillance/" },
  about: { nb: "/om-oss/", en: "/en/about/" },
  contact: { nb: "/kontakt/", en: "/en/contact/" },
  privacy: { nb: "/personvern/", en: "/en/privacy/" },
  notice: { nb: "/kamera-info/", en: "/en/camera-notice/" },
  notFound: { nb: "/404", en: "/en/404/" },
};

export function pathFor(locale: Locale, id: PageId): string {
  return paths[id][locale];
}

function withoutSlash(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function pageIdFromPath(pathname: string): PageId {
  const path = withoutSlash(pathname);
  for (const id of pageIds) {
    if (withoutSlash(paths[id].nb) === path || withoutSlash(paths[id].en) === path) return id;
  }
  return "home";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "nb" : "en";
}
