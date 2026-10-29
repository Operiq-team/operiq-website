import { en } from "./en";
import { no } from "./no";
import { pageIdFromPath, pathFor, paths, type Locale, type PageId } from "./routes";

export const dict = { nb: no, en } as const;

export function ui(locale: Locale) {
  return dict[locale];
}

export function htmlLang(locale: Locale): "nb-NO" | "en" {
  return locale === "en" ? "en" : "nb-NO";
}

export function ogLocale(locale: Locale): "nb_NO" | "en_GB" {
  return locale === "en" ? "en_GB" : "nb_NO";
}

export function hreflangSet(id: PageId) {
  const origin = "https://operiq.no";
  const nb = new URL(paths[id].nb, origin).href;
  const enUrl = new URL(paths[id].en, origin).href;
  return { nb, en: enUrl, xDefault: nb };
}

const svgFrom = ["GATE", "PARKERING", "VAREMOTTAK", "AVFALL", "TEKN.", "FIBER INN", "Næringsbygg", "ILLUSTRASJON"] as const;

const mapAriaNb = "Illustrasjon av en næringseiendom med dekningsområder";
const mapAriaEn = "Illustration of a commercial property with coverage zones";

export function localizeMap(svg: string, locale: Locale): string {
  if (locale !== "en") return svg;
  const to = dict.en.coverage.svg;
  const labelled = svg.replaceAll(mapAriaNb, mapAriaEn);
  return svgFrom.reduce((text, from, index) => text.replaceAll(from, to[index]), labelled);
}

export { pageIdFromPath, pathFor, paths, type Locale, type PageId };
export { pageIds, otherLocale, locales } from "./routes";
