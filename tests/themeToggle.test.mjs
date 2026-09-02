import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getNextTheme,
  getStoredTheme,
  resolveInitialTheme,
  storeTheme,
} from "../src/themeToggle.mjs";

test("resolveInitialTheme prefers a valid stored theme", () => {
  assert.equal(resolveInitialTheme("light", true), "light");
  assert.equal(resolveInitialTheme("dark", false), "dark");
});

test("resolveInitialTheme falls back to system preference", () => {
  assert.equal(resolveInitialTheme(null, true), "dark");
  assert.equal(resolveInitialTheme(null, false), "light");
  assert.equal(resolveInitialTheme("solarized", true), "dark");
});

test("getNextTheme toggles between light and dark", () => {
  assert.equal(getNextTheme("dark"), "light");
  assert.equal(getNextTheme("light"), "dark");
  assert.equal(getNextTheme("unexpected"), "dark");
});

test("stored theme helpers ignore storage failures", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };

  storeTheme(storage, "light");
  assert.equal(getStoredTheme(storage), "light");

  const brokenStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };

  assert.equal(getStoredTheme(brokenStorage), null);
  assert.doesNotThrow(() => storeTheme(brokenStorage, "dark"));
});
