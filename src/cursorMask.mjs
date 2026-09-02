export function computeMaskPosition(pointerEvent, rect) {
  const x = clamp(pointerEvent.clientX - rect.left, 0, rect.width);
  const y = clamp(pointerEvent.clientY - rect.top, 0, rect.height);

  return {
    x,
    y,
    xCss: `${Math.round(x)}px`,
    yCss: `${Math.round(y)}px`,
  };
}

export function computeLayeredMaskPosition(pointerEvent, maskRect) {
  return {
    mask: computeMaskPosition(pointerEvent, maskRect),
    cursor: {
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
      xCss: `${Math.round(pointerEvent.clientX)}px`,
      yCss: `${Math.round(pointerEvent.clientY)}px`,
    },
  };
}

export function computeTouchMaskUpdate(touchEvent, rect, revealSize = 220) {
  const touch = touchEvent.touches?.[0];
  if (!touch) return null;

  const position = computeMaskPosition(
    {
      clientX: touch.clientX,
      clientY: touch.clientY,
    },
    rect,
  );

  return {
    x: position.x,
    y: position.y,
    xCss: position.xCss,
    yCss: position.yCss,
    sizeCss: `${revealSize}px`,
  };
}

export function computeCenteredRevealMask(rect, scale = 1.5) {
  return {
    xCss: `${Math.round(rect.width / 2)}px`,
    yCss: `${Math.round(rect.height / 2)}px`,
    sizeCss: `${Math.round(Math.max(rect.width, rect.height) * scale)}px`,
  };
}

export function computePillVisibility(heroBottom, threshold = 100) {
  const isVisible = heroBottom >= threshold;

  return {
    isVisible,
    opacity: isVisible ? "1" : "0",
    pointerEvents: isVisible ? "auto" : "none",
  };
}

export function computeMobileParallax(scrollY, viewportHeight) {
  const clampedScroll = clamp(scrollY, 0, viewportHeight);
  const y = clampedScroll * 0.18;
  const opacity = clamp(1 - scrollY / (viewportHeight * 0.75), 0, 1);

  return {
    y,
    opacity,
    css: `translate3d(0, ${Math.round(y)}px, 0)`,
  };
}

export function computeTiltParallax(orientationEvent, maxOffset = 12) {
  const gamma = clamp(orientationEvent.gamma || 0, -30, 30);
  const beta = clamp((orientationEvent.beta || 0) - 45, -30, 30);
  const x = Math.round((gamma / 30) * maxOffset);
  const y = Math.round((beta / 30) * maxOffset);

  return {
    x,
    y,
    css: `translate3d(${x}px, ${y}px, 0)`,
  };
}

export function computeMaskBounds(viewport, inset) {
  return {
    left: inset.left,
    top: inset.top,
    width: Math.max(0, viewport.width - inset.left - inset.right),
    height: Math.max(0, viewport.height - inset.top - inset.bottom),
  };
}

export function interpolatePosition(current, target, ease) {
  return {
    x: current.x + (target.x - current.x) * ease,
    y: current.y + (target.y - current.y) * ease,
  };
}

export function computeMagneticTransform(pointerEvent, rect, strength = 0.28) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const x = Math.round((pointerEvent.clientX - centerX) * strength);
  const y = Math.round((pointerEvent.clientY - centerY) * strength);

  return {
    x,
    y,
    css: `translate3d(${x}px, ${y}px, 0)`,
  };
}

export function computeFloatingPreviewPosition(
  pointerEvent,
  viewport,
  previewSize,
  offset = 28,
) {
  const x = clamp(
    pointerEvent.clientX + offset,
    offset,
    viewport.width - previewSize.width - offset,
  );
  const y = clamp(
    pointerEvent.clientY + offset,
    offset,
    viewport.height - previewSize.height - offset,
  );

  return {
    x,
    y,
    css: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
  };
}

export function getMaskSizeForInteraction(state) {
  const sizes = {
    idle: 0,
    compressed: 42,
    expanded: 280,
  };

  return sizes[state] ?? sizes.idle;
}

export function isMaskExpansionTarget(target) {
  return Boolean(target?.closest?.("[data-mask-target]"));
}

export function getMaskSizeForTarget(isTarget, sizes = {}) {
  return isTarget
    ? (sizes.expanded ?? getMaskSizeForInteraction("expanded"))
    : (sizes.idle ?? getMaskSizeForInteraction("idle"));
}

export function getPreviewMotionConfig() {
  return {
    ease: 0.048,
    offset: 48,
    width: 360,
    height: 342,
    gap: 84,
  };
}

