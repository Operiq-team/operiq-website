import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/i18n/en.ts";
import { no } from "../src/i18n/no.ts";
import { pageIds, paths } from "../src/i18n/routes.ts";
import { formCopy } from "../src/i18n/form-copy.js";

function keys(value, prefix = "") {
  if (Array.isArray(value)) return value.map((_, i) => keys(value[i], `${prefix}[${i}]`)).flat();
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .flatMap((key) => keys(value[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

test("Norwegian and English dictionaries have the same keys", () => {
  assert.deepEqual(keys(en), keys(no));
});

test("every page has a Norwegian path and an English path", () => {
  for (const id of pageIds) {
    assert.ok(paths[id].nb.startsWith("/"));
    assert.ok(paths[id].en.startsWith("/en"));
    assert.notEqual(paths[id].nb, paths[id].en);
  }
});

test("form runtime copy matches the dictionary subjects and errors", () => {
  assert.equal(formCopy.nb.subject, no.form.subject);
  assert.equal(formCopy.en.subject, en.form.subject);
  assert.equal(formCopy.nb.errRequired, no.form.errRequired);
  assert.equal(formCopy.en.errRequired, en.form.errRequired);
  assert.equal(formCopy.en.mailtoIntro, en.form.mailtoIntro);
});
