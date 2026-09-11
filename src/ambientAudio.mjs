const STORAGE_KEY = "mayank-portfolio-sound";

export function resolveSoundPreference(storedValue) {
  return storedValue !== "off";
}

export function createAmbientAudioController(root = document, options = {}) {
  const button = root.querySelector("[data-sound-toggle]");
  if (!button) return { destroy() {} };

  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  const storage = options.storage ?? view.localStorage;
  const body = root.body ?? root.documentElement;
  const baseVolume = options.volume ?? 0.018;
  let isEnabled = resolveSoundPreference(storage?.getItem(STORAGE_KEY));
  let context = null;
  let master = null;
  let oscillators = [];

  const setButtonState = () => {
    button.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    button.setAttribute(
      "aria-label",
      isEnabled ? "Pause background music" : "Play background music",
    );
    body?.setAttribute("data-sound-enabled", isEnabled ? "true" : "false");
  };

  const buildGraph = () => {
    const AudioContext = view.AudioContext || view.webkitAudioContext;
    if (!AudioContext) return null;

    context = new AudioContext();
    master = context.createGain();
    master.gain.value = baseVolume;
    master.connect(context.destination);

    const frequencies = [146.83, 220, 277.18];
    oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 1 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 1 ? 0.42 : 0.28;
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start();
      return oscillator;
    });

    return context;
  };

  const start = async () => {
    if (!isEnabled) return;
    const audioContext = context ?? buildGraph();
    try {
      await audioContext?.resume?.();
    } catch {
      // Browsers commonly block audio until a gesture; the first pointerdown retries.
    }
  };

  const stop = async () => {
    try {
      await context?.suspend?.();
    } catch {
      // Suspending is best-effort only.
    }
  };

  const savePreference = () => {
    try {
      storage?.setItem(STORAGE_KEY, isEnabled ? "on" : "off");
    } catch {
      // Private browsing or strict storage settings should not break the control.
    }
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

  const handleFirstGesture = () => {
    start();
  };

  button.addEventListener("click", toggle);
  view.addEventListener("pointerdown", handleFirstGesture, { once: true, passive: true });
  setButtonState();
  start();

  return {
    destroy() {
      button.removeEventListener("click", toggle);
      view.removeEventListener("pointerdown", handleFirstGesture);
      oscillators.forEach((oscillator) => oscillator.stop?.());
      context?.close?.();
      oscillators = [];
      context = null;
      master = null;
    },
  };
}