export function computePreviewTrackOffset(index, itemHeight, gap = 0) {
  const y = -Math.max(0, index) * (itemHeight + gap);

  return {
    y,
    css: `translate3d(0, ${Math.round(y)}px, 0)`,
  };
}

export function decidePreviewIndex(pointerY, itemRects, currentIndex = -1, hysteresis = 18) {
  const currentRect = itemRects[currentIndex];
  if (
    currentRect &&
    pointerY >= currentRect.top - hysteresis &&
    pointerY <= currentRect.bottom + hysteresis
  ) {
    return currentIndex;
  }

  return itemRects.findIndex((rect) => pointerY >= rect.top && pointerY <= rect.bottom);
}

export function createCursorMaskController(root, options = {}) {
  if (!root) {
    throw new Error("createCursorMaskController requires a root element");
  }

  const cursor =
    options.cursorElement ??
    root.querySelector("[data-mask-cursor]") ??
    root.ownerDocument?.querySelector("[data-mask-cursor]");
  const maskSurface = root.querySelector("[data-mask-surface]") || root;
  const expandedMaskSize =
    options.expandedMaskSize ?? getMaskSizeForInteraction("expanded");
  const idleMaskSize = options.idleMaskSize ?? getMaskSizeForInteraction("idle");
  const ease = options.ease ?? 0.18;
  let hasPointer = false;
  let animationFrame = 0;
  let current = { x: maskSurface.clientWidth / 2, y: maskSurface.clientHeight / 2 };
  let target = { ...current };
  let cursorCurrent = {
    x: root.ownerDocument?.defaultView?.innerWidth / 2 || 0,
    y: root.ownerDocument?.defaultView?.innerHeight / 2 || 0,
  };
  let cursorTarget = { ...cursorCurrent };

  const setMaskSize = (size) => {
    maskSurface.style.setProperty("--mask-size", `${size}px`);
  };

  const setTargetPosition = (event) => {
    const positions = computeLayeredMaskPosition(
      event,
      maskSurface.getBoundingClientRect(),
    );
    target = { x: positions.mask.x, y: positions.mask.y };
    cursorTarget = { x: positions.cursor.x, y: positions.cursor.y };
    startAnimation();
  };

  const renderPosition = () => {
    current = interpolatePosition(current, target, ease);
    cursorCurrent = interpolatePosition(cursorCurrent, cursorTarget, ease);
    const xCss = `${Math.round(current.x)}px`;
    const yCss = `${Math.round(current.y)}px`;
    const cursorXCss = `${Math.round(cursorCurrent.x)}px`;
    const cursorYCss = `${Math.round(cursorCurrent.y)}px`;

    maskSurface.style.setProperty("--mask-x", xCss);
    maskSurface.style.setProperty("--mask-y", yCss);

    if (cursor) {
      cursor.style.transform = `translate3d(${cursorXCss}, ${cursorYCss}, 0) translate(-50%, -50%)`;
    }

    const deltaX = Math.abs(current.x - target.x);
    const deltaY = Math.abs(current.y - target.y);
    const cursorDeltaX = Math.abs(cursorCurrent.x - cursorTarget.x);
    const cursorDeltaY = Math.abs(cursorCurrent.y - cursorTarget.y);
    if (hasPointer || deltaX > 0.5 || deltaY > 0.5 || cursorDeltaX > 0.5 || cursorDeltaY > 0.5) {
      animationFrame = requestAnimationFrame(renderPosition);
    } else {
      animationFrame = 0;
    }
  };

  const startAnimation = () => {
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(renderPosition);
    }
  };

  const handlePointerMove = (event) => {
    hasPointer = true;
    setTargetPosition(event);
    cursor?.classList.toggle("is-interactive", Boolean(event.target?.closest?.("a, button, [data-magnetic], .work-list a")));
    setMaskSize(
      getMaskSizeForTarget(isMaskExpansionTarget(event.target), {
        expanded: expandedMaskSize,
        idle: idleMaskSize,
      }),
    );
  };

  const handlePointerEnter = (event) => {
    handlePointerMove(event);
    root.dataset.maskActive = "true";
  };

  const handlePointerLeave = () => {
    hasPointer = false;
    setMaskSize(idleMaskSize);
    cursor?.classList.remove("is-interactive");
    root.dataset.maskActive = "false";
  };

  const targetWindow = root.ownerDocument?.defaultView ?? window;
  targetWindow.addEventListener("pointerenter", handlePointerEnter);
  targetWindow.addEventListener("pointermove", handlePointerMove);
  targetWindow.addEventListener("pointerleave", handlePointerLeave);
  setMaskSize(idleMaskSize);

  return {
    destroy() {
      targetWindow.removeEventListener("pointerenter", handlePointerEnter);
      targetWindow.removeEventListener("pointermove", handlePointerMove);
      targetWindow.removeEventListener("pointerleave", handlePointerLeave);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    },
  };
}

