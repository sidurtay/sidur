"use client";
import { useState, useEffect } from "react";
import { Sun, Moon, Smartphone } from "lucide-react";
import { getStoredTheme, setStoredTheme, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { key: ThemeChoice; label: string; icon: React.ReactNode }[] = [
  { key: "light", label: "בהיר", icon: <Sun size={16} /> },
  { key: "dark", label: "כהה", icon: <Moon size={16} /> },
  { key: "system", label: "לפי המכשיר", icon: <Smartphone size={16} /> },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => { setTheme(getStoredTheme()); }, []);

  function choose(t: ThemeChoice) {
    setTheme(t);
    setStoredTheme(t);
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5 flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
        <Moon size={13} style={{ color: "var(--blue)" }} />
        <p className="text-sm font-semibold">מצב תצוגה</p>
      </div>
      <div className="flex flex-row gap-2 p-3">
        {OPTIONS.map(o => (
          <button key={o.key} onClick={() => choose(o.key)}
            className="flex-1 rounded-xl py-3 flex flex-col items-center gap-1.5"
            style={theme === o.key
              ? { background: "var(--navy)", color: "#fff" }
              : { background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            {o.icon}
            <span className="text-xs font-medium">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
