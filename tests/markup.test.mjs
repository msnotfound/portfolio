import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function indexOfSnippet(snippet) {
  const index = html.indexOf(snippet);
  assert.notEqual(index, -1, `Expected markup to contain: ${snippet}`);
  return index;
}

test("hero reveal contains the alternate cursor-mask copy outside hero base", () => {
  const baseStart = indexOfSnippet('<section class="hero hero-base" aria-label="Portfolio introduction">');
  const baseEnd = html.indexOf("</section>", baseStart);
  const revealStart = indexOfSnippet('<section class="hero hero-reveal" data-mask-surface aria-hidden="true">');
  const revealEnd = html.indexOf("</section>", revealStart);

  assert.ok(revealStart > baseEnd, "Expected hero reveal outside and after hero base");
  assert.match(
    html.slice(revealStart, revealEnd),
    /Under the surface[\s\S]*Not a template\.[\s\S]*A working proof[\s\S]*of taste and execution\./,
    "Expected hero reveal to contain alternate masked copy",
  );
});

test("shared hero content sits outside the base and reveal sections", () => {
  const baseStart = indexOfSnippet('<section class="hero hero-base" aria-label="Portfolio introduction">');
  const baseEnd = html.indexOf("</section>", baseStart);
  const revealStart = indexOfSnippet('<section class="hero hero-reveal" data-mask-surface aria-hidden="true">');
  const revealEnd = html.indexOf("</section>", revealStart);

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
