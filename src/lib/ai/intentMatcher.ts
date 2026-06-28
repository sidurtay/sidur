// Free, rule-based "understanding" layer — no external API, no cost.
// Matches a free-text message (Hebrew or English) against a wide net of
// phrasings for each supported intent, with light slot extraction (dates,
// names), plus a knowledge fallback over the in-app FAQ. Falls back to a
// friendly "didn't understand" with examples only when nothing else matches.

import { FAQ_ITEMS } from "@/lib/faq";

export type Intent =
  | "greeting"
  | "thanks"
  | "hours"
  | "upcoming_shifts"
  | "schedule_for_date"
  | "swap_requests_list"
  | "create_swap"
  | "create_absence"
  | "manager_pending"
  | "approve_last"
  | "deny_last"
  | "build_schedule"
  | "tips_today"
  | "faq"
  | "unknown";

export type MatchResult = {
  intent: Intent;
  month?: string;          // YYYY-MM, for "hours"
  weekScope?: boolean;      // true when "hours" should sum only the current week instead of all history
  tipsScope?: "today" | "week" | "month"; // for "tips_today" — which range to sum
  date?: string;            // YYYY-MM-DD, for "create_absence" / "schedule_for_date"
  dateLabel?: string;       // human-friendly label for the resolved date, e.g. "מחר", "יום שישי"
  reason?: string;          // free text after the date, for "create_absence"
  proposedPersonName?: string; // for "create_swap"
  faqAnswer?: string;       // for "faq"
};

const HEBREW_MONTHS: Record<string, number> = {
  "ינואר": 1, "פברואר": 2, "מרץ": 3, "אפריל": 4, "מאי": 5, "יוני": 6,
  "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12,
};

const TODAY = new Date("2026-06-23"); // matches the app-wide frozen "today" (Tuesday)
const TODAY_DOW = TODAY.getDay();

const WEEKDAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function norm(s: string) {
  return s.trim().toLowerCase();
}

function isoFromOffset(daysFromToday: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function nextWeekdayOffset(targetDow: number): number {
  return (targetDow - TODAY_DOW + 7) % 7;
}

function extractMonth(text: string): string | undefined {
  for (const [name, num] of Object.entries(HEBREW_MONTHS)) {
    if (text.includes(name)) return `2026-${String(num).padStart(2, "0")}`;
  }
  if (/החודש|this month/.test(text)) {
    return `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}`;
  }
  return undefined;
}

// Returns both the resolved ISO date and a human-friendly label for it —
// covers "today/tomorrow/day after tomorrow", any weekday name ("בשבת",
// "ביום שישי"), explicit DD.MM, and defaults to "today" when nothing else
// matches (so "מי עובד?" alone still resolves to something useful).
function extractDateAndLabel(text: string): { date: string; label: string } {
  if (/מחרתיים|day after tomorrow/.test(text)) {
    return { date: isoFromOffset(2), label: "מחרתיים" };
  }
  if (/מחר|\btomorrow\b/.test(text)) {
    return { date: isoFromOffset(1), label: "מחר" };
  }
  if (/היום|\btoday\b/.test(text)) {
    return { date: isoFromOffset(0), label: "היום" };
  }
  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    if (text.includes(WEEKDAY_NAMES[i])) {
      const offset = nextWeekdayOffset(i);
      return { date: isoFromOffset(offset), label: offset === 0 ? "היום" : `יום ${WEEKDAY_NAMES[i]}` };
    }
  }
  const m = text.match(/(\d{1,2})[./](\d{1,2})/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    return { date: `2026-${month}-${day}`, label: `${m[1]}.${m[2]}` };
  }
  return { date: isoFromOffset(0), label: "היום" };
}

