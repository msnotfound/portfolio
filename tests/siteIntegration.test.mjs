import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage exposes beta hierarchy navigation without replacing the current landing page", () => {
  assert.match(html, /<nav class="site-nav" aria-label="Site sections">/);
  assert.match(html, /href="\.\/index\.html"[^>]*>About<\/a>/);
  assert.match(html, /href="\.\/feed\/index\.html"[^>]*>Feed<\/a>/);
  assert.match(html, /href="\.\/notebook\/index\.html"[^>]*>Notebook<\/a>/);
  assert.match(html, /href="\.\/dives\/index\.html"[^>]*>Work<\/a>/);
  assert.match(html, /href="\.\/contact\/index\.html"[^>]*>Contact<\/a>/);
  assert.match(html, /I build AI systems/);
  assert.match(css, /\.site-nav\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /\.site-nav\s*\{[\s\S]*?right:\s*24px/);
  assert.match(css, /\.site-nav\s*\{[\s\S]*?flex-direction:\s*column/);
});

test("beta page hierarchy is available at the root site paths", () => {
  for (const path of [
    "feed/index.html",
    "feed/prototypes.html",
    "notebook/index.html",
    "notebook/obsession.html",
    "dives/index.html",
    "dives/problem.html",
    "contact/index.html",
  ]) {
    assert.ok(existsSync(new URL(path, root)), `Expected ${path} to exist`);
  }
});

test("copied beta pages retain their original section identities and hierarchy links", () => {
  assert.match(readProjectFile("feed/index.html"), /IMPULSE \/\/ Unfiltered Timeline/);
  assert.match(readProjectFile("feed/prototypes.html"), /QUICK PROTOTYPES/);
  assert.match(readProjectFile("notebook/index.html"), /The Lab<br>Notebook/);
  assert.match(readProjectFile("notebook/obsession.html"), /Building a Sentient Toaster/);
  assert.match(readProjectFile("dives/index.html"), /Rewriting the <span class="text-primary glitch-hover inline-block">DOM<\/span> in WebGL/);
  assert.match(readProjectFile("dives/problem.html"), /Post-Mortem/);
  assert.match(readProjectFile("contact/index.html"), /WHAT'S THE PROBLEM/);
});

test("component pages rely on their own navigation instead of the homepage right rail", () => {
  for (const path of [
    "feed/index.html",
    "feed/prototypes.html",
    "notebook/index.html",
    "notebook/obsession.html",
    "dives/index.html",
    "dives/problem.html",
    "contact/index.html",
  ]) {
    const file = readProjectFile(path);
    assert.doesNotMatch(file, /nav-component\.js/, `${path} should not inject the shared beta nav`);
    assert.doesNotMatch(file, /class="site-nav"/, `${path} should not render the homepage nav`);
  }
});
