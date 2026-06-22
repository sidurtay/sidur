"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, ChevronLeft, ChevronRight, Send, Clock, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

type TipsMode = "daily" | "per-shift";

type TipWorker = {
  name: string; initials: string; color: string; textColor: string;
  timeIn: string; timeOut: string; personId?: string;
};

type DayData = {
  date: string; label: string;
  morning: TipWorker[];
  evening: TipWorker[];
};

type DayTips = {
  morningTotal: string; eveningTotal: string; dailyTotal: string;
  published: boolean; locked: boolean;
  lockedBy?: string; lockedAt?: string;
};

const TODAY_IDX = 2;

const REAL_WEEK_START = "2026-06-21";
const REAL_DAY_DEFS = [
  { date: "21.6", iso: "2026-06-21", label: "ראשון 21.6", d: 0 },
  { date: "22.6", iso: "2026-06-22", label: "שני 22.6", d: 1 },
  { date: "23.6", iso: "2026-06-23", label: "שלישי 23.6 (היום)", d: 2 },
  { date: "24.6", iso: "2026-06-24", label: "רביעי 24.6", d: 3 },
  { date: "25.6", iso: "2026-06-25", label: "חמישי 25.6", d: 4 },
  { date: "26.6", iso: "2026-06-26", label: "שישי 26.6", d: 5 },
  { date: "27.6", iso: "2026-06-27", label: "שבת 27.6", d: 6 },
];

type ScheduleAssignment = { dayOfWeek: number; personId: string; name: string; initials: string; color: string; textColor: string; timeIn: string; timeOut: string };

function buildRealDays(assignments: ScheduleAssignment[]): DayData[] {
  return REAL_DAY_DEFS.map(def => {
    const dayAssignments = assignments.filter(a => a.dayOfWeek === def.d);
    const morning: TipWorker[] = [];
    const evening: TipWorker[] = [];
    dayAssignments.forEach(a => {
      const hour = Number(a.timeIn.split(":")[0]);
      const worker: TipWorker = { name: a.name, initials: a.initials, color: a.color, textColor: a.textColor, timeIn: a.timeIn, timeOut: a.timeOut, personId: a.personId };
      if (hour < 14) morning.push(worker); else evening.push(worker);
    });
    return { date: def.date, label: def.label, morning, evening };
  });
}

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  const total  = h * 60 + m;
  return total === 0 ? 24 * 60 : total;
}
function workerHours(w: TipWorker) {
  const inM  = timeToMins(w.timeIn);
  let outM   = timeToMins(w.timeOut);
  if (outM <= inM) outM += 24 * 60;
  return (outM - inM) / 60;
}
function calcShares(workers: TipWorker[], total: number) {
  const hrs  = workers.map(w => workerHours(w));
  const sumH = hrs.reduce((a, b) => a + b, 0);
  return workers.map((w, i) => ({
    ...w, hours: hrs[i],
    share:  sumH > 0 ? hrs[i] / sumH : 0,
    amount: sumH > 0 ? total * hrs[i] / sumH : 0,
  }));
}

