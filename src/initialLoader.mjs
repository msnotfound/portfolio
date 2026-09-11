export function initInitialLoader(root = document, options = {}) {
  const loader = root.querySelector("[data-loader]");
  if (!loader) return { destroy() {} };

  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  const delay = options.delay ?? 700;
  let timer = 0;

  const complete = () => {
    loader.dataset.loaded = "true";
    root.body?.classList.remove("is-loading");
    view.dispatchEvent(new CustomEvent("loader:complete", {
      detail: { loader },
    }));
  };

  const queueComplete = () => {
    timer = view.setTimeout(complete, delay);
  };

  root.body?.classList.add("is-loading");

  if (root.readyState === "complete") {
    queueComplete();
  } else {
    view.addEventListener("load", queueComplete, { once: true });
  }

  return {
    destroy() {
      view.clearTimeout?.(timer);
      view.removeEventListener("load", queueComplete);
      complete();
    },
  };
}
