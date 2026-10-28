/**
 * Site-wide facts. Phone is intentionally empty until the owner approves a number.
 *
 * TODO(eier): Salgstelefon er ikke avklart. Sett `phone` til nummeret som skal
 * publiseres, for eksempel "+47 00 00 00 00". Tom streng skjuler telefon i
 * topp, bunn, kontaktside og strukturerte data.
 *
 * Merket er Plate (konsept 3), valgt av eier. Filer ligger i public/brand/.
 * Mørk flate bruker logo-white.svg og logo-secure-white-accent.svg.
 *
 * TODO(eier): Skal «MVA» stå ved org.nr? Det er utelatt til du bekrefter.
 */
export const site = {
  name: "Operiq",
  legalName: "Godtbo Eiendom AS",
  orgNr: "927 212 056",
  email: "post@operiq.no",
  phone: "",
  city: "Oslo",
  url: "https://operiq.no",
  locale: "nb_NO",
  /** Basert i Oslo. Leveranse kan skje i hele Norge. Ingen gateadresse. */
  coverage: "Basert i Oslo, leverer i hele landet",
  description:
    "Operiq Secure prosjekterer og monterer IP-kameraanlegg for næringsbygg og butikk. Basert i Oslo, leverer i hele landet.",
  /**
   * TODO(eier): La contactMode stå som "mailto" til utsending er satt opp.
   * Bytt til "server" først når CONTACT_FORWARD_URL er satt i Cloudflare,
   * ellers åpner skjemaet e-postprogrammet i stedet for å poste til funksjonen.
   */
  contactMode: "mailto" as "mailto" | "server",
};

export const legalLine = `${site.name} (${site.legalName}) · org.nr ${site.orgNr}`;

export const nav = [
  { href: "/kameraovervaking", label: "Kameraovervåking" },
  { href: "/butikk", label: "Butikk og kjeder" },
  { href: "/om-oss", label: "Om oss" },
] as const;

export const pages = [
  { path: "/" },
  { path: "/kameraovervaking" },
  { path: "/butikk" },
  { path: "/om-oss" },
  { path: "/kontakt" },
  { path: "/personvern" },
  { path: "/kamera-info" },
] as const;

export function canonicalUrl(path: string): string {
  return new URL(path || "/", site.url).href;
}

export function organizationJsonLd(): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: site.name,
    legalName: site.legalName,
    url: site.url + "/",
    email: site.email,
    logo: new URL("/brand/logo-white.svg", site.url).href,
    image: new URL("/og.jpg", site.url).href,
    description: site.description,
    areaServed: {
      "@type": "Country",
      name: "Norway",
    },
    identifier: {
      "@type": "PropertyValue",
      name: "Organisasjonsnummer",
      value: site.orgNr,
    },
  };

  if (site.phone) {
    data.telephone = site.phone;
  }

  return data;
}
