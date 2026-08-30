import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeFloatingPreviewPosition,
  computeMagneticTransform,
  computeMaskBounds,
  computeMaskPosition,
  computePreviewTrackOffset,
  decidePreviewIndex,
  getMaskSizeForInteraction,
  getPreviewMotionConfig,
  interpolatePosition,
} from "../src/cursorMask.mjs";

test("computeMaskPosition returns cursor coordinates relative to an element", () => {
  const rect = {
    left: 120,
    top: 40,
    width: 900,
    height: 600,
  };

  const position = computeMaskPosition(
    {
      clientX: 420,
      clientY: 190,
    },
    rect,
  );

  assert.deepEqual(position, {
    x: 300,
    y: 150,
    xCss: "300px",
    yCss: "150px",
  });
});

test("computeMaskPosition clamps the cursor to the element bounds", () => {
  const rect = {
    left: 100,
    top: 100,
    width: 400,
    height: 300,
  };

  assert.deepEqual(computeMaskPosition({ clientX: 40, clientY: 999 }, rect), {
    x: 0,
    y: 300,
    xCss: "0px",
    yCss: "300px",
  });
});

test("computeMaskBounds constrains reveal area away from fixed chrome", () => {
  assert.deepEqual(
    computeMaskBounds(
      { width: 1280, height: 720 },
      { top: 86, right: 32, bottom: 150, left: 64 },
    ),
    {
      left: 64,
      top: 86,
      width: 1184,
      height: 484,
    },
  );
});

test("interpolatePosition eases coordinates toward a target", () => {
  assert.deepEqual(
    interpolatePosition(
      { x: 100, y: 50 },
      { x: 200, y: 250 },
      0.25,
    ),
    { x: 125, y: 100 },
  );
});

test("computeMagneticTransform moves an element toward the cursor from its center", () => {
  const transform = computeMagneticTransform(
    { clientX: 170, clientY: 130 },
    { left: 100, top: 100, width: 100, height: 60 },
    0.35,
  );

  assert.deepEqual(transform, {
    x: 7,
    y: 0,
    css: "translate3d(7px, 0px, 0)",
  });
});

test("computeFloatingPreviewPosition offsets and clamps preview inside viewport", () => {
  const preview = computeFloatingPreviewPosition(
    { clientX: 1160, clientY: 650 },
    { width: 1280, height: 720 },
    { width: 280, height: 180 },
    28,
  );

  assert.deepEqual(preview, {
    x: 972,
    y: 512,
    css: "translate3d(972px, 512px, 0)",
  });
});

test("getMaskSizeForInteraction keeps the reveal away from adjacent controls", () => {
  assert.equal(getMaskSizeForInteraction("expanded"), 280);
  assert.equal(getMaskSizeForInteraction("idle"), 0);
});

test("getPreviewMotionConfig uses a sticky delayed cursor-follow motion", () => {
  assert.deepEqual(getPreviewMotionConfig(), {
    ease: 0.048,
    offset: 48,
    width: 360,
    height: 342,
    gap: 84,
  });
});

test("computePreviewTrackOffset scrolls the preview track by item height plus gap", () => {
  assert.deepEqual(computePreviewTrackOffset(2, 342, 84), {
    y: -852,
    css: "translate3d(0, -852px, 0)",
  });
});

test("decidePreviewIndex keeps the current item inside the boundary hysteresis zone", () => {
  const rows = [
    { top: 100, bottom: 220 },
    { top: 220, bottom: 340 },
  ];

  assert.equal(decidePreviewIndex(224, rows, 0, 18), 0);
  assert.equal(decidePreviewIndex(216, rows, 1, 18), 1);
});

test("decidePreviewIndex switches only after cursor clearly crosses the boundary", () => {
  const rows = [
    { top: 100, bottom: 220 },
    { top: 220, bottom: 340 },
  ];

  assert.equal(decidePreviewIndex(244, rows, 0, 18), 1);
  assert.equal(decidePreviewIndex(196, rows, 1, 18), 0);
});
