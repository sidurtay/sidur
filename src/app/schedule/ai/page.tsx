"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Send } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { getEffectiveConfig, statusHasBucket } from "@/lib/businessConfig";
import { MAX_WEEKLY_HOURS, MAX_WORK_DAYS_PER_WEEK } from "@/lib/laborLaw";

type EmployeeRow = { personId: string; name: string; initials: string; role: string; color: string; textColor: string };
type RoleRow = { key: string; label: string };

type ConstraintsMap = Record<string, { availability: Record<number, string> }>;

// A role reading as "shift lead" gets asked about last and phrased slightly
// differently ("כמה אחמ\"שים" vs "כמה עובדי X") — purely cosmetic, every
// other role is treated identically regardless of what business this is.
const isLeadRole = (label: string) => /אחמ["׳]?ש/.test(label);

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

const DAY_LABEL_TO_INDEX: Record<string, number> = {
  ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6,
};

type Msg = {
  id: number;
  from: "ai" | "user";
  text: string;
  chips?: string[];
  showCustomInput?: boolean;
  status?: "info" | "warn" | "success";
};

// Per-role staffing target, keyed by the business's own role key — so a
// gym asks about "מאמנים"/"קבלה" and a restaurant asks about "מלצרים"/"מטבח",
// instead of one fixed restaurant-shaped question set for every business.
type Config = {
  counts: Record<string, { morning: number; evening: number }>;
  fridayExtra: boolean;
  maxHours: number;
  specialEvent: boolean;
};

// Fixed steps that exist regardless of the business's roles, plus a dynamic
// "r:<roleKey>:morning" / "r:<roleKey>:evening" step per actual role.
type Step = string;
const FIXED_STEPS = ["use-last", "max-hours", "special-event", "friday-extra", "free-chat", "generating", "done"] as const;

const LAST_CONFIG_KEY_PREFIX = "shiftpro_last_ai_config";

// Scoped per business — a manager who runs multiple branches (or this browser
// having been used for a different demo business) must never be offered
// another business's staffing config, since role keys and headcounts don't
// carry over at all.
function getLastConfig(businessId: string): Config | null {
  if (typeof window === "undefined" || !businessId) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(`${LAST_CONFIG_KEY_PREFIX}:${businessId}`) || "");
    // Ignore anything saved in the old fixed-shape format — this is just a
    // convenience shortcut, safe to fall back to asking fresh if it doesn't look right.
    if (parsed && typeof parsed === "object" && parsed.counts && typeof parsed.counts === "object") return parsed as Config;
    return null;
  } catch { return null; }
}
function saveConfig(businessId: string, c: Config) {
  if (!businessId) return;
  localStorage.setItem(`${LAST_CONFIG_KEY_PREFIX}:${businessId}`, JSON.stringify(c));
}

function emptyConfig(): Config {
  return { counts: {}, fridayExtra: false, maxHours: 48, specialEvent: false };
}

type ScheduleEntry = { id: string; personId: string; name: string; initials: string; role: string; color: string; textColor: string; timeIn: string; timeOut: string };

const NUM_CHIPS = ["1", "2", "3", "4", "5+"];

