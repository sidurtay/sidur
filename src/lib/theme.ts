export type ThemeChoice = "light" | "dark" | "system";

const KEY = "shiftpro_theme";

export function getStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function setStoredTheme(theme: ThemeChoice) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

export function resolveTheme(theme: ThemeChoice): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme(theme: ThemeChoice) {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute("data-theme", resolved);
}

// Inline script source injected before paint to avoid a flash of the wrong theme.
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem("${KEY}") || "system";
    var resolved = t === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : t;
    document.documentElement.setAttribute("data-theme", resolved);
  } catch (e) {}
})();
`;
