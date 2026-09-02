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

test("mobile uses touch reveal instead of forcing the alternate hero layer open", () => {
  const bodyStart = indexOfSnippet("<body>");
  const mainStart = indexOfSnippet('<main class="mask-stage" data-mask-root>');
  const topVignette = indexOfSnippet('<div class="screen-vignette screen-vignette-top" aria-hidden="true"></div>');
  const bottomVignette = indexOfSnippet('<div class="screen-vignette screen-vignette-bottom" aria-hidden="true"></div>');

  assert.ok(topVignette > bodyStart && topVignette < mainStart, "Expected top vignette at body level");
  assert.ok(bottomVignette > bodyStart && bottomVignette < mainStart, "Expected bottom vignette at body level");
  assert.match(
    html,
    /enableMobileTouchReveal\(root\.querySelector\("\[data-mask-target\]"\), root\.querySelector\("\[data-mask-surface\]"\),/,
  );
  assert.match(
    html,
    /initMobileRadialFlood\(document\.querySelector\("\[data-mobile-trigger\]"\), root\.querySelector\("\[data-reveal-flood\]"\),/,
  );
  assert.match(html, /<div class="stage-reveal-flood" data-reveal-flood aria-hidden="true">/);
  assert.match(html, /createMobileParallaxController\(document\);/);
  assert.doesNotMatch(
    css,
    /@media\s*\([^)]*pointer:\s*coarse[^}]*\.hero-reveal[\s\S]*?circle\(100vmax/,
  );
  assert.doesNotMatch(
    html,
    /root\.style\.setProperty\("--mask-size",\s*"100vmax"\)/,
  );
  assert.match(cssBlock(".screen-vignette"), /position:\s*fixed/);
  assert.match(cssBlock(".mobile-reveal-pill"), /display:\s*none/);
});

test("mobile reveal pill floats at the bottom thumb zone on touch viewports", () => {
  const bodyStart = indexOfSnippet("<body>");
  const mainStart = indexOfSnippet('<main class="mask-stage" data-mask-root>');
  const pillStart = indexOfSnippet('<button class="mobile-reveal-pill" type="button" data-mobile-trigger aria-label="Hold to flood reveal">');

  assert.ok(pillStart > bodyStart && pillStart < mainStart, "Expected reveal pill directly under body before content");
  assert.match(html, /aria-label="Hold to flood reveal"/);
  assert.match(html, /<svg class="pill-orbit" viewBox="0 0 120 120" aria-hidden="true">/);
  assert.match(html, />Press Here \/ Press Here \/</);
  assert.match(html, /<span class="pill-indicator" aria-hidden="true">/);
  assert.match(css, /@media\s*\(max-width:\s*760px\),\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\.mobile-reveal-pill\s*\{/);
  assert.match(css, /bottom:\s*28px/);
  assert.match(css, /width:\s*92px/);
  assert.match(css, /height:\s*92px/);
  assert.match(css, /animation:\s*pill-orbit-spin/);
});

test("radial flood layer expands from the mobile pill origin", () => {
  assert.match(cssBlock(".stage-reveal-flood"), /clip-path:\s*circle\(var\(--flood-radius,\s*0px\) at var\(--pill-x,\s*50vw\) var\(--pill-y,\s*90vh\)\)/);
  assert.match(cssBlock(".stage-reveal-flood"), /transition:\s*clip-path 560ms cubic-bezier\(0\.19,\s*1,\s*0\.22,\s*1\)/);
  assert.match(css, /\.mobile-reveal-pill\[data-active="true"\]\s*\{[\s\S]*?box-shadow:\s*0 0 40px/);
});

test("mobile touch viewports hide the custom cursor follower", () => {
  const mobileMediaStart = css.indexOf("@media (max-width: 760px), (pointer: coarse)");
  const reducedMotionStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(mobileMediaStart, -1, "Expected mobile/coarse media block");
  assert.notEqual(reducedMotionStart, -1, "Expected reduced motion media block");
  const mobileMedia = css.slice(mobileMediaStart, reducedMotionStart);

  assert.match(mobileMedia, /\.cursor-orbit\s*\{[\s\S]*?display:\s*none/);
});
