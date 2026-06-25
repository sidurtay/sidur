"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { getEffectiveConfig } from "@/lib/businessConfig";
import AiWalker from "./AiWalker";

// The full AI schedule-building conversation engine, extracted so it can be
// embedded directly inside the floating chat drawer (AIChatDrawer) instead of
// only living at the standalone /schedule/ai page. Same logic as that page.

type EmployeeRow = { personId: string; name: string; initials: string; role: string; color: string; textColor: string };

type DayAvailability = "morning" | "evening" | "all" | "off";
type ConstraintsMap = Record<string, { availability: Record<number, DayAvailability> }>;

const isWaiterRole = (r: string) => r.startsWith("מלצר");
const isKitchenRole = (r: string) => r === "מטבח";
const isBarRole = (r: string) => r === "בר";
const isWashRole = (r: string) => r === "שטיפה";

const AI_WEEK_START = "2026-06-28"; // matches the schedule page's "next" week

const holidays2026 = [
  { date: "2026-04-02", name: "ערב פסח" }, { date: "2026-04-03", name: "פסח" },
  { date: "2026-04-09", name: "שביעי של פסח" }, { date: "2026-04-23", name: "יום העצמאות" },
  { date: "2026-05-22", name: "שבועות" }, { date: "2026-08-13", name: "תשעה באב" },
  { date: "2026-09-22", name: "ראש השנה" }, { date: "2026-10-01", name: "יום כיפור" },
  { date: "2026-10-06", name: "סוכות" }, { date: "2026-10-13", name: "שמחת תורה" },
];

const ALL_NEXT_WEEK_DAYS = [
  { label: "ראשון", date: "28.6", iso: "2026-06-28", d: 0 },
  { label: "שני",   date: "29.6", iso: "2026-06-29", d: 1 },
  { label: "שלישי", date: "30.6", iso: "2026-06-30", d: 2 },
  { label: "רביעי", date: "1.7",  iso: "2026-07-01", d: 3 },
  { label: "חמישי", date: "2.7",  iso: "2026-07-02", d: 4 },
  { label: "שישי",  date: "3.7",  iso: "2026-07-03", d: 5 },
  { label: "שבת",   date: "4.7",  iso: "2026-07-04", d: 6 },
];

type Msg = {
  id: number;
  from: "ai" | "user";
  text: string;
  chips?: string[];
  showCustomInput?: boolean;
  status?: "info" | "warn" | "success";
};

type Config = {
  morningWaiters: number;
  morningKitchen: number;
  eveningWaiters: number;
  eveningKitchen: number;
  fridayExtra: boolean;
  maxHours: number;
  specialEvent: boolean;
};

type Step =
  | "use-last" | "morning-waiters" | "morning-kitchen"
  | "evening-waiters" | "evening-kitchen"
  | "max-hours" | "special-event" | "friday-extra"
  | "free-chat" | "generating" | "done";

const LAST_CONFIG_KEY = "shiftpro_last_ai_config";

function getLastConfig(): Config | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(LAST_CONFIG_KEY) || ""); } catch { return null; }
}
function saveConfig(c: Config) { localStorage.setItem(LAST_CONFIG_KEY, JSON.stringify(c)); }

type ScheduleEntry = { id: string; personId: string; name: string; initials: string; role: string; color: string; textColor: string; timeIn: string; timeOut: string };

const NUM_CHIPS = ["1", "2", "3", "4", "5+"];

