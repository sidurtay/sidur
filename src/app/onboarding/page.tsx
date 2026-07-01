"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, CalendarDays, Users, Sparkles, Plus, X, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { rolePresetFor, type RolePreset } from "@/lib/businessTypePresets";
import type { ShiftSplit } from "@/lib/businessConfig";

const DAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

type DayState = { open: boolean; from: string; to: string };

type HoursPresetKey = "all" | "no-sat" | "no-fri-sat" | "custom";

const SHIFT_OPTIONS: { key: ShiftSplit; label: string; sub: string }[] = [
  { key: "none", label: "משמרת אחת רציפה", sub: "יום עבודה אחד בלי חלוקה" },
  { key: "morning_evening", label: "2 משמרות", sub: "בוקר וערב" },
  { key: "morning_evening_night", label: "3 משמרות", sub: "בוקר, ערב ולילה" },
];

type Step = "hours" | "shifts" | "roles" | "done";

export default function Onboarding() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("hours");
  const [businessId, setBusinessId] = useState("");
  const [personId, setPersonId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState("starter");
  const [saving, setSaving] = useState(false);

  const [days, setDays] = useState<DayState[]>(DAY_LABELS.map(() => ({ open: true, from: "09:00", to: "18:00" })));
  const [hoursPreset, setHoursPreset] = useState<HoursPresetKey>("all");

  const [shiftSplit, setShiftSplit] = useState<ShiftSplit>("none");

  const [rolePresets, setRolePresets] = useState<RolePreset[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState("");

  const steps: Step[] = plan === "starter" ? ["hours", "roles", "done"] : ["hours", "shifts", "roles", "done"];
  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    let session: { businessId?: string; personId?: string; businessName?: string; bizType?: string; plan?: string; role?: string } = {};
    try { session = JSON.parse(localStorage.getItem("shiftpro_session") || "{}"); } catch {}
    if (!session.businessId || session.role !== "manager") { router.replace("/login"); return; }
    setBusinessId(session.businessId);
    setPersonId(session.personId || "");
    setBusinessName(session.businessName || "");
    setPlan(session.plan || "starter");

    const presets = rolePresetFor(session.bizType);
    setRolePresets(presets);
    setSelectedRoles(new Set(presets.map(p => p.key)));

    (async () => {
      try {
        const res = await fetch(`/api/business-hours?businessId=${session.businessId}`).then(r => r.json());
        if (res.success) {
          setDays(res.days.map((d: { open: boolean; from: string; to: string }) => ({ open: d.open, from: d.from, to: d.to })));
        }
      } catch {}
      setReady(true);
    })();
  }, [router]);

  function applyPreset(preset: HoursPresetKey) {
    setHoursPreset(preset);
    if (preset === "custom") return;
    const closedIdx = preset === "all" ? [] : preset === "no-sat" ? [6] : [5, 6];
    setDays(prev => prev.map((d, i) => ({ ...d, open: !closedIdx.includes(i) })));
  }

  function toggleDay(i: number) {
    setHoursPreset("custom");
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, open: !d.open } : d));
  }

  function setAllHours(from: string, to: string) {
    setDays(prev => prev.map(d => ({ ...d, from, to })));
  }

  function toggleRole(key: string) {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function addCustomRole() {
    const name = newRoleName.trim();
    if (!name) return;
    setCustomRoles(prev => [...prev, name]);
    setSelectedRoles(prev => new Set(prev).add(name));
    setNewRoleName("");
  }

  function goNext() {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  }

  async function finish() {
    setSaving(true);
    try {
      await fetch("/api/business-hours", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, callerId: personId, days }),
      });

      if (plan !== "starter") {
        await fetch("/api/business", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, callerId: personId, shiftSplit }),
        });
      }

      const presetKeys = new Set(rolePresets.map(p => p.key));
      const toRemove = rolePresets.filter(p => !selectedRoles.has(p.key));
      const toAdd = [...selectedRoles].filter(key => !presetKeys.has(key));

      await Promise.all([
        ...toRemove.map(r => fetch(`/api/roles?businessId=${businessId}&key=${encodeURIComponent(r.key)}&callerId=${personId}`, { method: "DELETE" })),
        ...toAdd.map(name => fetch("/api/roles", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, name, callerId: personId }),
        })),
      ]);
    } catch {}
    setSaving(false);
    setStep("done");
  }

  if (!ready) return null;

  const STEP_META: Record<Step, { title: string; icon: typeof Clock }> = {
    hours: { title: "שעות פעילות", icon: Clock },
    shifts: { title: "מבנה משמרות", icon: CalendarDays },
    roles: { title: "תפקידים בעסק", icon: Users },
    done: { title: "מוכנים!", icon: Sparkles },
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>
      {step !== "done" && (
        <div className="sticky top-0 z-20 flex flex-col" style={{ background: "var(--navy)" }}>
          <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-row">
            <div className="w-9 h-9" />
            <div className="flex items-center gap-2 flex-row">
              <p className="text-white font-bold text-sm">Sidur</p>
              <div className="w-7 h-7 rounded-lg overflow-hidden"><Logo size={28} /></div>
            </div>
          </div>
          <div className="flex flex-row gap-1.5 px-5 pb-4">
            {steps.slice(0, -1).map((s, i) => (
              <div key={s} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: stepIndex >= i ? "100%" : "0%", background: stepIndex > i ? "#4ADE80" : "#F97316" }} />
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <p className="text-[11px] mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              שלב {stepIndex + 1} מתוך {steps.length - 1} · {businessName}
            </p>
            <p className="text-lg font-bold text-white">{STEP_META[step].title}</p>
          </div>
        </div>
      )}

      {/* ── Step: Hours ── */}
      {step === "hours" && (
        <div className="flex flex-col gap-5 px-4 pt-5 pb-10 animate-fade-slide-up">
          <p className="text-sm text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            מתי {businessName} פתוח? זה קובע איך ה-AI יבנה לך את הסידור.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "all" as const, label: "פתוח כל השבוע" },
              { key: "no-sat" as const, label: "סגור בשבת" },
              { key: "no-fri-sat" as const, label: "סגור שישי-שבת" },
              { key: "custom" as const, label: "מותאם אישית" },
            ].map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className="py-3 rounded-xl text-xs font-semibold"
                style={hoursPreset === p.key
                  ? { background: "var(--navy)", color: "#fff" }
                  : { background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border)" }}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold text-right mb-1" style={{ color: "var(--text-secondary)" }}>ימי פעילות</p>
            <div className="flex flex-row flex-wrap gap-2 justify-end">
              {DAY_LABELS.map((label, i) => (
                <button key={label} onClick={() => toggleDay(i)}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold"
                  style={days[i]?.open
                    ? { background: "rgba(249,115,22,0.12)", color: "var(--blue)", border: "1.5px solid var(--blue)" }
                    : { background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1.5px solid var(--border)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold text-right" style={{ color: "var(--text-secondary)" }}>שעות פעילות (לימים הפתוחים)</p>
            <div className="flex items-center gap-3 flex-row justify-end">
              <input type="time" value={days[0]?.to || "18:00"} onChange={e => setAllHours(days[0]?.from || "09:00", e.target.value)}
                className="px-3 py-2.5 rounded-xl text-sm text-center outline-none" style={{ direction: "ltr", border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>עד</span>
              <input type="time" value={days[0]?.from || "09:00"} onChange={e => setAllHours(e.target.value, days[0]?.to || "18:00")}
                className="px-3 py-2.5 rounded-xl text-sm text-center outline-none" style={{ direction: "ltr", border: "1px solid var(--border)", background: "var(--gray-bg)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>מ-</span>
            </div>
            <p className="text-[11px] text-right" style={{ color: "var(--text-secondary)" }}>
              אפשר לדייק שעות שונות ליום ספציפי מאוחר יותר בהגדרות
            </p>
          </div>

          <button onClick={goNext}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--blue)" }}>
            המשך <ArrowLeft size={18} />
          </button>
        </div>
      )}

      {/* ── Step: Shifts (paid plans only) ── */}
      {step === "shifts" && (
        <div className="flex flex-col gap-5 px-4 pt-5 pb-10 animate-fade-slide-up">
          <p className="text-sm text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            איך יום העבודה שלכם מחולק? זה יעזור ל-AI לשבץ נכון בוקר מול ערב.
          </p>
          <div className="flex flex-col gap-2.5">
            {SHIFT_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => setShiftSplit(opt.key)}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl flex-row"
                style={shiftSplit === opt.key
                  ? { background: "var(--navy)", border: "1.5px solid var(--navy)" }
                  : { background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: shiftSplit === opt.key ? "var(--blue)" : "transparent", border: shiftSplit === opt.key ? "none" : "1.5px solid var(--border)" }}>
                  {shiftSplit === opt.key && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
                <div className="text-right flex-1">
                  <p className="text-sm font-bold" style={{ color: shiftSplit === opt.key ? "#fff" : "var(--text-main)" }}>{opt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: shiftSplit === opt.key ? "rgba(255,255,255,0.6)" : "var(--text-secondary)" }}>{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={goNext}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--blue)" }}>
            המשך <ArrowLeft size={18} />
          </button>
        </div>
      )}

      {/* ── Step: Roles ── */}
      {step === "roles" && (
        <div className="flex flex-col gap-5 px-4 pt-5 pb-10 animate-fade-slide-up">
          <p className="text-sm text-right leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            הצענו תפקידים מתאימים לסוג העסק שלכם — בטלו מה שלא רלוונטי, והוסיפו מה שחסר.
          </p>

          <div className="flex flex-row flex-wrap gap-2 justify-end">
            {rolePresets.map(r => (
              <button key={r.key} onClick={() => toggleRole(r.key)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-semibold flex-row"
                style={selectedRoles.has(r.key)
                  ? { background: "rgba(249,115,22,0.12)", color: "var(--blue)", border: "1.5px solid var(--blue)" }
                  : { background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1.5px solid var(--border)", textDecoration: "line-through" }}>
                {selectedRoles.has(r.key) ? <Check size={13} /> : <X size={13} />}
                {r.label}
              </button>
            ))}
            {customRoles.map(name => (
              <button key={name} onClick={() => toggleRole(name)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-semibold flex-row"
                style={selectedRoles.has(name)
                  ? { background: "rgba(249,115,22,0.12)", color: "var(--blue)", border: "1.5px solid var(--blue)" }
                  : { background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1.5px solid var(--border)", textDecoration: "line-through" }}>
                {selectedRoles.has(name) ? <Check size={13} /> : <X size={13} />}
                {name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-row">
            <button onClick={addCustomRole}
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--navy)" }}>
              <Plus size={18} color="#fff" />
            </button>
            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addCustomRole(); }}
              placeholder="תפקיד נוסף שחסר לכם?"
              className="flex-1 px-4 py-3 rounded-xl text-sm text-right outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>

          <button onClick={finish} disabled={saving}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
            style={{ background: saving ? "#9CA3AF" : "var(--blue)" }}>
            {saving ? "שומר..." : "סיימתי — לדשבורד"}
          </button>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === "done" && (
        <div className="flex flex-col flex-1 items-center justify-center px-6 py-16 text-center" style={{ background: "var(--navy)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(74,222,128,0.15)", border: "2px solid rgba(74,222,128,0.3)" }}>
            <Check size={30} style={{ color: "#4ADE80" }} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">הכל מוכן!</h2>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.55)" }}>
            {businessName} מוגדר לפי הצרכים שלכם. עכשיו אפשר להוסיף עובדים ולתת ל-AI לבנות סידור.
          </p>
          <button onClick={() => router.replace("/dashboard")}
            className="w-full max-w-xs py-4 rounded-2xl text-base font-bold text-white"
            style={{ background: "var(--blue)", boxShadow: "0 8px 24px rgba(249,115,22,0.4)" }}>
            כניסה לדשבורד →
          </button>
        </div>
      )}
    </div>
  );
}
