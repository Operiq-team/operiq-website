import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("assets/photos");
const out = path.resolve("public/media");

/** width / height */
const jobs = [
  { name: "hero", file: "hero-kamera-fasade-pexels-37591149.jpg", ratio: 4 / 3 },
  { name: "corner", file: "kamera-bygningshjorne-pexels-37591159.jpg", ratio: 4 / 3 },
  { name: "dome", file: "dome-betongvegg-mork-pexels-29866272.jpg", ratio: 4 / 3 },
  { name: "band", file: "hero-kamera-fasade-pexels-37591149.jpg", ratio: 21 / 9, position: "attention" },
  { name: "facade", file: "naeringsbygg-fasade-pexels-12955940.jpg", ratio: 4 / 3 },
  { name: "building", file: "bygg-hjorne-lys-pexels-3137040.jpg", ratio: 4 / 3 },
  { name: "warehouse", file: "lager-interior-pexels-36122954.jpg", ratio: 4 / 3 },
  { name: "shop", file: "butikk-hyller-pexels-1884579.jpg", ratio: 4 / 3 },
];

const widths = [640, 1024, 1600, 2400];

async function render(pipeline, file) {
  await pipeline.clone().avif({ quality: 48 }).toFile(file.replace(/\.jpg$/, ".avif"));
  await pipeline.clone().webp({ quality: 62 }).toFile(file.replace(/\.jpg$/, ".webp"));
  await pipeline.clone().jpeg({ quality: 68, mozjpeg: true }).toFile(file);
}

for (const job of jobs) {
  const dir = path.join(out, job.name);
  await mkdir(dir, { recursive: true });
  const source = path.join(root, job.file);
  const meta = await sharp(source).metadata();
  const max = meta.width ?? 2400;
  for (const width of widths) {
    if (width > max + 40) continue;
    const height = Math.round(width / job.ratio);
    const pipeline = sharp(source)
      .rotate()
      .modulate({ saturation: 0.85 })
      .linear(1.05, -8)
      .resize(width, height, { fit: "cover", position: job.position ?? "centre" });
    const base = path.join(dir, `${job.name}-${width}.jpg`);
    await render(pipeline, base);
    const stat = await sharp(base).metadata();
    console.log(`${job.name}-${width} ${stat.width}x${stat.height}`);
  }
}

const nights = [
  ["facade-night", "a-facade-night.jpg", 2200],
  ["building-night", "b-building-night.jpg", 1600],
  ["warehouse-night", "warehouse.jpg", 1400],
  ["retail-night", "retail.jpg", 1400],
  ["fiber-night", "fiber.jpg", 1600],
  ["cam-arm", "cam-arm.jpg", 1600],
];
const imgOut = path.resolve("public/img");
await mkdir(imgOut, { recursive: true });
for (const [name, file, width] of nights) {
  const pipeline = sharp(path.join(root, file)).rotate().resize({ width, withoutEnlargement: true });
  await pipeline.clone().jpeg({ quality: 72, mozjpeg: true }).toFile(path.join(imgOut, `${name}.jpg`));
  await pipeline.clone().webp({ quality: 68 }).toFile(path.join(imgOut, `${name}.webp`));
  console.log(name);
}

const og = sharp(path.join(root, "a-facade-night.jpg"))
  .rotate()
  .resize(1200, 630, { fit: "cover", position: "centre" });
await og.jpeg({ quality: 70, mozjpeg: true }).toFile(path.resolve("public/og.jpg"));
console.log("og.jpg");
