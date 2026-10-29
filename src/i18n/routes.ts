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

/** Norwegian paths stay as they are. English lives under /en without a trailing slash. */
export const paths: Record<PageId, Record<Locale, string>> = {
  home: { nb: "/", en: "/en" },
  commercial: { nb: "/naeringsbygg", en: "/en/commercial-buildings" },
  warehouse: { nb: "/lager-og-logistikk", en: "/en/warehouse-logistics" },
  portfolio: { nb: "/eiendomsportefoljer", en: "/en/portfolios" },
  existing: { nb: "/eksisterende-kameraanlegg", en: "/en/existing-systems" },
  retail: { nb: "/butikk", en: "/en/retail-chains" },
  secure: { nb: "/kameraovervaking", en: "/en/camera-surveillance" },
  about: { nb: "/om-oss", en: "/en/about" },
  contact: { nb: "/kontakt", en: "/en/contact" },
  privacy: { nb: "/personvern", en: "/en/privacy" },
  notice: { nb: "/kamera-info", en: "/en/camera-notice" },
  notFound: { nb: "/404", en: "/en/404" },
};

export function pathFor(locale: Locale, id: PageId): string {
  return paths[id][locale];
}

export function pageIdFromPath(pathname: string): PageId {
  const path = pathname.replace(/\/$/, "") || "/";
  for (const id of pageIds) {
    if (paths[id].nb === path || paths[id].en === path) return id;
  }
  return "home";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "nb" : "en";
}