// Same resolution, but returns undefined when no explicit date marker is
// present at all — used for create_absence, where "no date" should prompt
// the user instead of silently defaulting to today.
function extractExplicitDate(text: string): string | undefined {
  if (/מחרתיים|day after tomorrow/.test(text)) return isoFromOffset(2);
  if (/מחר|\btomorrow\b/.test(text)) return isoFromOffset(1);
  if (/היום|\btoday\b/.test(text)) return isoFromOffset(0);
  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    if (text.includes(WEEKDAY_NAMES[i])) return isoFromOffset(nextWeekdayOffset(i));
  }
  const m = text.match(/(\d{1,2})[./](\d{1,2})/);
  if (m) return `2026-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return undefined;
}

function extractName(text: string): string | undefined {
  const m = text.match(/(?:עם|להחליף עם|תחליף אותי עם|with)\s+([א-תa-zA-Z]+(?:\s+[א-תa-zA-Z]+)?)/);
  return m ? m[1].trim() : undefined;
}

function extractReason(text: string): string | undefined {
  const idx = text.search(/\d{1,2}[./]\d{1,2}|מחרתיים|מחר|tomorrow|היום|today|ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת/);
  if (idx === -1) return undefined;
  const after = text.slice(idx).replace(/^\S+\s*/, "").replace(/^(כי|בגלל|because|due to)\s*/i, "").trim();
  return after.length > 1 ? after : undefined;
}

const PATTERNS: { intent: Intent; test: RegExp }[] = [
  { intent: "greeting", test: /^(שלום|היי+|הי|הלו|אהלן|בוקר טוב|ערב טוב|מה קורה|מה המצב|מה נשמע|hi|hello|hey|yo)(\s|$|[!?.,])/ },
  { intent: "thanks", test: /^(תודה|תודה רבה|מעולה תודה|סבבה תודה|יאללה תודה|thanks|thank you|thx)(\s|$|[!?.,])/ },
  { intent: "manager_pending", test: /בקשות\s*(ש)?ממתינות|בקשות\s*(ש)?פתוחות|pending\s*requests|ממתין\s*לי|בקשות\s*חדשות|מה\s*מחכה\s*לי|יש\s*משהו\s*לאשר|מה\s*צריך\s*אישור/ },
  // Deliberately not a bare substring match on "אשר"/"דחה" — that would also
  // fire on unrelated words like "כאשר" ("when"), which contains "אשר".
  { intent: "approve_last", test: /^(אשר|תאשר|מאשר)$|אשר\s*(את\s*)?(ה)?בקשה|אשר\s*(את\s*)?האחרונה|\bapprove\b/ },
  { intent: "deny_last", test: /^(דחה|תדחה|דוחה)$|דחה\s*(את\s*)?(ה)?בקשה|דחה\s*(את\s*)?האחרונה|\bdeny\b|\breject\b/ },
  {
    // Manager-only: hand off to the full AI schedule-builder wizard at /schedule/ai
    // instead of trying to run that whole multi-step flow inside this lightweight chat.
    intent: "build_schedule",
    test: /(בנה|תבנה|לבנות|תכין|להכין|מכין|מכינה|מכינים|תעשה|לעשות|עושה|עושים|תסדר|לסדר|מסדר|מסדרים|תזמן)\s*(לי\s*)?(את\s*)?(ה)?(סידור|משמרות|עובדים)|בניית\s*סידור|בונה\s*(ה)?סידור|build.*schedule|auto.*schedule|schedule\s*builder/,
  },
  {
    intent: "create_absence",
    test: /חופש|היעדרות|לא\s*אגיע|לא\s*יכול\s*לבוא|לא\s*אוכל\s*להגיע|לא\s*מגיע|אני\s*חולה|מחלה|absence|day\s*off|sick\s*day|time\s*off|vacation|take.*off/,
  },
  {
    intent: "create_swap",
    test: /(להחליף|מחליף|להחלפה|יחליף|תחליף).*משמרת|משמרת.*(להחליף|מחליף|להחלפה)|צריך\s*מחליף|מישהו\s*יכול\s*לקחת\s*לי|swap.*shift|shift.*swap|cover\s*my\s*shift|can\s*someone\s*cover/,
  },
  { intent: "swap_requests_list", test: /בקשות?\s*(ה)?חלפה|רשימת\s*החלפות|swap\s*requests|list\s*swaps/ },
  {
    intent: "schedule_for_date",
    test: /מי\s*(ה)?עובד|מי\s*(ב)?משמרת|מי\s*בסידור|מי\s*מגיע|מי\s*יהיה\s*במשמרת|who.*work|who.*shift|who.*schedule/,
  },
  {
    intent: "upcoming_shifts",
    test: /משמרות?\s*(ה)?קרוב|מתי\s*(ה)?משמרת|מתי\s*אני\s*עובד|מתי\s*אני\s*במשמרת|איזה\s*משמרות\s*יש\s*לי|מה\s*המשמרות\s*שלי|upcoming\s*shifts|when.*i\s*work|my\s*shifts|next\s*shift/,
  },
  {
    intent: "hours",
    test: /כמה\s*שעות|שעות\s*עבדתי|דוח\s*שעות|כמה\s*עבדתי|סיכום\s*שעות|hours.*work|how\s*many\s*hours|total\s*hours|my\s*hours/,
  },
  {
    intent: "tips_today",
    test: /כמה\s*טיפים|טיפים\s*(שלי|היום|השבוע|החודש)|הטיפים\s*שלי|כמה\s*עשיתי\s*(בטיפים)?|my\s*tips|tips\s*today|how\s*much.*tips/,
  },
];

// "השבוע"/"this week" or "החודש"/"this month" anywhere in the message —
// shared by both "hours" (alongside the existing explicit-month extraction)
// and "tips_today" (which otherwise defaults to just today, same as before).
function extractWeekOrMonthScope(text: string): "week" | "month" | undefined {
  if (/השבוע|this week/.test(text)) return "week";
  if (/החודש|this month/.test(text)) return "month";
  return undefined;
}

function matchFaq(text: string, isManager: boolean): string | undefined {
  for (const item of FAQ_ITEMS) {
    if (item.audience === "manager" && !isManager) continue;
    if (item.keywords.some(k => text.includes(k))) return item.a;
  }
  return undefined;
}

export function matchIntent(rawText: string, isManager: boolean): MatchResult {
  const text = norm(rawText);

  for (const { intent, test } of PATTERNS) {
    if (!test.test(text)) continue;
    if ((intent === "manager_pending" || intent === "approve_last" || intent === "deny_last" || intent === "build_schedule") && !isManager) continue;

    if (intent === "hours") return { intent, month: extractMonth(text), weekScope: extractWeekOrMonthScope(text) === "week" };
    if (intent === "tips_today") return { intent, tipsScope: extractWeekOrMonthScope(text) || "today" };
    if (intent === "schedule_for_date") {
      const { date, label } = extractDateAndLabel(text);
      return { intent, date, dateLabel: label };
    }
    if (intent === "create_absence") {
      const date = extractExplicitDate(text);
      return { intent, date, reason: date ? extractReason(text) : undefined };
    }
    if (intent === "create_swap") return { intent, proposedPersonName: extractName(text) };
    return { intent };
  }

  const faqAnswer = matchFaq(text, isManager);
  if (faqAnswer) return { intent: "faq", faqAnswer };

  return { intent: "unknown" };
}

export const EXAMPLE_PROMPTS = [
  "כמה שעות עבדתי החודש?",
  "כמה שעות עבדתי השבוע?",
  "מתי המשמרות הקרובות שלי?",
  "מי עובד היום?",
  "מי עובד מחר?",
  "כמה טיפים עשיתי השבוע?",
  "כמה טיפים עשיתי החודש?",
  "אני רוצה לבקש חופש ב-1.7",
  "אני רוצה להחליף משמרת",
  "יש בקשות החלפה פתוחות?",
];