export default function Tips() {
  const router = useRouter();
  const [dayIdx,   setDayIdx]   = useState(TODAY_IDX);
  const [tipsMode, setTipsMode] = useState<TipsMode>("per-shift");
  const [businessId, setBusinessId] = useState("");
  const [managerName, setManagerName] = useState("מנהל");
  const [days, setDays] = useState<DayData[]>([]);
  const [tipsData, setTipsData] = useState<Record<string, DayTips>>({});

  useEffect(() => {
    const stored = localStorage.getItem("shiftpro_tips_mode");
    if (stored === "daily" || stored === "per-shift") setTipsMode(stored as TipsMode);

    let biz = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || "";
      if (s.name) setManagerName(s.name);
    } catch {}
    setBusinessId(biz);
    if (!biz) { router.replace("/login"); return; }

    (async () => {
      try {
        const [schedRes, tipsRes] = await Promise.all([
          fetch(`/api/schedule?businessId=${biz}&weekStart=${REAL_WEEK_START}`).then(r => r.json()),
          fetch(`/api/tips?businessId=${biz}`).then(r => r.json()),
        ]);
        if (schedRes.success) setDays(buildRealDays(schedRes.assignments));
        if (tipsRes.success) {
          const map: Record<string, DayTips> = {};
          REAL_DAY_DEFS.forEach(def => {
            const found = tipsRes.days.find((d: { date: string }) => d.date === def.iso);
            map[def.date] = found
              ? { morningTotal: found.morningTotal, eveningTotal: found.eveningTotal, dailyTotal: found.dailyTotal, published: found.published, locked: found.locked, lockedBy: found.lockedBy,
                  lockedAt: found.lockedAt ? new Date(found.lockedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : undefined }
              : { morningTotal: "", eveningTotal: "", dailyTotal: "", published: false, locked: false };
          });
          setTipsData(map);
        }
      } catch {}
    })();
  }, []);

  const day = days[dayIdx];
  const isToday = dayIdx === TODAY_IDX;
  const tips = day ? (tipsData[day.date] ?? { morningTotal: "", eveningTotal: "", dailyTotal: "", published: false, locked: false }) : { morningTotal: "", eveningTotal: "", dailyTotal: "", published: false, locked: false };
  const locked  = tips.locked;

  if (!day) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center" style={{ background: "var(--gray-bg)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>טוען...</p>
        <BottomNav />
      </div>
    );
  }

  async function persist(next: DayTips) {
    if (!businessId) return;
    const def = REAL_DAY_DEFS.find(d => d.date === day.date);
    if (!def) return;
    try {
      await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, date: def.iso,
          morningTotal: next.morningTotal, eveningTotal: next.eveningTotal, dailyTotal: next.dailyTotal,
          published: next.published, locked: next.locked,
          lockedBy: next.locked ? next.lockedBy : null,
          lockedAt: next.locked ? new Date().toISOString() : null,
        }),
      });
    } catch {}
  }

  function update(patch: Partial<DayTips>) {
    setTipsData(prev => ({ ...prev, [day.date]: { ...tips, ...patch } }));
  }

  function publish() {
    const hasMorning = parseFloat(tips.morningTotal) > 0;
    const hasEvening = parseFloat(tips.eveningTotal) > 0;
    const hasDaily   = parseFloat(tips.dailyTotal)   > 0;
    if (tipsMode === "per-shift" && !hasMorning && !hasEvening) return;
    if (tipsMode === "daily"     && !hasDaily) return;
    const next = { ...tips, published: true };
    update({ published: true });

    // Push a notification for every worker who worked that day
    const allWorkers = [...day.morning, ...day.evening];
    const unique = allWorkers.filter((w, i, arr) => arr.findIndex(x => x.name === w.name) === i);
    const now = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    const totalLabel = tipsMode === "daily"
      ? `${tips.dailyTotal} ₪`
      : [hasMorning && `בוקר ${tips.morningTotal} ₪`, hasEvening && `ערב ${tips.eveningTotal} ₪`].filter(Boolean).join(" | ");
    const title = `טיפים פורסמו — ${day.label}`;
    const body  = `קיבלת טיפים (${totalLabel}) — ${now}`;

    const notify = unique.filter(w => w.personId).map(w => ({ personId: w.personId, title, body }));
    fetch("/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, date: REAL_DAY_DEFS.find(d => d.date === day.date)?.iso, ...next, notify }),
    }).catch(() => {});

    try {
      const newNotif = {
        id: `tips-${day.date}-${Date.now()}`,
        title, text: `${unique.length} עובדים קיבלו התראה (${totalLabel}) — ${now}`,
        time: "עכשיו", type: "success", unread: true,
        workers: unique.map(w => w.name), date: day.date,
      };
      const existing = JSON.parse(localStorage.getItem("shiftpro_tips_notifications") || "[]");
      // Replace if same date already exists
      const filtered = existing.filter((n: { date: string }) => n.date !== day.date);
      localStorage.setItem("shiftpro_tips_notifications", JSON.stringify([newNotif, ...filtered]));
    } catch {}
  }

  function lockTips() {
    const now = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    const next = { ...tips, locked: true, lockedBy: managerName, lockedAt: now };
    update({ locked: true, lockedBy: managerName, lockedAt: now });
    persist(next);
  }

  function unlock() {
    const next = { ...tips, locked: false };
    update({ locked: false });
    persist(next);
  }

  const morningNum = parseFloat(tips.morningTotal) || 0;
  const eveningNum = parseFloat(tips.eveningTotal) || 0;
  const dailyNum   = parseFloat(tips.dailyTotal)   || 0;
  const totalCount = day.morning.length + day.evening.length;

  // daily mode: distribute proportionally by headcount between morning/evening
  const dailyMorningPool = totalCount > 0 ? dailyNum * (day.morning.length / totalCount) : 0;
  const dailyEveningPool = totalCount > 0 ? dailyNum * (day.evening.length / totalCount) : 0;

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "var(--gray-bg)" }}>

      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 relative" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="absolute top-3 left-4"><Logo size={22} /></div>
        <div className="flex items-center justify-between flex-row mb-2">
          <div className="flex items-center gap-2">
            {locked ? (
              <button onClick={unlock}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "var(--blue-light)", color: "var(--blue)", border: "1px solid var(--blue-border)" }}>
                <Unlock size={10} /> בטל נעילה
              </button>
            ) : tips.published ? (
              <button onClick={lockTips}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "var(--navy)", color: "#fff" }}>
                <Lock size={10} /> נעל טיפים
              </button>
            ) : null}
          </div>
          <p className="text-base font-semibold">פרסום טיפים</p>
        </div>

        {/* Date nav */}
        <div className="flex items-center justify-between flex-row mb-2">
          <button onClick={() => setDayIdx(i => Math.min(i + 1, days.length - 1))}
            disabled={dayIdx >= days.length - 1}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", opacity: dayIdx >= days.length - 1 ? 0.3 : 1 }}>
            <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold">{day.label}</p>
            {locked && (
              <p className="text-[10px] flex items-center gap-1 justify-center mt-0.5" style={{ color: "var(--blue)" }}>
                <Lock size={8} /> נעול · {tips.lockedBy} · {tips.lockedAt}
              </p>
            )}
          </div>
          <button onClick={() => setDayIdx(i => Math.max(i - 1, 0))}
            disabled={dayIdx === 0}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--gray-bg)", border: "1px solid var(--border)", opacity: dayIdx === 0 ? 0.3 : 1 }}>
            <ChevronLeft size={14} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex flex-row gap-1.5">
          {(["per-shift", "daily"] as TipsMode[]).map(mode => (
            <button key={mode} onClick={() => { setTipsMode(mode); localStorage.setItem("shiftpro_tips_mode", mode); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium"
              style={tipsMode === mode
                ? { background: "var(--navy)", color: "#fff" }
                : { background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {mode === "per-shift" ? "פר משמרת" : "יומי"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">

        {/* Past day without data warning */}
        {!isToday && !tips.published && !tips.morningTotal && !tips.eveningTotal && !tips.dailyTotal && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 flex-row"
            style={{ background: "var(--amber-light)", border: "1px solid #EBC395" }}>
            <AlertCircle size={16} style={{ color: "var(--amber)", flexShrink: 0 }} />
            <div className="flex-1 text-right">
              <p className="text-xs font-semibold" style={{ color: "var(--amber)" }}>טיפים לא פורסמו ביום זה</p>
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>ניתן להזין ולפרסם כעת</p>
            </div>
          </div>
        )}

        {/* Per-shift mode */}
        {tipsMode === "per-shift" && (
          <>
            <ShiftSection
              label="משמרת בוקר" timeRange="עד 16:00"
              workers={calcShares(day.morning, morningNum)}
              total={tips.morningTotal}
              onTotal={v => update({ morningTotal: v })}
              locked={locked} accent="var(--blue)" accentLight="var(--blue-light)"
            />
            <ShiftSection
              label="משמרת ערב" timeRange="16:00 +"
              workers={calcShares(day.evening, eveningNum)}
              total={tips.eveningTotal}
              onTotal={v => update({ eveningTotal: v })}
              locked={locked} accent="var(--navy)" accentLight="#EAE7E1"
            />
            {(morningNum + eveningNum) > 0 && (
              <div className="bg-white rounded-xl px-4 py-2.5 flex items-center justify-between flex-row"
                style={{ border: "1px solid var(--border)" }}>
                <p className="text-base font-bold" style={{ color: "var(--green)" }}>₪{(morningNum + eveningNum).toLocaleString()}</p>
                <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>סה"כ יומי · {totalCount} עובדים</p>
              </div>
            )}
          </>
        )}

        {/* Daily mode */}
        {tipsMode === "daily" && (
          <>
            <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 flex-row"
              style={{ border: "1px solid var(--border)" }}>
              <span className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>₪</span>
              <input type="number" inputMode="numeric"
                value={tips.dailyTotal}
                onChange={e => update({ dailyTotal: e.target.value })}
                disabled={locked}
                className="flex-1 text-2xl font-bold text-left outline-none bg-transparent"
                style={{ direction: "ltr" }}
                placeholder="0" />
              <p className="text-sm text-right" style={{ color: "var(--text-secondary)" }}>סכום יומי</p>
            </div>
            {dailyNum > 0 && (
              <div className="rounded-xl px-4 py-2.5 text-center"
                style={{ background: "var(--green-light)", border: "1px solid #A8D9BB" }}>
                <p className="text-xl font-bold" style={{ color: "var(--green)" }}>₪{dailyNum.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{totalCount} עובדים</p>
              </div>
            )}
            <WorkerTable label="משמרת בוקר" workers={calcShares(day.morning, dailyMorningPool)} accent="var(--blue)" />
            <WorkerTable label="משמרת ערב"  workers={calcShares(day.evening, dailyEveningPool)} accent="var(--navy)" />
          </>
        )}

        {/* Action buttons */}
        {!tips.published && !locked && (
          <button onClick={publish}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--navy)" }}>
            <Send size={14} /> פרסם טיפים לעובדים
          </button>
        )}

        {tips.published && !locked && (
          <div className="flex flex-col gap-2">
            <div className="rounded-xl py-3 px-4 flex flex-col gap-1"
              style={{ background: "var(--green-light)", border: "1px solid #A8D9BB" }}>
              <div className="flex items-center justify-between flex-row">
                <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>
                  {[...day.morning, ...day.evening].filter((w, i, arr) => arr.findIndex(x => x.name === w.name) === i).length} עובדים קיבלו התראה
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--green)" }}>✓ הטיפים פורסמו</span>
              </div>
              <div className="flex flex-row flex-wrap gap-1 justify-end">
                {[...day.morning, ...day.evening]
                  .filter((w, i, arr) => arr.findIndex(x => x.name === w.name) === i)
                  .map(w => (
                    <span key={w.name} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: w.color, color: w.textColor }}>{w.name}</span>
                  ))}
              </div>
            </div>
            <button onClick={lockTips}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "var(--navy)", color: "#fff" }}>
              <Lock size={14} /> נעל טיפים
            </button>
            <p className="text-[10px] text-center" style={{ color: "var(--text-secondary)" }}>
              לאחר נעילה רק המנהל הראשי או מי שנעל יכול לשנות
            </p>
          </div>
        )}

        {locked && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 flex-row"
            style={{ background: "var(--blue-light)", border: "1px solid var(--blue-border)" }}>
            <div className="flex-1 text-right">
              <p className="text-sm font-semibold" style={{ color: "var(--blue)" }}>טיפים נעולים</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {tips.lockedBy} · {tips.lockedAt}
              </p>
            </div>
            <Lock size={18} style={{ color: "var(--blue)", flexShrink: 0 }} />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* Shift section — per-shift mode */
function ShiftSection({ label, timeRange, workers, total, onTotal, locked, accent, accentLight }: {
  label: string; timeRange: string;
  workers: ReturnType<typeof calcShares>;
  total: string; onTotal: (v: string) => void;
  locked: boolean; accent: string; accentLight: string;
}) {
  const totalNum = parseFloat(total) || 0;
  const sumHours = workers.reduce((s, w) => s + w.hours, 0);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Header bar */}
      <div className="px-3 py-2 flex items-center justify-between flex-row"
        style={{ background: accent }}>
        <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: "rgba(255,255,255,0.75)" }}>
          <Clock size={10} /><span style={{ direction: "ltr" }}>{timeRange}</span>
        </span>
        <p className="text-sm font-semibold text-white">{label}</p>
      </div>

      {/* Amount input */}
      <div className="bg-white px-3 py-2.5 flex items-center gap-2 flex-row"
        style={{ borderBottom: workers.length > 0 ? "1px solid var(--border)" : "none" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>₪</span>
        <input type="number" inputMode="numeric"
          value={total} onChange={e => onTotal(e.target.value)}
          disabled={locked}
          className="flex-1 text-xl font-bold text-left outline-none bg-transparent"
          style={{ direction: "ltr" }}
          placeholder="0" />
        {totalNum > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: accentLight, color: accent }}>
            {workers.length} עובדים · {sumHours.toFixed(1)}ש׳
          </span>
        )}
      </div>

      {/* Workers */}
      {workers.map((w, i) => (
        <div key={w.name} className="bg-white flex items-center px-3 py-2.5 flex-row"
          style={{ borderBottom: i < workers.length - 1 ? "1px solid var(--border)" : "none" }}>
          <div className="min-w-14 text-left flex-shrink-0">
            <p className="text-sm font-bold" style={{ color: totalNum > 0 ? "var(--green)" : "var(--text-secondary)" }}>
              {totalNum > 0 ? `₪${w.amount.toFixed(0)}` : "—"}
            </p>
            {totalNum > 0 && <p className="text-[10px]" style={{ color: "#9A9890" }}>{(w.share * 100).toFixed(0)}%</p>}
          </div>
          <div className="flex-1 text-right mr-3">
            <div className="flex items-center gap-1.5 justify-end flex-row">
              <p className="text-sm font-medium">{w.name}</p>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: w.color, color: w.textColor }}>{w.initials}</div>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)", direction: "ltr" }}>
              {w.timeIn}–{w.timeOut} · {w.hours.toFixed(1)}ש׳
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Worker table — daily mode */
function WorkerTable({ label, workers, accent }: {
  label: string; workers: ReturnType<typeof calcShares>; accent: string;
}) {
  if (workers.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold mb-1 text-right" style={{ color: accent }}>{label}</p>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {workers.map((w, i) => (
          <div key={w.name} className="flex items-center px-3 py-2.5 flex-row"
            style={{ borderBottom: i < workers.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div className="min-w-14 text-left flex-shrink-0">
              <p className="text-sm font-bold" style={{ color: w.amount > 0 ? "var(--green)" : "var(--text-secondary)" }}>
                {w.amount > 0 ? `₪${w.amount.toFixed(0)}` : "—"}
              </p>
              {w.amount > 0 && <p className="text-[10px]" style={{ color: "#9A9890" }}>{(w.share * 100).toFixed(0)}%</p>}
            </div>
            <div className="flex-1 text-right mr-3">
              <div className="flex items-center gap-1.5 justify-end flex-row">
                <p className="text-sm font-medium">{w.name}</p>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: w.color, color: w.textColor }}>{w.initials}</div>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)", direction: "ltr" }}>
                {w.timeIn}–{w.timeOut} · {w.hours.toFixed(1)}ש׳
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
