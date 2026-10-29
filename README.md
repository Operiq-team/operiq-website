# Operiq – nettsted (utkast)

Norsk markedsnettsted for Operiq (Godtbo Eiendom AS). Statisk bygget med [Astro](https://astro.build) for Cloudflare Pages.

Dette er et utkast til godkjenning. Det er ikke publisert, og ingenting i repoet endrer DNS.

Merket er Plate 1.1. Topp og mørk bunntekst bruker `logo-white.svg` (symbol + navn). OPERIQ | SECURE er `wordmark-secure-*-sand.svg` der undermerket vises, uten et nytt Q-symbol. Favicon er bare symbolet. Space Grotesk (500–600), Inter og JetBrains Mono ligger som woff2 i `public/fonts/`. Siden henter ikke fonter fra Google.

## Referanse

Én Operiq-referanse står på forsiden og `/kameraovervaking`: Hegdehaugsveien 36. Kameraanlegg i næringsbygg, Oslo. Ferdigstilt 2026. Bildet er illustrasjonsfoto, ikke fra stedet.

Kirkeristen står for seg som prosjekterfaring. Kompleks næringseiendom i Oslo sentrum. 26 kameraer, ny fiberinfrastruktur og eget nettverk. Under installasjon, ferdig desember 2026.

Ikke legg til gateadresse, eierselskap, sitater, bilder fra stedet eller andre tall. Andre kundenavn skal ikke med.

## Fotokreditering

Bildene er fra Pexels (gratis, også kommersielt, kreditering ikke påkrevd). De kan beskjæres. De skal ikke brukes som om personer eller merker på bildet anbefaler Operiq. Disse er ikke brukt, fordi produsent- eller utstyrsmerker var synlige: `dome-innendors-tak`, `nettverk-switch`, `kameraer-konstruksjon` (Avigilon) og `dome-betongvegg-mork` (Dahua). Forsidens kveldsbilder er nattgraderte utsnitt av de samme motivene, uten lesbart kameramerke. Kirkeristen-kortet bruker et nøytralt kamera mot himmel, ikke et bilde fra stedet.

| Fil | Fotograf | Kilde |
| --- | --- | --- |
| hero-kamera-fasade | Giant Asparagus | https://www.pexels.com/photo/outdoor-surveillance-camera-on-building-wall-37591149/ |
| kamera-bygningshjorne | Giant Asparagus | https://www.pexels.com/photo/modern-security-cameras-on-urban-building-corner-37591159/ |
| naeringsbygg-fasade | Atlantic Ambience | https://www.pexels.com/photo/exterior-design-of-a-commercial-building-12955940/ |
| bygg-hjorne-lys | Adrien Olichon | https://www.pexels.com/photo/low-angle-shot-of-a-building-perspective-with-white-and-black-exterior-3137040/ |
| lager-interior | James Richardson | https://www.pexels.com/photo/spacious-industrial-warehouse-interior-with-storage-racks-36122954/ |
| butikk-hyller | Tembela Bohle | https://www.pexels.com/photo/black-gondola-shelf-1884579/ |
| plan-tegninger | Marina Zvada | https://www.pexels.com/photo/detailed-architectural-blueprints-on-desk-34573691/ |
| fiber-panel | Brett Sayles | https://www.pexels.com/photo/blue-patch-cables-plugged-on-patch-panel-4425157/ |
| skjerm-arbeidsbord | Tito Noverian Putra | https://www.pexels.com/photo/modern-computer-screens-and-keyboard-in-dark-room-1820328/ |

Prosessbildene på forsiden er de tre siste pluss næringsbyggfasaden. De er merket «Illustrasjon». De viser ikke et Operiq-anlegg, og ingen personer kan identifiseres. Et nærbilde av en stikkontakt og et skjermbilde av et prosjekttavle-verktøy ble ikke brukt, fordi de ville se ut som noe annet enn kameraanlegg.

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
| `/` | Forside. Kameraovervåking. |
| `/kameraovervaking` | Operiq Secure |
| `/butikk` | Butikk og kjeder |
| `/om-oss` | Selskap og kontaktopplysninger |
| `/kontakt` | Befaringsskjema |
| `/personvern` | Personvern for nettstedet |
| `/kamera-info` | Kort side for QR på kameraskilt |
| `/404` | Finnes ikke |

Kanonisk adresse er `https://operiq.no`. Norsk er standardspråk på de eksisterende adressene. Engelsk ligger under `/en` med tilsvarende sider, for eksempel `/en/commercial-buildings`. Bryteren NO / EN i toppen holder besøkende på den tilsvarende siden.

## Kontakt og telefon

E-post er `post@operiq.no`. Telefon er `+47 919 94 544`, satt i `site.phone` i `src/site.ts`. Nummeret vises i topp, mobilmeny, bunntekst, kontaktside, om oss, personvern og i strukturerte data. Lenken er `tel:+4791994544`.

Skjemaet er i modus `mailto` (`contactMode` i `src/site.ts`). Når noen sender det, åpnes e-postprogrammet med ferdig tekst til `post@operiq.no`. Feltene lagres ikke på nettstedet. Ingen API-nøkkel ligger i repoet. Serversending er ikke satt opp: funksjonen svarer med den samme mailto-lenken til `CONTACT_FORWARD_URL` er satt i Cloudflare.

## Måling

Det er ingen analyseverktøy, ingen tredjepartsskript og ingen informasjonskapsler. Klikk på knapper med `data-track`, telefon, e-post og innsending av skjemaet kaller `track(event, props)` i `src/lib/track.js`. Funksjonen gjør ingenting annet enn å sende et `CustomEvent` med navn `operiq:track` på `window`.

Når eier har godkjent et verktøy, kan ett skript lytte slik:

```js
window.addEventListener("operiq:track", (event) => {
  const { event: name, props } = event.detail;
  // Cloudflare Web Analytics: bruk beacon uten informasjonskapsler.
  // Plausible: plausible(name, { props });
});
```

Ikke last skriptet før det er godkjent, og ikke sett informasjonskapsler. Hendelsene som finnes nå, er `cta` (med `type`), `tel`, `mailto` og `form_submit`.

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

Et `pages.dev`-preview skal ikke indekseres. `public/_headers` sender `X-Robots-Tag: noindex, nofollow` for `https://:project.pages.dev/*` og `https://:version.:project.pages.dev/*`. Regelen treffer ikke `operiq.no`. `functions/_middleware.js` legger i tillegg inn robots-meta og samme header når HTML serveres fra en annen vert. På grener andre enn `main` får HTML også `<meta name="robots" content="noindex, nofollow">` i bygget. Produksjonsbygget på `main` beholder canonical, `robots.txt` og `sitemap.xml` for `https://operiq.no`. Node-versjonen står i `.node-version` (`22`).
