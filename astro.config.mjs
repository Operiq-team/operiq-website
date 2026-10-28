import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://operiq.no",
  trailingSlash: "never",
  compressHTML: true,
  build: {
    format: "directory",
  },
});
