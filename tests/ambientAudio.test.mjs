import assert from "node:assert/strict";
import test from "node:test";
import { resolveSoundPreference } from "../src/ambientAudio.mjs";

test("ambient audio defaults on unless the stored preference is off", () => {
  assert.equal(resolveSoundPreference(null), true);
  assert.equal(resolveSoundPreference(undefined), true);
  assert.equal(resolveSoundPreference("on"), true);
  assert.equal(resolveSoundPreference("off"), false);
});