export function createMagneticButtonController(root = document) {
  const elements = [...root.querySelectorAll("[data-magnetic]")];

  const handleMove = (event) => {
    const element = event.currentTarget;
    const transform = computeMagneticTransform(
      event,
      element.getBoundingClientRect(),
      Number(element.dataset.magneticStrength || 0.28),
    );
    element.style.transform = transform.css;
  };

  const handleLeave = (event) => {
    event.currentTarget.style.transform = "translate3d(0px, 0px, 0)";
  };

  elements.forEach((element) => {
    element.addEventListener("pointermove", handleMove);
    element.addEventListener("pointerleave", handleLeave);
  });

  return {
    destroy() {
      elements.forEach((element) => {
        element.removeEventListener("pointermove", handleMove);
        element.removeEventListener("pointerleave", handleLeave);
      });
    },
  };
}

export function createWorkPreviewController(root = document, options = {}) {
  const preview = root.querySelector("[data-work-preview]");
  const track = root.querySelector("[data-work-preview-track]");
  const list = root.querySelector("[data-work-list]");
  const items = [...root.querySelectorAll("[data-preview-title]")];
  if (!preview || !track || !list || items.length === 0) return { destroy() {} };

  const defaultMotion = getPreviewMotionConfig();
  const offset = options.offset ?? defaultMotion.offset;
  const previewSize = options.previewSize ?? {
    width: defaultMotion.width,
    height: defaultMotion.height,
  };
  const previewGap = options.gap ?? defaultMotion.gap;
  const ease = options.ease ?? defaultMotion.ease;
  let animationFrame = 0;
  let current = { x: -999, y: -999 };
  let target = { ...current };
  let isActive = false;
  let activeIndex = -1;

  const updatePreview = (item, index) => {
    if (index === activeIndex) return;
    activeIndex = index;
    const offset = computePreviewTrackOffset(index, previewSize.height, previewGap);
    track.style.transform = offset.css;
    preview.dataset.variant = item.dataset.previewVariant || "default";
  };

  const movePreview = (event) => {
    const position = computeFloatingPreviewPosition(
      event,
      { width: window.innerWidth, height: window.innerHeight },
      previewSize,
      offset,
    );
    target = { x: position.x, y: position.y };

    if (current.x < 0 || current.y < 0) {
      current = { ...target };
      preview.style.transform = position.css;
    }

    startAnimation();
  };

  const renderPreview = () => {
    current = interpolatePosition(current, target, ease);
    preview.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`;

    const deltaX = Math.abs(current.x - target.x);
    const deltaY = Math.abs(current.y - target.y);
    if (isActive || deltaX > 0.5 || deltaY > 0.5) {
      animationFrame = requestAnimationFrame(renderPreview);
    } else {
      animationFrame = 0;
    }
  };

  const startAnimation = () => {
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(renderPreview);
    }
  };

  const handleMove = (event) => {
    const itemRects = items.map((item) => item.getBoundingClientRect());
    const nextIndex = decidePreviewIndex(
      event.clientY,
      itemRects,
      activeIndex,
      options.hysteresis ?? 18,
    );

    if (nextIndex >= 0) {
      updatePreview(items[nextIndex], nextIndex);
    }

    isActive = true;
    preview.dataset.active = "true";
    movePreview(event);
  };

  const handleLeave = () => {
    isActive = false;
    activeIndex = -1;
    preview.dataset.active = "false";
  };

  list.addEventListener("pointermove", handleMove);
  list.addEventListener("pointerleave", handleLeave);

  return {
    destroy() {
      list.removeEventListener("pointermove", handleMove);
      list.removeEventListener("pointerleave", handleLeave);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    },
  };
}

export function enableMobileTouchReveal(maskTarget, maskSurface, options = {}) {
  if (!maskTarget || !maskSurface) return { destroy() {} };

  const revealSize = options.revealSize ?? 220;

  const setMaskUpdate = (event) => {
    const update = computeTouchMaskUpdate(
      event,
      maskSurface.getBoundingClientRect(),
      revealSize,
    );
    if (!update) return;

    maskSurface.style.setProperty("--mask-x", update.xCss);
    maskSurface.style.setProperty("--mask-y", update.yCss);
    maskSurface.style.setProperty("--mask-size", update.sizeCss);
  };

  const collapseMask = () => {
    maskSurface.style.setProperty("--mask-size", "0px");
  };

  maskTarget.addEventListener("touchstart", setMaskUpdate, { passive: true });
  maskTarget.addEventListener("touchmove", setMaskUpdate, { passive: true });
  maskTarget.addEventListener("touchend", collapseMask, { passive: true });
  maskTarget.addEventListener("touchcancel", collapseMask, { passive: true });
  collapseMask();

  return {
    destroy() {
      maskTarget.removeEventListener("touchstart", setMaskUpdate);
      maskTarget.removeEventListener("touchmove", setMaskUpdate);
      maskTarget.removeEventListener("touchend", collapseMask);
      maskTarget.removeEventListener("touchcancel", collapseMask);
    },
  };
}

export function initMobileRevealPill(pillElement, maskSurface, options = {}) {
  if (!pillElement || !maskSurface) return { destroy() {} };

  const view = options.window ?? pillElement.ownerDocument?.defaultView ?? window;
  const root = options.root ?? pillElement.ownerDocument?.querySelector(".mask-stage");
  const label = pillElement.querySelector(".pill-label");
  const defaultLabel = label?.textContent ?? "Hold to reveal";
  const activeLabel = options.activeLabel ?? "Revealing...";
  const revealScale = options.revealScale ?? 1.5;

  const startReveal = () => {
    const mask = computeCenteredRevealMask(
      maskSurface.getBoundingClientRect(),
      revealScale,
    );

    pillElement.dataset.active = "true";
    if (label) label.textContent = activeLabel;
    maskSurface.style.setProperty("--mask-x", mask.xCss);
    maskSurface.style.setProperty("--mask-y", mask.yCss);
    maskSurface.style.setProperty("--mask-size", mask.sizeCss);
    view.navigator?.vibrate?.(15);
  };

  const endReveal = () => {
    pillElement.dataset.active = "false";
    if (label) label.textContent = defaultLabel;
    maskSurface.style.setProperty("--mask-size", "0px");
  };

  const updateVisibility = () => {
    const visibility = computePillVisibility(
      root?.getBoundingClientRect?.().bottom ?? 0,
      options.hideThreshold ?? 100,
    );
    pillElement.style.opacity = visibility.opacity;
    pillElement.style.pointerEvents = visibility.pointerEvents;
  };

  pillElement.addEventListener("pointerdown", startReveal);
  view.addEventListener("pointerup", endReveal);
  view.addEventListener("pointercancel", endReveal);
  view.addEventListener("scroll", updateVisibility, { passive: true });
  endReveal();
  updateVisibility();

  return {
    destroy() {
      pillElement.removeEventListener("pointerdown", startReveal);
      view.removeEventListener("pointerup", endReveal);
      view.removeEventListener("pointercancel", endReveal);
      view.removeEventListener("scroll", updateVisibility);
    },
  };
}

export function createMobileParallaxController(root = document, options = {}) {
  const view = root.defaultView ?? window;
  const heroStack = root.querySelector(".hero-stack");
  const maskStage = root.querySelector(".mask-stage");
  const maskFrame = root.querySelector(".hero-mask-frame");
  const workItems = [...root.querySelectorAll(".work-list a")];
  if (!heroStack && !maskStage && !maskFrame && workItems.length === 0) {
    return { destroy() {} };
  }

  let ticking = false;

  const renderScroll = () => {
    ticking = false;
    const parallax = computeMobileParallax(view.scrollY || 0, view.innerHeight || 1);

    if (heroStack) {
      heroStack.style.transform = parallax.css;
      heroStack.style.opacity = parallax.opacity.toFixed(3);
    }

    if (maskStage) {
      maskStage.style.backgroundPosition = `0 ${Math.round(parallax.y * -0.35)}px`;
    }

    workItems.forEach((item, index) => {
      const drift = Math.round((parallax.y * 0.08) * ((index % 2 === 0) ? 1 : -1));
      item.style.transform = `translate3d(0, ${drift}px, 0)`;
    });
  };

  const handleScroll = () => {
    if (!ticking) {
      ticking = true;
      view.requestAnimationFrame(renderScroll);
    }
  };

  const handleTilt = (event) => {
    if (!maskFrame) return;
    maskFrame.style.setProperty("--tilt-transform", computeTiltParallax(event).css);
  };

  view.addEventListener("scroll", handleScroll, { passive: true });

  if (
    view.DeviceOrientationEvent &&
    typeof view.DeviceOrientationEvent.requestPermission !== "function"
  ) {
    view.addEventListener("deviceorientation", handleTilt, { passive: true });
  }

  renderScroll();

  return {
    destroy() {
      view.removeEventListener("scroll", handleScroll);
      view.removeEventListener("deviceorientation", handleTilt);
    },
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
