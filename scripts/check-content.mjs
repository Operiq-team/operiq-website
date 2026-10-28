import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const forbidden = [
  /system\s*\.?\s*one/i,
  /kirkeristen/i,
  /fauna/i,
  /hegdehaug/i,
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
];

const requiredInSite = [
  "Operiq (Godtbo Eiendom AS) · org.nr 927 212 056",
  "post@operiq.no",
  "Bestill gratis befaring",
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
if (files.length < 8) {
  console.error(`Expected at least 8 HTML files, found ${files.length}`);
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

  const noindex = html.includes('content="noindex"');
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
  if (!html.includes("LocalBusiness")) fail(`${rel} is missing LocalBusiness JSON-LD`);
  if (/"address"\s*:/.test(html) || /streetAddress/.test(html)) {
    fail(`${rel} includes a street address in structured data`);
  }
}

const home = await readFile(path.join(dist, "index.html"), "utf8");
for (const snippet of requiredInSite) {
  if (!home.includes(snippet)) fail(`Home is missing ${snippet}`);
}
if (!home.includes("uten bindende abonnement")) fail("Home is missing the approved headline");

const secure = await readFile(path.join(dist, "kameraovervaking/index.html"), "utf8");
if (!secure.includes("AI-videoanalyse") || !secure.includes("Kommer")) {
  fail("Kamera page must mention AI video analysis only as coming");
}
if (!secure.includes("Reolink Professional")) fail("Kamera page is missing Reolink Professional");
if (!secure.includes("Kameraene har 3 års garanti. Garanti på øvrig utstyr følger produsent.")) {
  fail("Kamera page must limit the 3-year warranty to cameras");
}

const drift = await readFile(path.join(dist, "eiendomsdrift/index.html"), "utf8");
if (!drift.includes("husleieadministrasjon")) {
  fail("Eiendomsdrift page must exclude rent administration");
}
if (!drift.includes("konsulentoppdrag") || !drift.includes("innleid driftsansvarlig")) {
  fail("Eiendomsdrift page must describe consulting assignments");
}
if (drift.includes("kontraktsfestet ansvar for hele driften") && !drift.includes("ikke et kontraktsfestet ansvar")) {
  fail("Eiendomsdrift page must not claim full operating responsibility");
}
const about = await readFile(path.join(dist, "om-oss/index.html"), "utf8");
if (!about.includes("Sebastian Godtfredsen")) fail("About page is missing the founder");
if (!/Basert i Oslo, leverer i hele landet/.test(home) || !/Norway/.test(home)) {
  fail("Home must state nationwide delivery and Norway in structured data");
}

const privacy = await readFile(path.join(dist, "personvern/index.html"), "utf8");
if (!privacy.includes("behandlingsansvarlig")) fail("Privacy page is missing controller language");

const sign = await readFile(path.join(dist, "kamera-info/index.html"), "utf8");
if (!sign.includes("ikke behandlingsansvarlig") && !sign.includes("Operiq er leverandør")) {
  fail("Sign page must say Operiq is the supplier, not the controller");
}

const robots = await readFile(path.join(dist, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://operiq.no/sitemap.xml")) fail("robots.txt is missing the sitemap");

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
for (const route of ["https://operiq.no/", "https://operiq.no/kameraovervaking", "https://operiq.no/eiendomsdrift", "https://operiq.no/om-oss", "https://operiq.no/kontakt", "https://operiq.no/personvern", "https://operiq.no/kamera-info"]) {
  if (!sitemap.includes(route)) fail(`Sitemap is missing ${route}`);
}
if (sitemap.includes("404")) fail("Sitemap includes the 404 page");

const notFound = files.find((file) => file.endsWith(`${path.sep}404.html`));
if (!notFound) fail("404.html was not built");
else {
  const html = await readFile(notFound, "utf8");
  if (!html.includes('content="noindex"')) fail("404 is missing noindex");
}

if (failures) {
  console.error(`${failures} content check(s) failed`);
  process.exit(1);
}

console.log(`Content check passed (${files.length} HTML files).`);
