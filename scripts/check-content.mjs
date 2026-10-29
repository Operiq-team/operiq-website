import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const forbidden = [
  /system\s*\.?\s*one/i,
  /fauna/i,
  /strandveien/i,
  /caspar/i,
  /9199/,
  /karl\s*johan/i,
  /operiq\s+as\b/i,
  /powered by ai/i,
  /testimonial/i,
  /sertifisert/i,
  /års erfaring/i,
  /\d[\d\s]*\s*(kr|nok)\b/i,
  /href="tel:/i,
  /\b(reolink|verkada|hikvision|dahua|uniview|hanwha|rhombus|avigilon|mobotix)\b/i,
  /\baxis\b/i,
  /gratis befaring/i,
  /kostnadsfritt/i,
];

const referenceFacts = [
  "Referanse",
  "Kirkeristen, Oslo sentrum",
  "Illustrasjonsfoto",
  "Hegdehaugsveien 36",
  "Kameraanlegg i næringsbygg, Oslo",
  "Ferdigstilt",
  "Prosjekterfaring",
  "26 kameraer, ny fiberinfrastruktur og eget nettverk",
  "Under installasjon, ferdig desember 2026",
];

const requiredInSite = [
  "Operiq (Godtbo Eiendom AS) · org.nr 927 212 056",
  "post@operiq.no",
  "Få vurdert dagens kameraanlegg",
  'lang="nb"',
];

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

const files = await htmlFiles(dist);
if (files.length < 12) {
  console.error(`Expected at least 12 HTML files, found ${files.length}`);
  process.exit(1);
}

const titles = new Map();
let failures = 0;

function fail(message) {
  console.error(message);
  failures += 1;
}

for (const file of files) {
  const html = await readFile(file, "utf8");
  const rel = path.relative(dist, file);

  for (const pattern of forbidden) {
    if (pattern.test(html)) fail(`${rel} matches ${pattern}`);
  }

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  if (!title) fail(`${rel} is missing a title`);
  if (titles.has(title)) fail(`Duplicate title "${title}" in ${rel} and ${titles.get(title)}`);
  titles.set(title, rel);

  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  if (description.length < 40) fail(`${rel} has a short or missing meta description`);

  const noindex = /<meta\b[^>]*\bname="robots"[^>]*\bcontent="[^"]*\bnoindex\b/i.test(html);
  if (!noindex && !html.includes('<link rel="canonical" href="https://operiq.no')) {
    fail(`${rel} is missing a canonical URL`);
  }
  if (!html.includes('property="og:title"') || !html.includes('property="og:image"')) {
    fail(`${rel} is missing Open Graph tags`);
  }
  if (!html.includes('lang="nb"')) fail(`${rel} is missing lang="nb"`);
  if (!html.includes("Operiq (Godtbo Eiendom AS) · org.nr 927 212 056")) {
    fail(`${rel} is missing the legal footer line`);
  }
  if (!html.includes("Organization") || !html.includes("Service")) {
    fail(`${rel} is missing Organization or Service JSON-LD`);
  }
  if (html.includes("LocalBusiness") || html.includes("AggregateRating") || html.includes("Review")) {
    fail(`${rel} has ratings or a local-business type in structured data`);
  }
  if (/"address"\s*:/.test(html) || /streetAddress/.test(html)) {
    fail(`${rel} includes a street address in structured data`);
  }
}

