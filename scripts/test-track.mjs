import assert from "node:assert/strict";
import test from "node:test";
import { track } from "../src/lib/track.js";

test("track is a no-op outside the browser", () => {
  assert.equal(track("cta", { type: "nytt" }), undefined);
});

test("track dispatches operiq:track and stores nothing", () => {
  const heard = [];
  globalThis.window = {
    dispatchEvent(event) {
      heard.push(event);
      return true;
    },
  };
  track("form_submit", { type: "eksisterende" });
  assert.equal(heard.length, 1);
  assert.equal(heard[0].type, "operiq:track");
  assert.deepEqual(heard[0].detail, {
    event: "form_submit",
    props: { type: "eksisterende" },
  });
  delete globalThis.window;
});
