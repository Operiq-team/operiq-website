/**
 * Site-wide facts. Phone is intentionally empty until the owner approves a number.
 *
 * TODO(eier): Salgstelefon er ikke avklart. Sett `phone` til nummeret som skal
 * publiseres, for eksempel "+47 00 00 00 00". Tom streng skjuler telefon i
 * topp, bunn, kontaktside og strukturerte data.
 *
 * Merket er Plate 1.1. Header og bunntekst bruker logo-secure-white-sand.svg.
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
    "Operiq prosjekterer og monterer kameraovervåkning for næringsbygg. Du eier anlegget. Opptak lagres lokalt. Basert i Oslo, leverer i hele landet.",
  /**
   * TODO(eier): La contactMode stå som "mailto" til utsending er satt opp.
   * Bytt til "server" først når CONTACT_FORWARD_URL er satt i Cloudflare,
   * ellers åpner skjemaet e-postprogrammet i stedet for å poste til funksjonen.
   */
  contactMode: "mailto" as "mailto" | "server",
};

export const legalLine = `${site.name} (${site.legalName}) · org.nr ${site.orgNr}`;

export const nav = [
  { href: "/naeringsbygg", label: "Næringsbygg" },
  { href: "/lager-og-logistikk", label: "Lager" },
  { href: "/eiendomsportefoljer", label: "Portefølje" },
  { href: "/#referanse", label: "Referanser" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export const pages = [
  { path: "/" },
  { path: "/kameraovervaking" },
  { path: "/naeringsbygg" },
  { path: "/lager-og-logistikk" },
  { path: "/eiendomsportefoljer" },
  { path: "/eksisterende-kameraanlegg" },
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
  const orgId = `${site.url}/#organization`;
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": orgId,
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
    organization.telephone = site.phone;
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "Service",
        name: "Kameraovervåkning for næringsbygg",
        serviceType: "Kameraovervåkning",
        provider: { "@id": orgId },
        areaServed: {
          "@type": "Country",
          name: "Norway",
        },
        description: site.description,
      },
    ],
  };
}
