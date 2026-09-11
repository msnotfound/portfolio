import assert from "node:assert/strict";
import test from "node:test";
import { computeFadeVolume, resolveSoundPreference } from "../src/ambientAudio.mjs";

test("ambient audio defaults on unless the stored preference is off", () => {
  assert.equal(resolveSoundPreference(null), true);
  assert.equal(resolveSoundPreference(undefined), true);
  assert.equal(resolveSoundPreference("on"), true);
  assert.equal(resolveSoundPreference("off"), false);
});

test("ambient audio fade volume eases from silence to target volume", () => {
  assert.equal(computeFadeVolume(0, 700, 0.42), 0);
  assert.equal(computeFadeVolume(350, 700, 0.42), 0.21);
  assert.equal(computeFadeVolume(900, 700, 0.42), 0.42);
});
