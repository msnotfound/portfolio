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

function findMatchingCloseTag(openIndex, tagName) {
  const tokenPattern = new RegExp(`</?${tagName}\\b[^>]*>`, "g");
  tokenPattern.lastIndex = openIndex;
  let depth = 0;

  for (const match of html.matchAll(tokenPattern)) {
    if (match.index < openIndex) continue;

    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return match.index + match[0].length;
    } else {
      depth += 1;
    }
  }

  return -1;
}

test("hero reveal copy is scoped inside the typography mask frame", () => {
  const baseStart = indexOfSnippet('<section class="hero hero-base" aria-label="Portfolio introduction">');
  const baseEnd = findMatchingCloseTag(baseStart, "section");
  const frameStart = indexOfSnippet('<div class="hero-mask-frame" data-mask-target>');
  const frameEnd = findMatchingCloseTag(frameStart, "div");
  const revealStart = indexOfSnippet('<div class="hero-reveal" data-mask-surface aria-hidden="true">');
  const revealEnd = findMatchingCloseTag(revealStart, "div");

  assert.ok(frameStart > baseStart && frameEnd < baseEnd, "Expected mask frame inside hero base");
  assert.ok(revealStart > frameStart && revealEnd < frameEnd, "Expected reveal inside mask frame");
  assert.match(
    html.slice(revealStart, revealEnd),
    /Under the surface[\s\S]*Not a template\.[\s\S]*A working proof[\s\S]*of taste and execution\./,
    "Expected hero reveal to contain alternate masked copy",
  );
});

test("shared hero content sits outside the base and reveal sections", () => {
  const baseStart = indexOfSnippet('<section class="hero hero-base" aria-label="Portfolio introduction">');
  const baseEnd = findMatchingCloseTag(baseStart, "section");
  const revealStart = indexOfSnippet('<div class="hero-reveal" data-mask-surface aria-hidden="true">');
  const revealEnd = findMatchingCloseTag(revealStart, "div");

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

test("reveal layer does not contain phantom magnetic button styling", () => {
  assert.doesNotMatch(css, /\.hero-reveal\s+\.magnetic-link/);
});
