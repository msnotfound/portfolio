const STORAGE_KEY = "mayank-portfolio-sound";

export function resolveSoundPreference(storedValue) {
  return storedValue !== "off";
}

export function computeFadeVolume(elapsedMs, fadeMs, targetVolume) {
  const duration = Math.max(1, fadeMs);
  const progress = Math.min(Math.max(elapsedMs / duration, 0), 1);
  const eased = progress * progress * (3 - 2 * progress);

  return Number((targetVolume * eased).toFixed(3));
}

export function shouldAttemptAmbientStart({
  isEnabled,
  isLoaderComplete,
  isPlayPending,
  paused,
}) {
  return Boolean(isEnabled && isLoaderComplete && !isPlayPending && paused);
}

export function createAmbientAudioController(root = document, options = {}) {
  const button = root.querySelector("[data-sound-toggle]");
  const audio = root.querySelector("[data-ambient-audio]");
  if (!button || !audio) return { destroy() {} };

  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  const storage = options.storage ?? view.localStorage;
  const body = root.body ?? root.documentElement;
  const targetVolume = options.volume ?? 0.22;
  const fadeMs = options.fadeMs ?? 700;
  const loader = root.querySelector("[data-loader]");
  let isEnabled = resolveSoundPreference(storage?.getItem(STORAGE_KEY));
  let isLoaderComplete = !loader || loader.dataset.loaded === "true";
  let isPlayPending = false;
  let fadeFrame = 0;
  let fadeStartedAt = 0;

  const setButtonState = () => {
    button.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    button.setAttribute(
      "aria-label",
      isEnabled ? "Pause background music" : "Play background music",
    );
    body?.setAttribute("data-sound-enabled", isEnabled ? "true" : "false");
  };

  const savePreference = () => {
    try {
      storage?.setItem(STORAGE_KEY, isEnabled ? "on" : "off");
    } catch {
      // Storage can be blocked; audio should still remain controllable.
    }
  };

  const cancelFade = () => {
    if (fadeFrame) {
      view.cancelAnimationFrame(fadeFrame);
      fadeFrame = 0;
    }
  };

  const fadeIn = (timestamp) => {
    if (!fadeStartedAt) fadeStartedAt = timestamp;
    audio.volume = computeFadeVolume(timestamp - fadeStartedAt, fadeMs, targetVolume);

    if (audio.volume < targetVolume && isEnabled) {
      fadeFrame = view.requestAnimationFrame(fadeIn);
    } else {
      audio.volume = targetVolume;
      fadeFrame = 0;
    }
  };

  const start = async () => {
    if (
      !shouldAttemptAmbientStart({
        isEnabled,
        isLoaderComplete,
        isPlayPending,
        paused: audio.paused,
      })
    ) {
      return;
    }

    isPlayPending = true;
    cancelFade();
    audio.volume = 0;
    fadeStartedAt = 0;

    try {
      await audio.play();
      fadeFrame = view.requestAnimationFrame(fadeIn);
    } catch {
      // Mobile browsers may require the next tap after the loader is gone.
    } finally {
      isPlayPending = false;
    }
  };

  const stop = () => {
    cancelFade();
    audio.pause();
    audio.volume = 0;
  };

  const toggle = async () => {
    isEnabled = !isEnabled;
    savePreference();
    setButtonState();

    if (isEnabled) {
      await start();
    } else {
      await stop();
    }
  };

  const handleLoaderComplete = () => {
    isLoaderComplete = true;
    start();
  };

  const handleGestureRetry = () => {
    start();
  };

  button.addEventListener("click", toggle);
  view.addEventListener("loader:complete", handleLoaderComplete);
  view.addEventListener("click", handleGestureRetry, { once: true });
  audio.volume = 0;
  setButtonState();

  if (isLoaderComplete) {
    start();
  }

  return {
    destroy() {
      button.removeEventListener("click", toggle);
      view.removeEventListener("loader:complete", handleLoaderComplete);
      view.removeEventListener("click", handleGestureRetry);
      stop();
    },
  };
}