export default function AISchedule() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>("use-last");
  const [config, setConfig] = useState<Config>(emptyConfig());
  const [inputVal, setInputVal] = useState("");
  const [customNumStep, setCustomNumStep] = useState<Step | null>(null);
  const [customNumVal, setCustomNumVal] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Business config — loaded once from localStorage
  const [nextWeekDays, setNextWeekDays] = useState(ALL_NEXT_WEEK_DAYS.filter((_, i) => i < 6));
  const [bizHours, setBizHours] = useState<Record<number, { from: string; to: string }>>({});
  const [weekHolidays, setWeekHolidays] = useState<(typeof ALL_NEXT_WEEK_DAYS[0] & { name: string })[]>([]);
  const [constraintsMap, setConstraintsMap] = useState<ConstraintsMap>({});
  const [businessId, setBusinessId] = useState("");
  const [myPersonId, setMyPersonId] = useState("");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const missingConstraints = employees.filter(e => !constraintsMap[e.personId]);

  // Only ask about roles this business actually has employees in, and put
  // shift-lead-style roles (אחמ"ש) last — everything else keeps the order
  // the business defined its roles in.
  const staffedRoles = roles.filter(r => employees.some(e => e.role === r.key));
  const orderedRoles = [...staffedRoles].sort((a, b) => Number(isLeadRole(a.label)) - Number(isLeadRole(b.label)));

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
      if (s.role !== "manager") { router.replace("/schedule"); return; }
      setMyPersonId(s.personId || "");
    } catch {}
    setBusinessId(biz);

    if (!biz) { router.replace("/login"); return; }

    (async () => {
      try {
        const [empRes, rolesRes] = await Promise.all([
          fetch(`/api/employees?businessId=${biz}`).then(r => r.json()),
          fetch(`/api/roles?businessId=${biz}`).then(r => r.json()),
        ]);
        if (empRes.success) {
          setEmployees(empRes.employees.map((e: { id: string; name: string; initials: string; role: string; color: string; textColor: string }) => ({
            personId: e.id, name: e.name, initials: e.initials, role: e.role, color: e.color, textColor: e.textColor,
          })));
        }
        if (rolesRes.success) {
          setRoles(rolesRes.roles.map((r: { key: string; label: string }) => ({ key: r.key, label: r.label })));
        }
        const consRes = await fetch(`/api/constraints?businessId=${biz}&weekStart=${AI_WEEK_START}`).then(r => r.json());
        if (consRes.success) {
          const map: ConstraintsMap = {};
          consRes.people.forEach((p: { personId: string; availability: Record<number, string> }) => {
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
          fetch(`/api/schedule?id=${a.id}&callerId=${myPersonId}`, { method: "DELETE" })
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
              callerId: myPersonId,
            }),
          }));
        });
      });
      await Promise.all(posts);
    } catch {}
  }

  useEffect(() => {
    if (started.current) return;
    if (roles.length === 0 && employees.length === 0) return; // wait for the initial fetch before greeting
    started.current = true;
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, employees]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMsg(msg: Omit<Msg, "id">) {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }]);
  }

  function generateSchedule(aiConfig: Config) {
    const schedule: Record<number, ScheduleEntry[]> = {};
    const warnings: string[] = [];
    const weeklyHours: Record<string, number> = {};
    const weeklyDays: Record<string, Set<number>> = {};

    // An employee with no submitted constraints is treated as fully available
    // (and is already flagged separately as "missing constraints").
    function isAvailable(personId: string, dayIndex: number, part: "morning" | "evening"): boolean {
      const status = constraintsMap[personId]?.availability?.[dayIndex] ?? "all";
      return statusHasBucket(status, part);
    }

    function addHours(e: { name: string }, timeIn: string, timeOut: string, dayIndex: number) {
      const [hi] = timeIn.split(":").map(Number);
      let [ho] = timeOut.split(":").map(Number);
      if (ho <= hi) ho += 24;
      weeklyHours[e.name] = (weeklyHours[e.name] || 0) + (ho - hi);
      if (!weeklyDays[e.name]) weeklyDays[e.name] = new Set();
      weeklyDays[e.name].add(dayIndex);
    }

    nextWeekDays.forEach(day => {
      const isFriday = day.label === "שישי";
      const bh = bizHours[day.d] ?? { from: "08:00", to: "23:00" };
      // Split business day into morning/evening based on midpoint
      const [openH] = bh.from.split(":").map(Number);
      const [closeH] = bh.to.split(":").map(Number);
      const mid = openH + Math.floor((((closeH || 24) - openH) / 2));
      const midStr = `${String(mid).padStart(2, "0")}:00`;

      const dayList: ScheduleEntry[] = [];
      const dayLabel = `${day.label} ${day.date}`;

      orderedRoles.forEach((role, roleIdx) => {
        const roleEmployees = employees.filter(e => e.role === role.key);
        const morningPool = roleEmployees.filter(e => isAvailable(e.personId, day.d, "morning"));
        const eveningPool = roleEmployees.filter(e => !dayList.find(d => d.personId === e.personId) && isAvailable(e.personId, day.d, "evening"));

        const want = aiConfig.counts[role.key] || { morning: 0, evening: 0 };
        const wantMorning = want.morning + (isFriday && roleIdx === 0 && aiConfig.fridayExtra ? 1 : 0);
        const wantEvening = want.evening;

        morningPool.slice(0, wantMorning).forEach((e, i) => {
          dayList.push({ id: `${day.d}-${role.key}-m-${i}`, ...e, timeIn: bh.from, timeOut: midStr });
          addHours(e, bh.from, midStr, day.d);
        });
        eveningPool.filter(e => !dayList.find(d => d.personId === e.personId)).slice(0, wantEvening).forEach((e, i) => {
          dayList.push({ id: `${day.d}-${role.key}-e-${i}`, ...e, timeIn: midStr, timeOut: bh.to || "00:00" });
          addHours(e, midStr, bh.to || "00:00", day.d);
        });

        if (roleEmployees.length === 0) {
          if ((wantMorning > 0 || wantEvening > 0) && !warnings.some(w => w.includes(`אין עובד ${role.label}`))) {
            warnings.push(`אין עובד ${role.label} מוגדר במערכת — לא ישובץ אף אחד למשמרות ${role.label}`);
          }
          return;
        }
        if (morningPool.length < wantMorning) warnings.push(`${dayLabel}: רק ${morningPool.length}/${wantMorning} עובדי ${role.label} זמינים בבוקר`);
        if (eveningPool.length < wantEvening) warnings.push(`${dayLabel}: רק ${eveningPool.length}/${wantEvening} עובדי ${role.label} זמינים בערב`);
      });

      schedule[day.d] = dayList;
    });

    const maxHours = aiConfig.maxHours || 48;
    Object.entries(weeklyHours).forEach(([name, hours]) => {
      if (hours > maxHours) warnings.push(`${name}: שובץ ל-${hours} שעות השבוע, מעל המגבלה (${maxHours})`);
    });

    // Israeli labor-law awareness (חוק שעות עבודה ומנוחה) — informational only,
    // the AI never avoids building a schedule like this, just flags it so the
    // אחמ"ש/manager can decide with eyes open.
    Object.entries(weeklyHours).forEach(([name, hours]) => {
      if (hours > MAX_WEEKLY_HOURS) warnings.push(`${name}: ${Math.round(hours * 10) / 10} שעות השבוע — מעל שבוע העבודה הרגיל בחוק (${MAX_WEEKLY_HOURS} שעות)`);
    });
    Object.entries(weeklyDays).forEach(([name, days]) => {
      if (days.size > MAX_WORK_DAYS_PER_WEEK) warnings.push(`${name}: משובץ/ת ${days.size} ימים השבוע — החוק דורש לפחות יום מנוחה שבועי אחד`);
    });

    return { schedule, warnings };
  }

  function startConversation() {
    const lc = getLastConfig(businessId);
    setTimeout(() => addMsg({ from: "ai", text: "היי! אני כאן כדי לעזור לך לבנות את סידור שבוע 28.6–4.7 🗓️" }), 300);

    if (orderedRoles.length === 0) {
      setTimeout(() => addMsg({
        from: "ai",
        text: "לא מצאתי עדיין עובדים משובצים לתפקידים בעסק שלך — כדאי להוסיף עובדים ותפקידים לפני שנבנה סידור יחד.",
        status: "warn",
      }), 900);
      return;
    }

    if (lc) {
      setTimeout(() => {
        addMsg({
          from: "ai",
          text: "יש לי את ההגדרות שקבעת בפעם הקודמת. רוצה להשתמש באותן כמויות עובדים לכל תפקיד?",
          chips: ["כן, אותן הגדרות", "לא, בוא נקבע מחדש"],
        });
        setStep("use-last");
      }, 900);
    } else {
      setTimeout(() => askStep(numStepId(orderedRoles[0].key, "morning")), 900);
    }
  }

  function numStepId(roleKey: string, part: "morning" | "evening"): Step {
    return `r:${roleKey}:${part}`;
  }
  function parseNumStep(s: Step): { roleKey: string; part: "morning" | "evening" } | null {
    if (!s.startsWith("r:")) return null;
    const rest = s.slice(2);
    const sep = rest.lastIndexOf(":");
    return { roleKey: rest.slice(0, sep), part: rest.slice(sep + 1) as "morning" | "evening" };
  }

  // Ordered list of every role-count question for this business's actual
  // roles — walked in sequence, skipped only if a business somehow ends up
  // with zero employees in a role by the time we get there.
  const roleStepOrder: Step[] = orderedRoles.flatMap(r => [numStepId(r.key, "morning"), numStepId(r.key, "evening")]);

  function nextStepAfter(s: Step): Step {
    if (s === "max-hours") return "special-event";
    const idx = roleStepOrder.indexOf(s);
    if (idx === -1 || idx === roleStepOrder.length - 1) return "max-hours";
    return roleStepOrder[idx + 1];
  }

  function roleLabelForStep(s: Step): { label: string; part: "morning" | "evening" } | null {
    const parsed = parseNumStep(s);
    if (!parsed) return null;
    const role = orderedRoles.find(r => r.key === parsed.roleKey);
    return role ? { label: role.label, part: parsed.part } : null;
  }

  function askStep(s: Step) {
    const parsed = roleLabelForStep(s);
    if (parsed) {
      const isFirstQuestion = s === roleStepOrder[0];
      const lead = isLeadRole(parsed.label);
      let text: string;
      if (parsed.part === "morning") {
        const rangeHint = isFirstQuestion && nextWeekDays[0] ? ` (${bizHours[nextWeekDays[0].d]?.from || "08:00"} עד אמצע היום)` : "";
        text = lead ? `כמה ${parsed.label}ים דרושים במשמרת הבוקר?` : `משמרת בוקר${rangeHint} — כמה עובדי ${parsed.label} צריך?`;
      } else {
        text = lead ? `וכמה ${parsed.label}ים במשמרת הערב?` : `וכמה עובדי ${parsed.label} במשמרת הערב?`;
      }
      addMsg({ from: "ai", text, chips: NUM_CHIPS, showCustomInput: true });
      setStep(s);
      return;
    }

    const questions: Partial<Record<string, { text: string; chips?: string[]; showCustomInput?: boolean }>> = {
      "max-hours": { text: "כדי לשמור על איזון הוגן — כמה שעות מקסימום לעובד בשבוע?", chips: ["40", "48", "56"], showCustomInput: true },
      "special-event": { text: "יש אירוע מיוחד השבוע? (מסיבה, אירוע גדול, אשכנז ידוע...)", chips: ["לא, שגרה רגילה", "כן, יש אירוע"] },
      "friday-extra": { text: "יום שישי בדרך כלל עמוס יותר — להוסיף עובד נוסף למשמרת הבוקר?", chips: ["כן, תוסיף", "לא, מספיק"] },
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

    const parsed = parseNumStep(currentStep);
    if (parsed) {
      setConfig(prev => ({
        ...prev,
        counts: {
          ...prev.counts,
          [parsed.roleKey]: { ...(prev.counts[parsed.roleKey] || { morning: 0, evening: 0 }), [parsed.part]: n },
        },
      }));
    } else if (currentStep === "max-hours") {
      setConfig(prev => ({ ...prev, maxHours: n }));
    }

    const next = nextStepAfter(currentStep);
    setTimeout(() => askStep(next), 400);
  }

  function handleChip(chip: string) {
    if (chip === "5+") {
      setCustomNumStep(step);
      setCustomNumVal("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    if ((roleStepOrder.includes(step) || step === "max-hours") && /^\d+$/.test(chip)) {
      handleNumber(chip, step);
      return;
    }

    addMsg({ from: "user", text: chip });

    if (step === "use-last") {
      if (chip.startsWith("כן")) {
        const lc = getLastConfig(businessId) || emptyConfig();
        setConfig(lc);
        runChecks(lc);
      } else {
        setTimeout(() => askStep(roleStepOrder[0]), 500);
      }
      return;
    }

    if (step === "special-event") {
      const has = chip.startsWith("כן");
      setConfig(prev => ({ ...prev, specialEvent: has }));
      if (has) {
        setTimeout(() => {
          addMsg({ from: "ai", text: "מעולה, אקח את זה בחשבון ואוסיף כיסוי נוסף ביום שישי 🎉", status: "info" });
        }, 300);
      }
      setTimeout(() => askStep("friday-extra"), has ? 900 : 400);
      return;
    }

    if (step === "friday-extra") {
      const extra = chip.startsWith("כן");
      const finalConfig = { ...config, fridayExtra: extra };
      setConfig(finalConfig);
      runChecks(finalConfig);
      return;
    }

    // Free chat fallback
    setTimeout(() => {
      addMsg({ from: "ai", text: "הבנתי! אקח את זה בחשבון בסידור. יש עוד משהו לציין?", status: "info" });
    }, 400);
  }

  async function handleFreeText() {
    const text = inputVal.trim();
    if (!text) return;
    setInputVal("");

    if (customNumStep) {
      handleNumber(text, customNumStep);
      setCustomNumStep(null);
      return;
    }

    addMsg({ from: "user", text });

    let intent: import("@/lib/ai/scheduleNote").ScheduleNoteIntent = { type: "other" };
    try {
      const res = await fetch("/api/ai/schedule-note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, employeeNames: employees.map(e => e.name) }),
      }).then(r => r.json());
      if (res.success) intent = res.intent;
    } catch {}

    if (intent.type === "unavailable") {
      const match = intent.personName ? employees.find(e => e.name.includes(intent.personName!) || intent.personName!.includes(e.name)) : undefined;
      const dayIndex = intent.day ? DAY_LABEL_TO_INDEX[intent.day] : undefined;
      if (match && dayIndex !== undefined) {
        setConstraintsMap(prev => ({
          ...prev,
          [match.personId]: { availability: { ...prev[match.personId]?.availability, [dayIndex]: "off" } },
        }));
        addMsg({ from: "ai", text: `✓ רשמתי — ${match.name} לא זמין/ה ביום ${intent.day}, לא אשבץ אותו/ה אז`, status: "success" });
      } else if (match) {
        addMsg({ from: "ai", text: `לא הבנתי לאיזה יום ${match.name} לא זמין/ה — אפשר לציין יום בשם (למשל "שלישי")?`, status: "info" });
      } else {
        addMsg({ from: "ai", text: "לא זיהיתי איזה עובד/ת לא זמין/ה — אפשר לכתוב את השם המלא?", status: "info" });
      }
      return;
    }

    if (intent.type === "event") {
      setConfig(prev => ({ ...prev, specialEvent: true }));
      addMsg({ from: "ai", text: intent.day ? `🎉 הבנתי שיש אירוע ביום ${intent.day} — אוסיף כיסוי נוסף לאותו יום` : "🎉 הבנתי שיש אירוע — אוסיף כיסוי נוסף השבוע", status: "info" });
      return;
    }

    if (intent.type === "friday_closed") {
      addMsg({ from: "ai", text: "ברור! אני מתעד את זה, אבל שים/י לב שסגירת יום שישי בפועל נקבעת בהגדרות שעות הפעילות של העסק", status: "info" });
      return;
    }

    addMsg({ from: "ai", text: "לא זיהיתי הוראה ספציפית לגבי הסידור. אפשר לציין למשל \"דנה לא זמינה ביום שלישי\" או \"יש אירוע גדול בסוף השבוע\"", status: "info" });
  }

  function runChecks(finalConfig: Config) {
    setStep("generating");

    setTimeout(() => {
      if (weekHolidays.length > 0) {
        weekHolidays.forEach(h => addMsg({ from: "ai", text: `⚠️ ${h.label} ${h.date} — ${h.name}. כדאי לשקול כיסוי מיוחד`, status: "warn" }));
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

    setTimeout(() => addMsg({ from: "ai", text: "בונה את הסידור..." }), 2300);

    setTimeout(() => {
      const { schedule, warnings } = generateSchedule(finalConfig);
      saveConfig(businessId, finalConfig);
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

  const isNumStep = roleStepOrder.includes(step) || step === "max-hours";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--gray-bg)" }}>
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 flex items-center gap-3 flex-row"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()}>
          <ArrowRight size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
        <div className="flex-1 text-right">
          <p className="text-base font-semibold">בניית סידור עם AI</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>שבוע 28.6–4.7</p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: "var(--navy)", color: "#fff" }}>AI</div>
        <Logo size={22} />
      </div>

      {/* Chat */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto" style={{ paddingBottom: 120 }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col gap-2 ${msg.from === "user" ? "items-start" : "items-end"}`}>
            <div className="px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-line"
              style={msg.from === "ai"
                ? {
                    background: msg.status === "warn" ? "var(--amber-light)" :
                                msg.status === "success" ? "var(--green-light)" :
                                msg.status === "info" ? "var(--blue-light)" : "var(--surface)",
                    border: msg.status === "warn" ? "1px solid #EBC395" :
                            msg.status === "success" ? "1px solid #A8D9BB" :
                            msg.status === "info" ? "1px solid var(--blue-border)" : "1px solid var(--border)",
                    color: "var(--text-main)", borderBottomRightRadius: 6,
                  }
                : { background: "var(--navy)", color: "#fff", borderBottomLeftRadius: 6 }
              }>
              {msg.text}
            </div>
            {msg.chips && msg.chips.length > 0 && (
              <div className="flex flex-row gap-2 flex-wrap justify-end">
                {msg.chips.map(chip => (
                  <button key={chip}
                    onClick={() => step === "done" ? router.push("/schedule?week=next") : handleChip(chip)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: "var(--navy)", color: "#fff" }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Custom number inline input */}
        {customNumStep && (
          <div className="flex items-center gap-2 flex-row justify-end">
            <button onClick={() => setCustomNumStep(null)}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: "var(--gray-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              ביטול
            </button>
            <input ref={inputRef} type="number" value={customNumVal}
              onChange={e => setCustomNumVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && customNumVal) { handleNumber(customNumVal, customNumStep); setCustomNumStep(null); }}}
              placeholder="הזן מספר..."
              className="text-sm text-center rounded-xl px-3 py-2"
              style={{ border: "1px solid var(--blue)", background: "var(--surface)", width: 120 }} />
            <button onClick={() => { if (customNumVal) { handleNumber(customNumVal, customNumStep!); setCustomNumStep(null); }}}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--navy)" }}>
              <Send size={13} color="white" />
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar — always visible */}
      <div className="fixed bottom-16 right-0 left-0 px-4 py-2 bg-white"
        style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 flex-row">
          <button onClick={handleFreeText}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: step === "done" ? "var(--gray-bg)" : "var(--navy)", opacity: step === "generating" ? 0.5 : 1 }}>
            <Send size={15} color={step === "done" ? "var(--text-secondary)" : "white"} />
          </button>
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleFreeText(); }}
            placeholder={isNumStep && !customNumStep ? "לחץ על מספר למעלה או כתוב כאן..." : "כתוב הערה, בקשה מיוחדת..."}
            className="flex-1 text-sm text-right px-3 py-2 rounded-xl"
            style={{ border: "1px solid var(--border)", background: "var(--gray-bg)" }}
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
