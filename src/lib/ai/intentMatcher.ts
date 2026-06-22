// Free, rule-based "understanding" layer — no external API, no cost.
// Matches a free-text message (Hebrew or English) against a wide net of
// phrasings for each supported intent, with light slot extraction (dates,
// names). Falls back to a helpful "didn't understand" with examples.

export type Intent =
  | "greeting"
  | "hours"
  | "upcoming_shifts"
  | "today_schedule"
  | "swap_requests_list"
  | "create_swap"
  | "create_absence"
  | "manager_pending"
  | "approve_last"
  | "deny_last"
  | "unknown";

export type MatchResult = {
  intent: Intent;
  month?: string;          // YYYY-MM, for "hours"
  date?: string;            // YYYY-MM-DD, for "create_absence"
  reason?: string;          // free text after the date, for "create_absence"
  proposedPersonName?: string; // for "create_swap"
};

const HEBREW_MONTHS: Record<string, number> = {
  "ינואר": 1, "פברואר": 2, "מרץ": 3, "אפריל": 4, "מאי": 5, "יוני": 6,
  "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12,
};

const TODAY = new Date("2026-06-23"); // matches the app-wide frozen "today"

function norm(s: string) {
  return s.trim().toLowerCase();
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

function extractDate(text: string): string | undefined {
  if (/\bמחר\b|\btomorrow\b/.test(text)) {
    const d = new Date(TODAY); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/\bהיום\b|\btoday\b/.test(text)) {
    return TODAY.toISOString().slice(0, 10);
  }
  // DD.MM or DD/MM (assume current app year)
  const m = text.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    return `2026-${month}-${day}`;
  }
  return undefined;
}

function extractName(text: string): string | undefined {
  const m = text.match(/(?:עם|להחליף עם|תחליף אותי עם|with)\s+([א-תa-zA-Z]+(?:\s+[א-תa-zA-Z]+)?)/);
  return m ? m[1].trim() : undefined;
}

function extractReason(text: string, dateMatch: string): string | undefined {
  // Best-effort: text after the date token, trimmed of connector words
  const idx = text.search(/\d{1,2}[./]\d{1,2}|מחר|tomorrow|היום|today/);
  if (idx === -1) return undefined;
  const after = text.slice(idx).replace(/^\S+\s*/, "").replace(/^(כי|בגלל|because|due to)\s*/i, "").trim();
  return after.length > 1 ? after : undefined;
}

const PATTERNS: { intent: Intent; test: RegExp }[] = [
  { intent: "greeting", test: /^(שלום|היי|הי|hi|hello|hey)\b/ },
  { intent: "manager_pending", test: /בקשות\s+(ש)?ממתינות|בקשות\s+(ש)?פתוחות|pending\s*requests|ממתין\s+לי|בקשות\s+חדשות/ },
  { intent: "approve_last", test: /אשר|approve/ },
  { intent: "deny_last", test: /דחה|deny|reject/ },
  { intent: "create_absence", test: /חופש|היעדרות|לא\s*אגיע|לא\s*יכול\s*לבוא|לא\s*אוכל\s*להגיע|absence|day\s*off|take.*off/ },
  { intent: "create_swap", test: /(להחליף|מחליף|להחלפה).*משמרת|משמרת.*(להחליף|מחליף|להחלפה)|swap.*shift|shift.*swap/ },
  { intent: "swap_requests_list", test: /בקשות?\s*ה?חלפה|swap\s*requests/ },
  { intent: "today_schedule", test: /מי\s+עובד\s+היום|מי\s+(ב)?משמרת\s+היום|who.*work.*today|today.*schedule/ },
  { intent: "upcoming_shifts", test: /משמרות?\s*(ה)?קרוב|מתי\s+(ה)?משמרת|מתי\s+אני\s+עובד|upcoming\s*shifts|when.*i\s*work|my\s*shifts/ },
  { intent: "hours", test: /כמה\s*שעות|שעות\s*עבדתי|דוח\s*שעות|hours.*work|how\s*many\s*hours/ },
];

export function matchIntent(rawText: string, isManager: boolean): MatchResult {
  const text = norm(rawText);

  for (const { intent, test } of PATTERNS) {
    if (!test.test(text)) continue;
    if ((intent === "manager_pending" || intent === "approve_last" || intent === "deny_last") && !isManager) continue;

    if (intent === "hours") return { intent, month: extractMonth(text) };
    if (intent === "create_absence") {
      const date = extractDate(text);
      return { intent, date, reason: date ? extractReason(text, date) : undefined };
    }
    if (intent === "create_swap") return { intent, proposedPersonName: extractName(text) };
    return { intent };
  }

  return { intent: "unknown" };
}

export const EXAMPLE_PROMPTS = [
  "כמה שעות עבדתי החודש?",
  "מתי המשמרות הקרובות שלי?",
  "מי עובד היום?",
  "אני רוצה לבקש חופש ב-1.7",
  "אני רוצה להחליף משמרת",
];
