# Operiq – nettsted (utkast)

Norsk markedsnettsted for Operiq (Godtbo Eiendom AS). Statisk bygget med [Astro](https://astro.build) for Cloudflare Pages.

Dette er et utkast til godkjenning. Det er ikke publisert, og ingenting i repoet endrer DNS.

Merket er Plate. Lys topp bruker `logo-black.svg`, mørk bunntekst bruker `logo-white.svg`. Låsen for en linje er `BrandLockup`. Space Grotesk og Inter ligger som woff2 i `public/fonts/`. Siden henter ikke fonter fra Google.

## Fotokreditering

Bildene er fra Pexels (gratis, også kommersielt, kreditering ikke påkrevd). De kan beskjæres. De skal ikke brukes som om personer eller merker på bildet anbefaler Operiq. To bilder i den opprinnelige pakken er ikke brukt, fordi produsent- eller utstyrsmerker var synlige (`dome-innendors-tak`, `nettverk-switch`).

| Fil | Fotograf | Kilde |
| --- | --- | --- |
| hero-kamera-fasade | Giant Asparagus | https://www.pexels.com/photo/outdoor-surveillance-camera-on-building-wall-37591149/ |
| kamera-bygningshjorne | Giant Asparagus | https://www.pexels.com/photo/modern-security-cameras-on-urban-building-corner-37591159/ |
| dome-betongvegg-mork | Thomas VEILLON | https://www.pexels.com/photo/outdoor-security-camera-on-concrete-wall-29866272/ |
| kameraer-konstruksjon | Giant Asparagus | https://www.pexels.com/photo/modern-surveillance-cameras-on-urban-structure-38999359/ |
| naeringsbygg-fasade | Atlantic Ambience | https://www.pexels.com/photo/exterior-design-of-a-commercial-building-12955940/ |
| bygg-hjorne-lys | Adrien Olichon | https://www.pexels.com/photo/low-angle-shot-of-a-building-perspective-with-white-and-black-exterior-3137040/ |
| lager-interior | James Richardson | https://www.pexels.com/photo/spacious-industrial-warehouse-interior-with-storage-racks-36122954/ |
| butikk-hyller | Tembela Bohle | https://www.pexels.com/photo/black-gondola-shelf-1884579/ |

Åpne punkter eier må bekrefte, står som `TODO(eier)` i kildekoden. Søk etter den teksten før siden tas i bruk.

## Lokal kjøring

Krever Node.js 22 eller nyere.

```bash
npm install
npm run dev
```

Produksjonsbygg og lokal forhåndsvisning:

```bash
npm run build
npm run preview
```

`npm test` sjekker kontaktskjemaet. `npm run check` sjekker den bygde HTML-en mot innholdskravene (kjøres etter `npm run build`).

## Sider

| Sti | Innhold |
| --- | --- |
| `/` | Forside. Kameraovervåking først, eiendomsdrift deretter. |
| `/kameraovervaking` | Operiq Secure |
| `/eiendomsdrift` | Teknisk drift |
| `/om-oss` | Selskap og kontaktopplysninger |
| `/kontakt` | Befaringsskjema |
| `/personvern` | Personvern for nettstedet |
| `/kamera-info` | Kort side for QR på kameraskilt |
| `/404` | Finnes ikke |

Kanonisk adresse er `https://operiq.no`. Engelsk versjon er ikke med.

## Kontakt og telefon

E-post er `post@operiq.no`.

Salgstelefon er ikke satt. Den ligger ett sted:

```ts
// src/site.ts
phone: ""
```

Tom streng skjuler nummeret i topp, bunntekst, kontaktside og strukturerte data. Legg inn nummeret som en streng når det er godkjent.

Skjemaet er i modus `mailto` (`contactMode` i `src/site.ts`). Når noen sender det, åpnes e-postprogrammet med ferdig tekst til `post@operiq.no`. Feltene lagres ikke på nettstedet. Ingen API-nøkkel ligger i repoet.

`functions/api/contact.js` er en Cloudflare Pages Function. Uten konfigurasjon svarer den med den samme e-postlenken (for besøk uten JavaScript). Serversending skrus på slik:

1. I Cloudflare: sett `CONTACT_FORWARD_URL` til en `https`-adresse du kontrollerer.
2. Valgfritt: `CONTACT_FORWARD_TOKEN` sendes som Bearer. Verdien settes bare i Cloudflare, ikke i git.
3. Bytt `contactMode` til `"server"` i `src/site.ts` og bygg på nytt. Ellers åpner skjemaet e-postprogrammet og bruker ikke funksjonen.

## Cloudflare Pages

Ikke koble produksjonsdomenet før utkastet er godkjent. Et preview-prosjekt på `pages.dev` er nok til gjennomgang.

| Innstilling | Verdi |
| --- | --- |
| Framework | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node | 22 (`NODE_VERSION=22`) |
| Root directory | `/` |

Functions-mappen følger med av seg selv. Ingen miljøvariabler er påkrevd for at siden og mailto-skjemaet skal virke.

### DNS og e-post – ikke rør dette

Microsoft 365 for `operiq.no` ligger i DNS. Denne siden endrer ingen DNS-poster. Når domenet senere skal peke til Pages, er det bare web-postene som byttes. Ikke endre:

- `MX 0 operiq-no.mail.protection.outlook.com`
- `TXT` med SPF som inkluderer `spf.protection.outlook.com`
- `TXT MS=ms36359195`
- `autodiscover`
- `selector1._domainkey` og `selector2._domainkey`
- `_dmarc`

Sjekk postene i Cloudflare før noen endring. Registrar blir værende hos One.com.

Viderekoblinger som hører hjemme i Cloudflare senere, ikke i dette repoet: `http` til `https`, `www` til apex, og `operiq.info` til `https://operiq.no`. SSL-modus «Full (strict)» når origin har gyldig sertifikat.

Et `pages.dev`-preview bør ikke indekseres. Produksjonsbygget er satt opp for `https://operiq.no` med canonical, `robots.txt` og `sitemap.xml`.