export default function ScheduleBuilderChat({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>("use-last");
  const [config, setConfig] = useState<Partial<Config>>({});
  const [inputVal, setInputVal] = useState("");
  const [customNumStep, setCustomNumStep] = useState<Step | null>(null);
  const [customNumVal, setCustomNumVal] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [nextWeekDays, setNextWeekDays] = useState(ALL_NEXT_WEEK_DAYS.filter((_, i) => i < 6));
  const [bizHours, setBizHours] = useState<Record<number, { from: string; to: string }>>({});
  const [weekHolidays, setWeekHolidays] = useState<(typeof ALL_NEXT_WEEK_DAYS[0] & { name: string })[]>([]);
  const [constraintsMap, setConstraintsMap] = useState<ConstraintsMap>({});
  const [businessId, setBusinessId] = useState("");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const missingConstraints = employees.filter(e => !constraintsMap[e.personId]);

  useEffect(() => {
    const cfg = getEffectiveConfig();
    const openDays = ALL_NEXT_WEEK_DAYS.filter((_, i) => cfg.days[i]?.open);
    setNextWeekDays(openDays);
    const hours: Record<number, { from: string; to: string }> = {};
    cfg.days.forEach((d, i) => { if (d.open) hours[i] = { from: d.from, to: d.to }; });
    setBizHours(hours);
    const holidays = openDays
      .map(d => ({ ...d, name: holidays2026.find(h => h.date === d.iso)?.name || "" }))
      .filter(d => d.name);
    setWeekHolidays(holidays);

    let biz = "";
    try {
      const s = JSON.parse(localStorage.getItem("shiftpro_session") || "{}");
      biz = s.businessId || "";
    } catch {}
    setBusinessId(biz);
    if (!biz) return;

    (async () => {
      try {
        const empRes = await fetch(`/api/employees?businessId=${biz}`).then(r => r.json());
        if (empRes.success) {
          setEmployees(empRes.employees.map((e: { id: string; name: string; initials: string; role: string; color: string; textColor: string }) => ({
            personId: e.id, name: e.name, initials: e.initials, role: e.role, color: e.color, textColor: e.textColor,
          })));
        }
        const consRes = await fetch(`/api/constraints?businessId=${biz}&weekStart=${AI_WEEK_START}`).then(r => r.json());
        if (consRes.success) {
          const map: ConstraintsMap = {};
          consRes.people.forEach((p: { personId: string; availability: Record<number, DayAvailability> }) => {
            map[p.personId] = { availability: p.availability };
          });
          setConstraintsMap(map);
        }
      } catch {}
    })();
  }, []);

  async function persistScheduleToDb(schedule: Record<number, ScheduleEntry[]>) {
    try {
      const existing = await fetch(`/api/schedule?businessId=${businessId}&weekStart=${AI_WEEK_START}`).then(r => r.json());
      if (existing.success) {
        await Promise.all(existing.assignments.map((a: { id: string }) =>
          fetch(`/api/schedule?id=${a.id}`, { method: "DELETE" })
        ));
      }
      const posts: Promise<unknown>[] = [];
      Object.entries(schedule).forEach(([day, list]) => {
        list.forEach(entry => {
          posts.push(fetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId, weekStart: AI_WEEK_START, dayOfWeek: Number(day),
              personId: entry.personId, roleKey: entry.role, timeIn: entry.timeIn, timeOut: entry.timeOut,
            }),
          }));
        });
      });
      await Promise.all(posts);
    } catch {}
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMsg(msg: Omit<Msg, "id">) {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }]);
  }

  function generateSchedule(aiConfig: Config) {
    const waiters = employees.filter(e => isWaiterRole(e.role));
    const kitchen = employees.filter(e => isKitchenRole(e.role));
    const bar     = employees.filter(e => isBarRole(e.role));
    const wash    = employees.filter(e => isWashRole(e.role));
    const schedule: Record<number, ScheduleEntry[]> = {};
    const warnings: string[] = [];
    const weeklyHours: Record<string, number> = {};

    function isAvailable(personId: string, dayIndex: number, part: "morning" | "evening"): boolean {
      const status = constraintsMap[personId]?.availability?.[dayIndex] ?? "all";
      if (status === "off") return false;
      if (status === "morning") return part === "morning";
      if (status === "evening") return part === "evening";
      return true;
    }

    function addHours(e: { name: string }, timeIn: string, timeOut: string) {
      const [hi] = timeIn.split(":").map(Number);
      let [ho] = timeOut.split(":").map(Number);
      if (ho <= hi) ho += 24;
      weeklyHours[e.name] = (weeklyHours[e.name] || 0) + (ho - hi);
    }

    nextWeekDays.forEach(day => {
      const isFriday = day.label === "שישי";
      const bh = bizHours[day.d] ?? { from: "08:00", to: "23:00" };
      const [openH] = bh.from.split(":").map(Number);
      const [closeH] = bh.to.split(":").map(Number);
      const mid = openH + Math.floor((((closeH || 24) - openH) / 2));
      const midStr = `${String(mid).padStart(2, "0")}:00`;

      const dayList: ScheduleEntry[] = [];

      const morningWaiterPool = waiters.filter(e => isAvailable(e.personId, day.d, "morning"));
      const eveningWaiterPool = waiters.filter(e => isAvailable(e.personId, day.d, "evening"));
      const morningKitchenPool = kitchen.filter(e => isAvailable(e.personId, day.d, "morning"));
      const eveningKitchenPool = kitchen.filter(e => isAvailable(e.personId, day.d, "evening"));
      const eveningBarPool = bar.filter(e => isAvailable(e.personId, day.d, "evening"));
      const morningWashPool = wash.filter(e => isAvailable(e.personId, day.d, "morning"));

      const wantMw = aiConfig.morningWaiters;
      const wantEw = aiConfig.eveningWaiters + (isFriday && aiConfig.fridayExtra ? 1 : 0);
      const wantMk = aiConfig.morningKitchen;
      const wantEk = aiConfig.eveningKitchen || 1;

      morningWaiterPool.slice(0, wantMw).forEach((e, i) => {
        dayList.push({ id: `${day.d}-mw-${i}`, ...e, timeIn: bh.from, timeOut: midStr });
        addHours(e, bh.from, midStr);
      });
      eveningWaiterPool.filter(e => !dayList.find(d => d.personId === e.personId)).slice(0, wantEw).forEach((e, i) => {
        dayList.push({ id: `${day.d}-ew-${i}`, ...e, timeIn: midStr, timeOut: bh.to || "00:00" });
        addHours(e, midStr, bh.to || "00:00");
      });
      morningKitchenPool.slice(0, wantMk).forEach((e, i) => {
        dayList.push({ id: `${day.d}-mk-${i}`, ...e, timeIn: bh.from, timeOut: midStr });
        addHours(e, bh.from, midStr);
      });
      eveningKitchenPool.filter(e => !dayList.find(d => d.personId === e.personId)).slice(0, wantEk).forEach((e, i) => {
        dayList.push({ id: `${day.d}-ek-${i}`, ...e, timeIn: midStr, timeOut: bh.to || "00:00" });
        addHours(e, midStr, bh.to || "00:00");
      });

      const dayLabel = `${day.label} ${day.date}`;
      if (morningWaiterPool.length < wantMw) warnings.push(`${dayLabel}: רק ${morningWaiterPool.length}/${wantMw} מלצרים זמינים בבוקר`);
      if (eveningWaiterPool.length < wantEw) warnings.push(`${dayLabel}: רק ${eveningWaiterPool.length}/${wantEw} מלצרים זמינים בערב`);
      if (kitchen.length > 0 && morningKitchenPool.length < wantMk) warnings.push(`${dayLabel}: רק ${morningKitchenPool.length}/${wantMk} עובדי מטבח זמינים בבוקר`);
      if (kitchen.length > 0 && eveningKitchenPool.length < wantEk) warnings.push(`${dayLabel}: רק ${eveningKitchenPool.length}/${wantEk} עובדי מטבח זמינים בערב`);

      if (bar.length === 0) {
        if (!warnings.some(w => w.includes("אין עובד בר"))) warnings.push("אין עובד בר מוגדר במערכת — לא ישובץ אף אחד למשמרות בר");
      } else if (eveningBarPool.length === 0) {
        warnings.push(`${dayLabel}: אין עובד בר זמין בערב`);
      }
      if (wash.length === 0) {
        if (!warnings.some(w => w.includes("אין עובד שטיפה"))) warnings.push("אין עובד שטיפה מוגדר במערכת — לא ישובץ אף אחד למשמרות שטיפה");
      } else if (morningWashPool.length === 0) {
        warnings.push(`${dayLabel}: אין עובד שטיפה זמין בבוקר`);
      }

      if (eveningBarPool.length > 0) {
        const e = eveningBarPool[0];
        dayList.push({ id: `${day.d}-bar-0`, ...e, timeIn: midStr, timeOut: bh.to || "02:00" });
        addHours(e, midStr, bh.to || "02:00");
      }
      if (morningWashPool.length > 0) {
        const e = morningWashPool[0];
        dayList.push({ id: `${day.d}-wash-0`, ...e, timeIn: bh.from, timeOut: midStr });
        addHours(e, bh.from, midStr);
      }

      schedule[day.d] = dayList;
    });

    const maxHours = aiConfig.maxHours || 48;
    Object.entries(weeklyHours).forEach(([name, hours]) => {
      if (hours > maxHours) warnings.push(`${name}: שובץ ל-${hours} שעות השבוע, מעל המגבלה (${maxHours})`);
    });

    return { schedule, warnings };
  }

  function startConversation() {
    const lc = getLastConfig();
    setTimeout(() => addMsg({ from: "ai", text: "שלום! אני אעזור לך לבנות את סידור שבוע 28.6–4.7 🗓️" }), 300);

    if (lc) {
      setTimeout(() => {
        addMsg({
          from: "ai",
          text: `שבוע שעבר: ${lc.morningWaiters} מלצרים בוקר, ${lc.eveningWaiters} מלצרים ערב, ${lc.morningKitchen} מטבח. רוצה אותן הגדרות?`,
          chips: ["כן, אותן הגדרות", "לא, בנה מחדש"],
        });
        setStep("use-last");
      }, 900);
    } else {
      setTimeout(() => askStep("morning-waiters"), 900);
    }
  }

  function askStep(s: Step) {
    const questions: Partial<Record<Step, { text: string; chips?: string[]; showCustomInput?: boolean }>> = {
      "morning-waiters": { text: "משמרת בוקר (08:00–16:00) — כמה מלצרים?", chips: NUM_CHIPS, showCustomInput: true },
      "morning-kitchen": { text: "כמה עובדי מטבח בבוקר?", chips: NUM_CHIPS, showCustomInput: true },
      "evening-waiters": { text: "משמרת ערב (16:00–00:00) — כמה מלצרים?", chips: NUM_CHIPS, showCustomInput: true },
      "evening-kitchen": { text: "כמה עובדי מטבח בערב?", chips: NUM_CHIPS, showCustomInput: true },
      "max-hours": { text: "כמה שעות מקסימום לעובד בשבוע?", chips: ["40", "48", "56"], showCustomInput: true },
      "special-event": { text: "האם יש אירוע מיוחד השבוע? (מסיבה, אירוע גדול, אשכנז ידוע...)", chips: ["לא, שגרה רגילה", "כן, יש אירוע"] },
      "friday-extra": { text: "ביום שישי — להוסיף מלצר נוסף?", chips: ["כן, תוסיף", "לא, מספיק"] },
    };
    const q = questions[s];
    if (!q) return;
    addMsg({ from: "ai", ...q });
    setStep(s);
  }

  function handleNumber(val: string, currentStep: Step) {
    const raw = val.replace(/[^0-9]/g, "");
    const n = parseInt(raw) || 1;
    addMsg({ from: "user", text: `${n}` });

    const nextMap: Partial<Record<Step, Step>> = {
      "morning-waiters": "morning-kitchen",
      "morning-kitchen": "evening-waiters",
      "evening-waiters": "evening-kitchen",
      "evening-kitchen": "max-hours",
      "max-hours": "special-event",
    };

    const configKeyMap: Partial<Record<Step, keyof Config>> = {
      "morning-waiters": "morningWaiters",
      "morning-kitchen": "morningKitchen",
      "evening-waiters": "eveningWaiters",
      "evening-kitchen": "eveningKitchen",
      "max-hours": "maxHours",
    };

    const key = configKeyMap[currentStep];
    if (key) setConfig(prev => ({ ...prev, [key]: n }));

    const next = nextMap[currentStep];
    if (next) setTimeout(() => askStep(next), 400);
  }

  function handleChip(chip: string) {
    if (chip === "5+") {
      setCustomNumStep(step);
      setCustomNumVal("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    const numSteps: Step[] = ["morning-waiters", "morning-kitchen", "evening-waiters", "evening-kitchen", "max-hours"];
    if (numSteps.includes(step) && /^\d+$/.test(chip)) {
      handleNumber(chip, step);
      return;
    }

    addMsg({ from: "user", text: chip });

    if (step === "use-last") {
      if (chip.startsWith("כן")) {
        const lc = getLastConfig()!;
        setConfig(lc);
        runChecks(lc as Config);
      } else {
        setTimeout(() => askStep("morning-waiters"), 500);
      }
      return;
    }

    if (step === "special-event") {
      const has = chip.startsWith("כן");
      setConfig(prev => ({ ...prev, specialEvent: has }));
      if (has) {
        setTimeout(() => {
          addMsg({ from: "ai", text: "מעולה, אקח זאת בחשבון ואוסיף עובד נוסף ביום שישי 🎉", status: "info" });
        }, 300);
      }
      setTimeout(() => askStep("friday-extra"), has ? 900 : 400);
      return;
    }

    if (step === "friday-extra") {
      const extra = chip.startsWith("כן");
      const finalConfig = { ...config, fridayExtra: extra, maxHours: config.maxHours || 48, specialEvent: config.specialEvent || false } as Config;
      setConfig(finalConfig);
      runChecks(finalConfig);
      return;
    }

    if (step === "done" && chip === "הצג בסידור") {
      onDone();
      router.push("/schedule?week=next");
      return;
    }

    setTimeout(() => {
      addMsg({ from: "ai", text: "הבנתי! אקח את זה בחשבון בסידור. יש עוד משהו שתרצה לציין?", status: "info" });
    }, 400);
  }

  function handleFreeText() {
    const text = inputVal.trim();
    if (!text) return;
    setInputVal("");

    if (customNumStep) {
      handleNumber(text, customNumStep);
      setCustomNumStep(null);
      return;
    }

    addMsg({ from: "user", text });

    const lower = text.toLowerCase();
    setTimeout(() => {
      if (lower.includes("חופש") || lower.includes("לא זמין")) {
        addMsg({ from: "ai", text: "✓ רשמתי — אביא בחשבון שעובד זה לא זמין ואחפש חלופה", status: "success" });
      } else if (lower.includes("אירוע") || lower.includes("מסיבה") || lower.includes("אירועים")) {
        addMsg({ from: "ai", text: "🎉 הבנתי שיש אירוע — אוסיף כיסוי נוסף לאותו יום", status: "info" });
        setConfig(prev => ({ ...prev, specialEvent: true }));
      } else if (lower.includes("שישי") && (lower.includes("סגור") || lower.includes("סגרנו"))) {
        addMsg({ from: "ai", text: "ברור! לא אשבץ עובדים ביום שישי", status: "success" });
      } else {
        addMsg({ from: "ai", text: "הבנתי, תודה! אקח זאת בחשבון. יש עוד משהו לפני שאבנה את הסידור?", status: "info" });
      }
    }, 400);
  }

  function runChecks(finalConfig: Config) {
    setStep("generating");

    setTimeout(() => {
      if (weekHolidays.length > 0) {
        weekHolidays.forEach(h => addMsg({ from: "ai", text: `⚠️ ${h.label} ${h.date} — ${h.name}. אשקול כיסוי מיוחד`, status: "warn" }));
      } else {
        addMsg({ from: "ai", text: "✓ אין חגים השבוע", status: "success" });
      }
    }, 500);

    setTimeout(() => {
      if (missingConstraints.length > 0) {
        addMsg({ from: "ai", text: `⚠️ ${missingConstraints.map(e => e.name).join(", ")} לא שלחו אילוצים עדיין — אניח שהם זמינים בכל המשמרות`, status: "warn" });
      } else {
        addMsg({ from: "ai", text: "✓ כל העובדים שלחו אילוצים", status: "success" });
      }
    }, 1100);

    setTimeout(() => {
      addMsg({ from: "ai", text: `✓ מגבלת שעות: ${finalConfig.maxHours || 48} שעות לעובד בשבוע`, status: "success" });
    }, 1600);

    setTimeout(() => addMsg({ from: "ai", text: "מייצר סידור..." }), 2300);

    setTimeout(() => {
      const { schedule, warnings } = generateSchedule(finalConfig);
      saveConfig(finalConfig);
      persistScheduleToDb(schedule);
      const totalShifts = Object.values(schedule).reduce((s, d) => s + d.length, 0);
      if (warnings.length > 0) {
        addMsg({ from: "ai", text: `⚠️ שים לב:\n${warnings.join("\n")}`, status: "warn" });
      }
      addMsg({
        from: "ai",
        text: `✅ הסידור מוכן! ${Object.keys(schedule).length} ימים, ${totalShifts} משמרות. רוצה לראות?`,
        chips: ["הצג בסידור"],
        status: "success",
      });
      setStep("done");
    }, 3500);
  }

  const isNumStep = ["morning-waiters", "morning-kitchen", "evening-waiters", "evening-kitchen", "max-hours"].includes(step);
  const isThinking = step === "generating";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="ai-chat-scroll flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.from === "user" ? "items-start" : "items-end"}`}>
            <div className="px-3.5 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-line"
              style={msg.from === "ai"
                ? {
                    background: msg.status === "warn" ? "rgba(251,191,36,0.12)" :
                                msg.status === "success" ? "rgba(52,211,153,0.12)" :
                                msg.status === "info" ? "rgba(249,115,22,0.1)" : "linear-gradient(150deg, #FFF7ED, #FFFFFF)",
                    border: msg.status === "warn" ? "1px solid rgba(251,191,36,0.3)" :
                            msg.status === "success" ? "1px solid rgba(52,211,153,0.3)" :
                            msg.status === "info" ? "1px solid rgba(249,115,22,0.25)" : "none",
                    color: "#1F2937",
                  }
                : { background: "rgba(255,255,255,0.08)", color: "#fff" }
              }>
              {msg.text}
            </div>
            {msg.chips && msg.chips.length > 0 && (
              <div className="flex flex-row gap-1.5 flex-wrap justify-end">
                {msg.chips.map(chip => (
                  <button key={chip}
                    onClick={() => handleChip(chip)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: "#F97316", color: "#fff" }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {customNumStep && (
          <div className="flex items-center gap-2 flex-row justify-end">
            <button onClick={() => setCustomNumStep(null)}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
              ביטול
            </button>
            <input ref={inputRef} type="number" value={customNumVal}
              onChange={e => setCustomNumVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && customNumVal) { handleNumber(customNumVal, customNumStep); setCustomNumStep(null); }}}
              placeholder="הזן מספר..."
              className="text-sm text-center rounded-xl px-3 py-2 outline-none"
              style={{ border: "1px solid rgba(249,115,22,0.4)", background: "rgba(255,255,255,0.06)", color: "#fff", width: 110 }} />
            <button onClick={() => { if (customNumVal) { handleNumber(customNumVal, customNumStep!); setCustomNumStep(null); }}}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#F97316" }}>
              <Send size={13} color="white" />
            </button>
          </div>
        )}

        {isThinking && <AiWalker />}

        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 flex-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={handleFreeText} disabled={step === "generating"}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#F97316", opacity: step === "generating" ? 0.4 : 1 }}>
          <Send size={15} color="#fff" />
        </button>
        <input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleFreeText(); }}
          placeholder={isNumStep && !customNumStep ? "לחץ על מספר למעלה או כתוב כאן..." : "כתוב הערה, בקשה מיוחדת..."}
          className="flex-1 text-sm text-right px-3.5 py-2.5 rounded-xl outline-none"
          style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}
        />
      </div>

      <style jsx>{`
        .ai-chat-scroll {
          scrollbar-color: #f97316 rgba(255, 255, 255, 0.06);
          scrollbar-width: thin;
        }
        .ai-chat-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .ai-chat-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
        }
        .ai-chat-scroll::-webkit-scrollbar-thumb {
          background: #f97316;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
