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

function cssBlock(selector) {
  const escaped = selector.replaceAll(".", "\\.");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Expected CSS block for ${selector}`);
  return match[1];
}

test("hero content is grouped in one non-overlapping flow stack", () => {
  const stackStart = indexOfSnippet('<div class="hero-stack">');
  const stackEnd = findMatchingCloseTag(stackStart, "div");

  for (const snippet of [
    '<section class="hero hero-base" aria-label="Portfolio introduction">',
    '<div class="hero-grid">',
    '<nav class="hero-actions" aria-label="Primary links">',
  ]) {
    const index = indexOfSnippet(snippet);
    assert.ok(index > stackStart && index < stackEnd, `${snippet} should be inside hero stack`);
  }

  for (const selector of [".hero", ".hero-grid", ".hero-actions"]) {
    assert.doesNotMatch(cssBlock(selector), /position:\s*absolute\b/, `${selector} should flow naturally`);
  }
});

test("hero typography and cursor are calibrated for the first viewport", () => {
  assert.match(cssBlock("h1,\\s*h2"), /font-size:\s*clamp\(3\.2rem,\s*7\.2vw,\s*8\.5rem\)/);
  assert.doesNotMatch(cssBlock(".hero-mask-frame"), /overflow:\s*hidden\b/);
  assert.match(cssBlock(".cursor-orbit"), /width:\s*8px/);
  assert.match(cssBlock(".cursor-orbit"), /height:\s*8px/);
  assert.match(cssBlock(".cursor-orbit"), /opacity:\s*1/);
});

test("cursor follower is global and fixed above all page sections", () => {
  const mainStart = indexOfSnippet('<main class="mask-stage" data-mask-root>');
  const mainEnd = findMatchingCloseTag(mainStart, "main");
  const cursorStart = indexOfSnippet('<div class="cursor-orbit" data-mask-cursor aria-hidden="true"></div>');
  const cursorBlock = cssBlock(".cursor-orbit");

  assert.ok(cursorStart > mainEnd, "Expected cursor follower outside the hero main stage");
  assert.match(cursorBlock, /position:\s*fixed/);
  assert.match(cursorBlock, /z-index:\s*9999/);
  assert.match(cursorBlock, /will-change:\s*transform/);
  assert.match(cssBlock(".cursor-orbit.is-interactive"), /width:\s*16px/);
  assert.match(
    css,
    /html,\s*body,\s*a,\s*button,\s*\[data-magnetic\]\s*\{[^}]*cursor:\s*none !important;/,
    "Expected native cursor hidden globally over document and interactive elements",
  );
});

test("magnetic buttons use a subtle polished radius", () => {
  assert.match(cssBlock(".magnetic-link"), /border-radius:\s*6px/);
});

test("page exposes a persistent theme toggle", () => {
  assert.match(html, /<html lang="en" data-theme="dark">/);
  assert.match(
    html,
    /<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to light theme" aria-pressed="true">/,
  );
  assert.match(html, /import \{ initThemeToggle \} from "\.\/src\/themeToggle\.mjs";/);
  assert.match(html, /initThemeToggle\(document\);/);
  assert.match(css, /\[data-theme="light"\]\s*\{/);
  assert.match(cssBlock(".theme-toggle"), /border-radius:\s*999px/);
});
