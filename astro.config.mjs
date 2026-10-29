import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://operiq.no",
  i18n: {
    defaultLocale: "nb",
    locales: ["nb", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  trailingSlash: "always",
  compressHTML: true,
  build: {
    format: "directory",
  },
});
