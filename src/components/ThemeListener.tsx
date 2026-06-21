"use client";
import { useEffect } from "react";
import { getStoredTheme, applyTheme } from "@/lib/theme";

// Keeps the resolved theme in sync if the user has "system" selected and
// switches their OS-level light/dark setting while the app is open.
export default function ThemeListener() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      if (getStoredTheme() === "system") applyTheme("system");
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
