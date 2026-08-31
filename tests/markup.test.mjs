import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function indexOfSnippet(snippet) {
  const index = html.indexOf(snippet);
  assert.notEqual(index, -1, `Expected markup to contain: ${snippet}`);
  return index;
}

function findMatchingSectionClose(startIndex) {
  const tokenPattern = /<\/?section\b[^>]*>/g;
  tokenPattern.lastIndex = startIndex;
  let depth = 0;

  for (const match of html.matchAll(tokenPattern)) {
    if (match.index < startIndex) {
      continue;
    }

    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return match.index + match[0].length;
      }
    } else {
      depth += 1;
    }
  }

  return -1;
}

test("hero reveal mask surface is contained inside hero base", () => {
  const baseStart = indexOfSnippet('<section class="hero hero-base" aria-label="Portfolio introduction">');
  const baseEnd = findMatchingSectionClose(baseStart);
  const revealStart = indexOfSnippet('<section class="hero hero-reveal" data-mask-surface aria-hidden="true">');
  const revealEnd = findMatchingSectionClose(revealStart);

  assert.ok(baseEnd > baseStart, "Expected hero base to have a matching closing section");
  assert.ok(revealEnd > revealStart, "Expected hero reveal to have a matching closing section");
  assert.ok(revealStart > baseStart, "Expected hero reveal to start inside hero base");
  assert.ok(revealEnd < baseEnd, "Expected hero reveal to end inside hero base");
});

test("shared hero chrome sits outside the base and reveal sections", () => {
  const baseStart = indexOfSnippet('<section class="hero hero-base" aria-label="Portfolio introduction">');
  const baseEnd = findMatchingSectionClose(baseStart);
  const revealStart = indexOfSnippet('<section class="hero hero-reveal" data-mask-surface aria-hidden="true">');
  const revealEnd = findMatchingSectionClose(revealStart);

  for (const snippet of [
    '<div class="hero-grid">',
    '<div class="perimeter perimeter-top" aria-hidden="true">',
    '<nav class="hero-actions" aria-label="Primary links">',
  ]) {
    const index = indexOfSnippet(snippet);
    assert.ok(index < baseStart || index > baseEnd, `${snippet} should not be inside hero base`);
    assert.ok(index < revealStart || index > revealEnd, `${snippet} should not be inside hero reveal`);
  }
});

function cssBlock(selector) {
  const match = css.match(new RegExp(`${selector.replaceAll(".", "\\.")}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Expected CSS block for ${selector}`);
  return match[1];
}

test("hero mask geometry is bounded to the intro block", () => {
  const heroBlock = cssBlock(".hero");
  const revealBlock = cssBlock(".hero-reveal");

  assert.doesNotMatch(heroBlock, /inset:\s*0\b/, "Base hero geometry should not cover the viewport");
  assert.match(revealBlock, /inset:\s*0\b/, "Reveal should fill the bounded hero base");
  assert.match(revealBlock, /transform:\s*none\b/, "Reveal should not inherit the base hero translation");
});