const home = await readFile(path.join(dist, "index.html"), "utf8");
for (const snippet of requiredInSite) {
  if (!home.includes(snippet)) fail(`Home is missing ${snippet}`);
}
if (!home.includes("Intelligent overvåkning")) fail("Home is missing the headline");
if (!home.includes("Ditt anlegg. Dine opptak. Full kontroll.")) fail("Home is missing the ownership heading");
if (!home.includes("Betaler du mer enn nødvendig for kameraovervåkning?")) fail("Home is missing the existing-system section");
if (!home.includes("Fra passiv overvåkning til aktiv avskrekking.")) fail("Home is missing the deterrence heading");
if (!home.includes("Konsept – under utvikling")) fail("Home must label undeveloped deterrence as a concept");
if (!home.includes("Én leverandør. Fra behovsanalyse til ferdig anlegg.")) fail("Home is missing the process heading");
if (!home.includes("Én standard. Hele eiendomsporteføljen.")) fail("Home is missing the portfolio heading");
if (!home.includes("Konseptuell illustrasjon. Ikke en programvareplattform.")) {
  fail("Home must label the portfolio graphic as an illustration");
}
if (!home.includes("3 års garanti på kameraer")) fail("Home must limit the camera warranty");
if (!home.includes("En teknisk installasjon gjør ikke overvåkningen lovlig i seg selv.")) {
  fail("Home must say installation does not make surveillance lawful");
}
if (!home.includes("Individuell GDPR-tilpasning")) fail("Home is missing the GDPR service point");
if (!home.includes("Installasjon etter Nkom-regelverket, utført av registrert installatør")) {
  fail("Home is missing the Nkom wording");
}
if (/sertifisert/i.test(home)) fail("Home must not say certified");
if (/underleverand/i.test(home)) fail("Home must not mention subcontractors");
if (home.includes("Agent vurderer")) fail("Home still shows an agent deciding events");
if (!home.includes("Illustrasjon av systemgrensesnitt")) fail("Home is missing the console caption");
if (home.includes("/eiendomsdrift") || home.includes("Eiendomsdrift")) {
  fail("Home still promotes property operations");
}
if (!/leverer i hele landet/i.test(home)) fail("Home is missing nationwide delivery");
if (home.includes("Montører i hele landet") || home.includes("Egne montører")) {
  fail("Home implies Operiq employs the installers");
}
if (!home.includes("aktiv avskrekking")) fail("Home is missing the deterrence section");
if (!home.includes("er ikke i leveransen i dag")) {
  fail("Home must keep advanced deterrence out of today's delivery");
}
if (home.includes("ingen prisliste") || home.includes("AI-videoanalyse")) {
  fail("Home still has defensive copy that should be gone");
}
if (home.includes("ingen referanse") || home.includes("vi oppgir ikke")) {
  fail("Home still says there are no references");
}

const secure = await readFile(path.join(dist, "kameraovervaking/index.html"), "utf8");
if (secure.includes("AI-videoanalyse") || secure.includes("ingen prisliste")) {
  fail("Kamera page still has defensive copy that should be gone");
}
if (secure.includes("ingen referanse") || secure.includes("vi oppgir ikke")) {
  fail("Kamera page still says there are no references");
}
if (!secure.includes("IP-kameraer")) fail("Kamera page is missing IP cameras");
if (!secure.includes("Be om løsningsforslag")) fail("Kamera page is missing the inquiry button");
if (!secure.includes("PoE")) fail("Kamera page is missing PoE");
if (!secure.includes("Porter åpnes ikke mot internett som utgangspunkt.")) {
  fail("Kamera page is missing the closed-network principle");
}
if (!secure.includes("Kameraene har 3 års garanti. Garanti på øvrig utstyr følger produsent.")) {
  fail("Kamera page must limit the 3-year warranty to cameras");
}

for (const [name, html] of [
  ["Home", home],
  ["Kamera page", secure],
]) {
  for (const fact of referenceFacts) {
    if (!html.includes(fact)) fail(`${name} is missing reference fact: ${fact}`);
  }
  const hegde = html.match(/id="ref-hegdehaugsveien"[\s\S]*?<\/article>/)?.[0] ?? "";
  const text = hegde.replace(/<[^>]+>/g, " ").replaceAll("36", "").replaceAll("2026", "");
  if (/\d/.test(text)) fail(`${name} puts a number other than the address or 2026 on Hegdehaugsveien`);
  const kirk = html.match(/id="ref-kirkeristen"[\s\S]*?<\/section>/)?.[0] ?? "";
  if (/Ferdigstilt|Operiq-kunde|Sebastian Godtfredsen/.test(kirk)) {
    fail(`${name} presents Kirkeristen as a finished customer job or names the founder on the card`);
  }
}

