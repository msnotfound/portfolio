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

  const cursor = root.querySelector("[data-mask-cursor]");
  const maskSurface = root.querySelector("[data-mask-surface]") || root;
  const compressedMaskSize =
    options.compressedMaskSize ?? getMaskSizeForInteraction("compressed");
  const expandedMaskSize =
    options.expandedMaskSize ?? getMaskSizeForInteraction("expanded");
  const idleMaskSize = options.idleMaskSize ?? getMaskSizeForInteraction("idle");
  const ease = options.ease ?? 0.18;
  let isInside = false;
  let animationFrame = 0;
  let current = { x: maskSurface.clientWidth / 2, y: maskSurface.clientHeight / 2 };
  let target = { ...current };

  const setMaskSize = (size) => {
    maskSurface.style.setProperty("--mask-size", `${size}px`);
  };

  const setTargetPosition = (event) => {
    const position = computeMaskPosition(event, maskSurface.getBoundingClientRect());
    target = { x: position.x, y: position.y };
    startAnimation();
  };

  const renderPosition = () => {
    current = interpolatePosition(current, target, ease);
    const xCss = `${Math.round(current.x)}px`;
    const yCss = `${Math.round(current.y)}px`;

    maskSurface.style.setProperty("--mask-x", xCss);
    maskSurface.style.setProperty("--mask-y", yCss);

    if (cursor) {
      cursor.style.transform = `translate3d(${xCss}, ${yCss}, 0) translate(-50%, -50%)`;
    }

    const deltaX = Math.abs(current.x - target.x);
    const deltaY = Math.abs(current.y - target.y);
    if (isInside || deltaX > 0.5 || deltaY > 0.5) {
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
    if (!isInside) setMaskSize(compressedMaskSize);
    isInside = true;
    setTargetPosition(event);
  };

  const handlePointerEnter = (event) => {
    isInside = true;
    setTargetPosition(event);
    setMaskSize(expandedMaskSize);
    root.dataset.maskActive = "true";
  };

  const handlePointerLeave = () => {
    isInside = false;
    setMaskSize(idleMaskSize);
    root.dataset.maskActive = "false";
  };

  root.addEventListener("pointerenter", handlePointerEnter);
  root.addEventListener("pointermove", handlePointerMove);
  root.addEventListener("pointerleave", handlePointerLeave);
  setMaskSize(idleMaskSize);

  return {
    destroy() {
      root.removeEventListener("pointerenter", handlePointerEnter);
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", handlePointerLeave);
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
