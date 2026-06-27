export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "shiftpro_theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : "system";
}

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

// Sets the actual data-theme attribute the CSS keys off of. Called on load
// (before paint, see the inline script in layout.tsx) and whenever the user
// changes the setting or — in "system" mode — the OS theme changes underneath them.
export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", resolve(mode));
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

// Keeps "system" mode live — if the user flips their OS theme while the app
// is open, the app should follow without needing a refresh.
export function watchSystemTheme(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => { if (getStoredTheme() === "system") onChange(); };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