const butikk = await readFile(path.join(dist, "butikk/index.html"), "utf8");
const about = await readFile(path.join(dist, "om-oss/index.html"), "utf8");
const signEarly = await readFile(path.join(dist, "kamera-info/index.html"), "utf8");
for (const [name, html] of [
  ["Butikk", butikk],
  ["About", about],
  ["Sign", signEarly],
]) {
  if (/kirkeristen|hegdehaug/i.test(html)) fail(`${name} names a reference outside the approved pages`);
}

if (!about.includes("Sebastian Godtfredsen")) fail("About page is missing the founder");
if (!/Basert i Oslo, leverer i hele landet/.test(home) || !/Norway/.test(home)) {
  fail("Home must state nationwide delivery and Norway in structured data");
}

const contact = await readFile(path.join(dist, "kontakt/index.html"), "utf8");
if (!contact.includes("Få vurdert dagens kameraanlegg")) fail("Contact page is missing the inquiry heading");

const privacy = await readFile(path.join(dist, "personvern/index.html"), "utf8");
if (!privacy.includes("behandlingsansvarlig")) fail("Privacy page is missing controller language");

const sign = await readFile(path.join(dist, "kamera-info/index.html"), "utf8");
if (!sign.includes("ikke behandlingsansvarlig") && !sign.includes("Operiq er leverandør")) {
  fail("Sign page must say Operiq is the supplier, not the controller");
}

const robots = await readFile(path.join(dist, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://operiq.no/sitemap.xml")) fail("robots.txt is missing the sitemap");

const headers = await readFile(path.join(dist, "_headers"), "utf8");
for (const rule of ["https://:project.pages.dev/*", "https://:version.:project.pages.dev/*"]) {
  if (!headers.includes(rule)) fail(`dist/_headers is missing ${rule}`);
}
if (!headers.includes("X-Robots-Tag: noindex, nofollow")) {
  fail("dist/_headers is missing X-Robots-Tag: noindex, nofollow");
}
const catchAllAt = headers.indexOf("/*\n");
const catchAllRest = catchAllAt < 0 ? "" : headers.slice(catchAllAt + 3);
const catchAllEnd = catchAllRest.search(/\n(?:\/|https:)/);
const catchAll = catchAllEnd < 0 ? catchAllRest : catchAllRest.slice(0, catchAllEnd);
if (/X-Robots-Tag:\s*noindex/i.test(catchAll)) {
  fail("The /* header block must not send noindex");
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
for (const route of ["https://operiq.no/", "https://operiq.no/kameraovervaking", "https://operiq.no/naeringsbygg", "https://operiq.no/lager-og-logistikk", "https://operiq.no/eiendomsportefoljer", "https://operiq.no/eksisterende-kameraanlegg", "https://operiq.no/butikk", "https://operiq.no/om-oss", "https://operiq.no/kontakt", "https://operiq.no/personvern", "https://operiq.no/kamera-info"]) {
  if (!sitemap.includes(route)) fail(`Sitemap is missing ${route}`);
}
if (sitemap.includes("eiendomsdrift")) fail("Sitemap still lists eiendomsdrift");
if (sitemap.includes("404")) fail("Sitemap includes the 404 page");

const notFound = files.find((file) => file.endsWith(`${path.sep}404.html`));
if (!notFound) fail("404.html was not built");
else {
  const html = await readFile(notFound, "utf8");
  if (!/<meta\b[^>]*\bname="robots"[^>]*\bcontent="[^"]*\bnoindex\b/i.test(html)) {
    fail("404 is missing noindex");
  }
}

if (failures) {
  console.error(`${failures} content check(s) failed`);
  process.exit(1);
}

console.log(`Content check passed (${files.length} HTML files).`);
