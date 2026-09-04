import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const cursorMaskSource = readFileSync(new URL("../src/cursorMask.mjs", import.meta.url), "utf8");

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

test("hero reveal surface has bleed room so the spotlight stays circular near text edges", () => {
  const frameBlock = cssBlock(".hero-mask-frame");
  const revealBlock = cssBlock(".hero-reveal");

  assert.match(frameBlock, /overflow:\s*visible/);
  assert.match(revealBlock, /inset:\s*-150px -200px/);
  assert.match(revealBlock, /padding:\s*150px 200px/);
  assert.match(revealBlock, /overflow:\s*visible/);
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

test("work preview window has a restrained rounded corner treatment", () => {
  assert.match(cssBlock(".work-preview"), /border-radius:\s*8px/);
});

test("teleprompter text scrubbing is wired to all below-hero text targets", () => {
  assert.match(html, /createTeleprompterScrollController/);
  assert.match(html, /createTeleprompterScrollController\(document\);/);
  assert.doesNotMatch(html, /<p data-teleprompter>\s*Agentic automation/);
  assert.doesNotMatch(html, /<p data-teleprompter>\s*Available for focused freelance/);
  assert.match(html, /<div class="section-label" data-teleprompter>Selected work<\/div>/);
  assert.match(html, /<h2 id="work-title" data-teleprompter>/);
  assert.equal([...html.matchAll(/data-preview-title="[^"]+"[\s\S]*?data-teleprompter/g)].length, 0);
  assert.doesNotMatch(css, /\.work-list a\[data-teleprompter\]/);
});

test("teleprompter CSS uses discrete word states with reduced-motion fallback", () => {
  const teleprompterMatch = css.match(/\[data-teleprompter\]\s*\{([^}]*)\}/);
  assert.ok(teleprompterMatch, "Expected CSS block for [data-teleprompter]");
  const teleprompterBlock = teleprompterMatch[1];

  assert.match(teleprompterBlock, /--teleprompter-progress:\s*0/);
  assert.match(teleprompterBlock, /color:\s*color-mix\(in srgb,\s*var\(--text\) 28%, transparent\)/);
  assert.match(css, /\.teleprompter-word\s*\{[\s\S]*?color:\s*color-mix\(in srgb,\s*var\(--text\) 24%, transparent\)/);
  assert.match(css, /\.teleprompter-word\.is-lit\s*\{[\s\S]*?color:\s*var\(--text\)/);
  assert.doesNotMatch(teleprompterBlock, /-webkit-text-fill-color:\s*transparent/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\[data-teleprompter\],[\s\S]*?\.teleprompter-word\s*\{[\s\S]*?color:\s*var\(--text\) !important;/,
  );
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
  assert.match(cssBlock(".theme-toggle"), /top:\s*76px/);
  assert.match(cssBlock(".theme-toggle"), /border-radius:\s*999px/);
  assert.match(html, /<svg class="theme-icon theme-icon--sun" viewBox="0 0 24 24" aria-hidden="true">/);
  assert.match(html, /<svg class="theme-icon theme-icon--moon" viewBox="0 0 24 24" aria-hidden="true">/);
  assert.match(cssBlock(".theme-icon"), /stroke:\s*currentColor/);
  assert.doesNotMatch(cssBlock(".theme-toggle__sun"), /linear-gradient/);
  assert.match(css, /--theme-toggle-accent:\s*#d1ff48/);
  assert.match(css, /--theme-toggle-glow:\s*rgba\(209,\s*255,\s*72,\s*0\.5\)/);
  assert.match(css, /--theme-toggle-accent:\s*#0033ff/);
  assert.match(css, /--theme-toggle-glow:\s*rgba\(0,\s*51,\s*255,\s*0\.42\)/);
  assert.match(cssBlock(".theme-toggle"), /inset 0 0 0 2px color-mix\(in srgb,\s*var\(--theme-toggle-accent\) 24%, transparent\)/);
  assert.match(cssBlock(".theme-toggle"), /0 0 18px color-mix\(in srgb,\s*var\(--theme-toggle-glow\) 48%, transparent\)/);
  assert.match(css, /\.theme-toggle__moon\s*\{[\s\S]*?box-shadow:\s*0 0 16px var\(--theme-toggle-glow\)/);
  assert.match(
    css,
    /\[data-theme="light"\]\s+\.theme-toggle__sun\s*\{[\s\S]*?box-shadow:\s*0 0 16px var\(--theme-toggle-glow\)/,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.theme-toggle\s*\{[\s\S]*?top:\s*76px/,
    "Expected mobile theme toggle to keep the same gap below the top perimeter",
  );
});

test("mobile uses touch reveal instead of forcing the alternate hero layer open", () => {
  const bodyStart = indexOfSnippet("<body>");
  const mainStart = indexOfSnippet('<main class="mask-stage" data-mask-root>');
  const topVignette = indexOfSnippet('<div class="screen-vignette screen-vignette-top" aria-hidden="true"></div>');
  const bottomVignette = indexOfSnippet('<div class="screen-vignette screen-vignette-bottom" aria-hidden="true"></div>');

  assert.ok(topVignette > bodyStart && topVignette < mainStart, "Expected top vignette at body level");
  assert.ok(bottomVignette > bodyStart && bottomVignette < mainStart, "Expected bottom vignette at body level");
  assert.doesNotMatch(
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
  assert.match(html, />Press and hold here \/ Press and hold here \/</);
  assert.match(html, /<span class="pill-indicator" aria-hidden="true">/);
  assert.match(html, /<svg class="pill-hand-icon" viewBox="0 0 24 24" aria-hidden="true">/);
  assert.match(html, /holdDelay:\s*380/);
  assert.match(html, /collapseDelay:\s*140/);
  assert.match(css, /@media\s*\(max-width:\s*760px\),\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\.mobile-reveal-pill\s*\{/);
  assert.match(css, /bottom:\s*28px/);
  assert.match(css, /width:\s*92px/);
  assert.match(css, /height:\s*92px/);
  assert.match(css, /animation:\s*pill-orbit-spin/);
  assert.match(css, /\.mobile-reveal-pill\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /\.mobile-reveal-pill\s*\{[\s\S]*?pointer-events:\s*auto/);
});

test("radial flood layer expands from the mobile pill origin", () => {
  assert.match(cssBlock(".stage-reveal-flood"), /clip-path:\s*circle\(var\(--flood-radius,\s*0px\) at var\(--pill-x,\s*50vw\) var\(--pill-y,\s*90vh\)\)/);
  assert.match(cssBlock(".stage-reveal-flood"), /transition:\s*clip-path 820ms cubic-bezier\(0\.19,\s*1,\s*0\.22,\s*1\)/);
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

test("mobile touch viewports lock the headline hover reveal closed", () => {
  const mobileMediaStart = css.indexOf("@media (max-width: 760px), (pointer: coarse)");
  const reducedMotionStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.notEqual(mobileMediaStart, -1, "Expected mobile/coarse media block");
  assert.notEqual(reducedMotionStart, -1, "Expected reduced motion media block");
  const mobileMedia = css.slice(mobileMediaStart, reducedMotionStart);

  assert.match(
    mobileMedia,
    /\.hero-reveal\s*\{[\s\S]*?clip-path:\s*circle\(0px at 50% 50%\) !important;[\s\S]*?pointer-events:\s*none/,
  );
  assert.match(mobileMedia, /\.hero-reveal\s*\{[\s\S]*?inset:\s*0/);
  assert.match(mobileMedia, /\.hero-reveal\s*\{[\s\S]*?padding:\s*0/);
  assert.match(mobileMedia, /\.hero-reveal\s*\{[\s\S]*?overflow:\s*hidden/);
});

test("mobile work rows keep an even static rhythm", () => {
  const mobileMediaStart = css.indexOf("@media (max-width: 760px)");
  const coarseMediaStart = css.indexOf("@media (max-width: 760px), (pointer: coarse)");
  assert.notEqual(mobileMediaStart, -1, "Expected mobile media block");
  assert.notEqual(coarseMediaStart, -1, "Expected coarse pointer media block");
  const mobileMedia = css.slice(mobileMediaStart, coarseMediaStart);

  assert.match(mobileMedia, /\.work-list a\s*\{[\s\S]*?grid-template-columns:\s*44px minmax\(0,\s*1fr\)/);
  assert.match(mobileMedia, /\.work-list a\s*\{[\s\S]*?grid-template-rows:\s*auto auto/);
  assert.match(mobileMedia, /\.work-list a\s*\{[\s\S]*?align-items:\s*center/);
  assert.match(mobileMedia, /\.work-list a\s*\{[\s\S]*?min-height:\s*148px/);
  assert.match(mobileMedia, /\.work-list a\s*\{[\s\S]*?padding-block:\s*24px/);
  assert.doesNotMatch(mobileMedia, /\.work-list a\s*\{[\s\S]*?will-change:\s*transform/);
  assert.match(mobileMedia, /\.work-list a > span\s*\{[\s\S]*?grid-row:\s*1 \/ span 2/);
  assert.match(mobileMedia, /\.work-list small\s*\{[\s\S]*?margin-top:\s*10px/);
});

test("radial reveal trigger does not auto-hide on scroll", () => {
  const radialStart = cursorMaskSource.indexOf("export function initMobileRadialFlood");
  const teleprompterStart = cursorMaskSource.indexOf("export function createTeleprompterScrollController");
  assert.notEqual(radialStart, -1, "Expected radial flood controller");
  assert.notEqual(teleprompterStart, -1, "Expected teleprompter controller after radial flood controller");
  const radialController = cursorMaskSource.slice(radialStart, teleprompterStart);

  assert.doesNotMatch(radialController, /scroll/);
  assert.doesNotMatch(radialController, /computePillVisibility/);
  assert.doesNotMatch(radialController, /pointerEvents\s*=\s*visibility\.pointerEvents/);
});

test("mobile parallax does not transform project list rows", () => {
  const parallaxStart = cursorMaskSource.indexOf("export function createMobileParallaxController");
  const clampStart = cursorMaskSource.indexOf("function clamp");
  assert.notEqual(parallaxStart, -1, "Expected mobile parallax controller");
  assert.notEqual(clampStart, -1, "Expected clamp helper after mobile parallax controller");
  const parallaxController = cursorMaskSource.slice(parallaxStart, clampStart);

  assert.doesNotMatch(parallaxController, /querySelectorAll\("\.work-list a"\)/);
  assert.doesNotMatch(parallaxController, /workItems/);
  assert.doesNotMatch(parallaxController, /item\.style\.transform/);
});

test("top perimeter name stays pinned above viewport overlays", () => {
  const bodyStart = indexOfSnippet("<body>");
  const mainStart = indexOfSnippet('<main class="mask-stage" data-mask-root>');
  const topPerimeterStart = indexOfSnippet('<div class="perimeter perimeter-top" aria-hidden="true">');

  assert.ok(topPerimeterStart > bodyStart && topPerimeterStart < mainStart, "Expected top perimeter outside isolated hero stage");
  assert.match(cssBlock(".perimeter"), /position:\s*fixed/);
  assert.match(cssBlock(".perimeter"), /z-index:\s*120/);
  assert.match(cssBlock(".perimeter"), /color:\s*var\(--text\)/);
  assert.match(cssBlock(".perimeter"), /text-shadow:\s*0 0 18px var\(--background\)/);
  assert.match(cssBlock(".perimeter-top"), /top:\s*24px/);
  assert.match(cssBlock(".perimeter-top"), /padding:\s*10px 12px 14px/);
  assert.match(cssBlock(".perimeter-top"), /background:\s*color-mix\(in srgb,\s*var\(--background\) 78%, transparent\)/);
  assert.match(cssBlock(".perimeter-top"), /backdrop-filter:\s*blur\(14px\)/);
});
