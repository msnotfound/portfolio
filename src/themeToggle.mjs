const THEME_KEY = "mayank-portfolio-theme";
const THEMES = new Set(["dark", "light"]);

export function resolveInitialTheme(storedTheme, prefersDark) {
  if (THEMES.has(storedTheme)) return storedTheme;
  return prefersDark ? "dark" : "light";
}

export function getNextTheme(theme) {
  if (theme === "dark") return "light";
  return "dark";
}

export function getStoredTheme(storage) {
  try {
    return storage?.getItem?.(THEME_KEY) ?? null;
  } catch {
    return null;
  }
}

export function storeTheme(storage, theme) {
  try {
    storage?.setItem?.(THEME_KEY, theme);
  } catch {
    // Storage can be blocked in private contexts; theme switching should still work.
  }
}

export function applyTheme(documentRef, theme) {
  const normalizedTheme = THEMES.has(theme) ? theme : "dark";
  const root = documentRef.documentElement;
  const toggle = documentRef.querySelector("[data-theme-toggle]");
  const nextTheme = getNextTheme(normalizedTheme);

  root.dataset.theme = normalizedTheme;
  root.style.colorScheme = normalizedTheme;

  if (toggle) {
    toggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    toggle.setAttribute("aria-pressed", normalizedTheme === "dark" ? "true" : "false");
    toggle.dataset.themeState = normalizedTheme;
  }
}

export function initThemeToggle(documentRef = document) {
  const view = documentRef.defaultView;
  const storage = view?.localStorage;
  const prefersDark = view?.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  const initialTheme = resolveInitialTheme(getStoredTheme(storage), prefersDark);
  const toggle = documentRef.querySelector("[data-theme-toggle]");

  applyTheme(documentRef, initialTheme);

  const handleToggle = () => {
    const nextTheme = getNextTheme(documentRef.documentElement.dataset.theme);
    applyTheme(documentRef, nextTheme);
    storeTheme(storage, nextTheme);
  };

  toggle?.addEventListener("click", handleToggle);

  return {
    destroy() {
      toggle?.removeEventListener("click", handleToggle);
    },
  };
}
