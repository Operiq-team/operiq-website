import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isPagesPreviewBuild, withPreviewRobotsHeader } from "../src/lib/preview-robots.js";

const file = path.resolve("dist/_headers");

if (!isPagesPreviewBuild()) {
  const text = await readFile(file, "utf8");
  if (/X-Robots-Tag:\s*noindex/i.test(text)) {
    console.error("dist/_headers sends noindex on an indexable build. Remove it from public/_headers.");
    process.exit(1);
  }
  console.log("Indexable build: dist/_headers does not send noindex.");
  process.exit(0);
}

const text = await readFile(file, "utf8");
await writeFile(file, withPreviewRobotsHeader(text));
console.log("Preview build: dist/_headers now sends X-Robots-Tag: noindex, nofollow.");
