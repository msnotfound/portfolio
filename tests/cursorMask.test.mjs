import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeFloatingPreviewPosition,
  computeLayeredMaskPosition,
  computeMagneticTransform,
  computeMaskBounds,
  computeCenteredRevealMask,
  computeMaskPosition,
  computeMobileParallax,
  computePillVisibility,
  computeRadialFloodOrigin,
  computePreviewTrackOffset,
  computeTeleprompterProgress,
  computeTeleprompterWordStates,
  computeTiltParallax,
  computeTouchMaskUpdate,
  decidePreviewIndex,
  getMaskSizeForInteraction,
  getMaskSizeForTarget,
  getPreviewMotionConfig,
  shouldTriggerHoldReveal,
  interpolatePosition,
  isMaskExpansionTarget,
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

test("computeLayeredMaskPosition separates clipped mask coords from stage cursor coords", () => {
  const positions = computeLayeredMaskPosition(
    { clientX: 640, clientY: 520 },
    { left: 120, top: 180, width: 900, height: 420 },
  );

  assert.deepEqual(positions, {
    mask: {
      x: 520,
      y: 340,
      xCss: "520px",
      yCss: "340px",
    },
    cursor: {
      x: 640,
      y: 520,
      xCss: "640px",
      yCss: "520px",
    },
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

test("isMaskExpansionTarget only matches explicit hero typography targets", () => {
  assert.equal(
    isMaskExpansionTarget({
      closest(selector) {
        return selector === "[data-mask-target]" ? {} : null;
      },
    }),
    true,
  );

  assert.equal(
    isMaskExpansionTarget({
      closest(selector) {
        return selector === "[data-magnetic]" ? {} : null;
      },
    }),
    false,
  );

  assert.equal(isMaskExpansionTarget(null), false);
});

test("getMaskSizeForTarget expands only over the hero mask target", () => {
  assert.equal(getMaskSizeForTarget(true), 280);
  assert.equal(getMaskSizeForTarget(false), 0);
  assert.equal(getMaskSizeForTarget(true, { expanded: 320, idle: 16 }), 320);
  assert.equal(getMaskSizeForTarget(false, { expanded: 320, idle: 16 }), 16);
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

test("computeTeleprompterProgress maps element position through the viewport reveal band", () => {
  assert.equal(computeTeleprompterProgress(704, 800), 0);
  assert.equal(computeTeleprompterProgress(304, 800), 1);
  assert.equal(computeTeleprompterProgress(504, 800), 0.5);
  assert.equal(computeTeleprompterProgress(504, 800, { triggerStart: 0.9, triggerEnd: 0.4 }), 0.54);
});

test("computeTeleprompterWordStates lights words by progress thresholds", () => {
  assert.deepEqual(computeTeleprompterWordStates(0, 5), [false, false, false, false, false]);
  assert.deepEqual(computeTeleprompterWordStates(0.01, 5), [true, false, false, false, false]);
  assert.deepEqual(computeTeleprompterWordStates(0.4, 5), [true, true, false, false, false]);
  assert.deepEqual(computeTeleprompterWordStates(0.99, 5), [true, true, true, true, true]);
  assert.deepEqual(computeTeleprompterWordStates(1, 5), [true, true, true, true, true]);
  assert.deepEqual(computeTeleprompterWordStates(0.5, 0), []);
});

test("computeTouchMaskUpdate positions a mobile reveal under the active touch", () => {
  const update = computeTouchMaskUpdate(
    {
      touches: [{ clientX: 420, clientY: 260 }],
    },
    { left: 120, top: 80, width: 600, height: 420 },
    220,
  );

  assert.deepEqual(update, {
    x: 300,
    y: 180,
    xCss: "300px",
    yCss: "180px",
    sizeCss: "220px",
  });
});

test("computeTouchMaskUpdate returns null without an active touch", () => {
  assert.equal(
    computeTouchMaskUpdate({ touches: [] }, { left: 0, top: 0, width: 100, height: 100 }),
    null,
  );
});

test("computeCenteredRevealMask expands from the center of the mask surface", () => {
  assert.deepEqual(computeCenteredRevealMask({ width: 320, height: 180 }, 1.5), {
    xCss: "160px",
    yCss: "90px",
    sizeCss: "480px",
  });
});

test("computePillVisibility hides the pill after the hero leaves the thumb zone", () => {
  assert.deepEqual(computePillVisibility(160), {
    isVisible: true,
    opacity: "1",
    pointerEvents: "auto",
  });

  assert.deepEqual(computePillVisibility(80), {
    isVisible: false,
    opacity: "0",
    pointerEvents: "none",
  });
});

test("computeRadialFloodOrigin uses the pill center relative to the flood layer", () => {
  assert.deepEqual(
    computeRadialFloodOrigin(
      { left: 140, top: 720, width: 96, height: 96 },
      { left: 0, top: 0 },
    ),
    {
      x: 188,
      y: 768,
      xCss: "188px",
      yCss: "768px",
    },
  );
});

test("shouldTriggerHoldReveal requires the configured premium press duration", () => {
  assert.equal(shouldTriggerHoldReveal(260, 380), false);
  assert.equal(shouldTriggerHoldReveal(380, 380), true);
  assert.equal(shouldTriggerHoldReveal(460, 380), true);
});

test("computeMobileParallax creates a subtle hero drift and fade", () => {
  assert.deepEqual(computeMobileParallax(200, 800), {
    y: 36,
    opacity: 0.6666666666666667,
    css: "translate3d(0, 36px, 0)",
  });
});

test("computeMobileParallax clamps after the first viewport", () => {
  assert.deepEqual(computeMobileParallax(900, 800), {
    y: 144,
    opacity: 0,
    css: "translate3d(0, 144px, 0)",
  });
});

test("computeTiltParallax converts phone tilt into small offsets", () => {
  assert.deepEqual(computeTiltParallax({ gamma: 15, beta: 60 }, 12), {
    x: 6,
    y: 6,
    css: "translate3d(6px, 6px, 0)",
  });

  assert.deepEqual(computeTiltParallax({ gamma: 90, beta: -40 }, 12), {
    x: 12,
    y: -12,
    css: "translate3d(12px, -12px, 0)",
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
