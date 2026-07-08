"use client";
import { useState, useEffect } from "react";
import { Accessibility, X, ZoomIn, ZoomOut, Contrast, Link2, RotateCcw } from "lucide-react";

const STORAGE_KEY = "shiftpro_a11y_prefs";
type Prefs = { fontScale: number; highContrast: boolean; underlineLinks: boolean };
const DEFAULT_PREFS: Prefs = { fontScale: 100, highContrast: false, underlineLinks: false };

// Israeli law (תקנות שוויון זכויות לאנשים עם מוגבלות — התאמות נגישות לשירות,
// תשע"ג-2013, aligned with the IS 5568 / WCAG 2.0 AA standard) requires
// public-facing business websites to be accessible. That obligation applies
// to the marketing site — an authenticated in-app product behind a login
// wall is a different category, so this widget is intentionally mounted
// only on the public marketing/legal pages, not inside the logged-in app.
function applyPrefs(p: Prefs) {
  document.documentElement.style.setProperty("--a11y-font-scale", `${p.fontScale}%`);
  document.documentElement.classList.toggle("a11y-high-contrast", p.highContrast);
  document.documentElement.classList.toggle("a11y-underline-links", p.underlineLinks);
}

export default function AccessibilityWidget({ shiftUp }: { shiftUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) { setPrefs(saved); applyPrefs(saved); }
    } catch {}
  }, []);

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function reset() {
    setPrefs(DEFAULT_PREFS);
    applyPrefs(DEFAULT_PREFS);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="הגדרות נגישות"
        className="fixed flex items-center justify-center rounded-full"
        style={{
          bottom: shiftUp ? 76 : 16, left: 16, zIndex: 90, width: 48, height: 48,
          background: "#0B1E3D", boxShadow: "0 8px 20px -4px rgba(11,30,61,0.5)",
          transition: "bottom 0.42s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <Accessibility size={22} color="#fff" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center px-4" style={{ background: "rgba(11,30,61,0.45)" }}
          onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full rounded-2xl p-5" style={{ maxWidth: 380, background: "#fff" }}>
            <div className="flex items-center justify-between flex-row mb-4">
              <button onClick={() => setOpen(false)}><X size={18} style={{ color: "#5B6472" }} /></button>
              <p className="text-base font-bold flex items-center gap-1.5 flex-row" style={{ color: "#0B1E3D" }}>
                הגדרות נגישות <Accessibility size={17} style={{ color: "#0B1E3D" }} />
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold mb-1.5 text-right" style={{ color: "#5B6472" }}>גודל טקסט ({prefs.fontScale}%)</p>
                <div className="flex gap-2 flex-row">
                  <button onClick={() => update({ fontScale: Math.min(150, prefs.fontScale + 10) })}
                    className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 flex-row text-sm font-semibold"
                    style={{ background: "#F7F8FB", color: "#0B1E3D" }}>
                    <ZoomIn size={15} /> הגדל
                  </button>
                  <button onClick={() => update({ fontScale: Math.max(80, prefs.fontScale - 10) })}
                    className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 flex-row text-sm font-semibold"
                    style={{ background: "#F7F8FB", color: "#0B1E3D" }}>
                    <ZoomOut size={15} /> הקטן
                  </button>
                </div>
              </div>

              <button onClick={() => update({ highContrast: !prefs.highContrast })}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl flex-row"
                style={{ background: "#F7F8FB" }}>
                <div className="relative flex-shrink-0"
                  style={{ width: 36, height: 20, borderRadius: 10, background: prefs.highContrast ? "#0B1E3D" : "#E7EAF0", transition: "background 0.2s" }}>
                  <span className="absolute top-1 rounded-full bg-white transition-all"
                    style={{ width: 14, height: 14, right: prefs.highContrast ? 3 : 19, transition: "right 0.2s" }} />
                </div>
                <span className="text-sm font-semibold flex items-center gap-1.5 flex-row" style={{ color: "#0B1E3D" }}>
                  ניגודיות גבוהה <Contrast size={15} />
                </span>
              </button>

              <button onClick={() => update({ underlineLinks: !prefs.underlineLinks })}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl flex-row"
                style={{ background: "#F7F8FB" }}>
                <div className="relative flex-shrink-0"
                  style={{ width: 36, height: 20, borderRadius: 10, background: prefs.underlineLinks ? "#0B1E3D" : "#E7EAF0", transition: "background 0.2s" }}>
                  <span className="absolute top-1 rounded-full bg-white transition-all"
                    style={{ width: 14, height: 14, right: prefs.underlineLinks ? 3 : 19, transition: "right 0.2s" }} />
                </div>
                <span className="text-sm font-semibold flex items-center gap-1.5 flex-row" style={{ color: "#0B1E3D" }}>
                  הדגשת קישורים <Link2 size={15} />
                </span>
              </button>

              <button onClick={reset}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl flex-row text-sm font-semibold"
                style={{ background: "#FCEAEA", color: "#B91C1C" }}>
                <RotateCcw size={14} /> איפוס הגדרות
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
