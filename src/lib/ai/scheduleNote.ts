import Anthropic from "@anthropic-ai/sdk";

// A small, separate Claude call from the employee-assistant one in claude.ts —
// that one is tool-calling and history-aware; this one just classifies a
// single free-text note typed into the AI schedule builder (e.g. "דנה לא
// יכולה ביום שלישי", "יש לנו אירוע גדול בשישי") into a structured intent the
// builder's UI can react to and fold into generateSchedule's config.
const MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

export type ScheduleNoteIntent =
  | { type: "unavailable"; personName: string | null; day: string | null }
  | { type: "event"; day: string | null }
  | { type: "friday_closed" }
  | { type: "other" };

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const SYSTEM_PROMPT = `אתה מסווג הודעות טקסט חופשי שמנהל עסק מקליד בזמן בניית סידור עבודה שבועי.
סווג את ההודעה לאחת מהקטגוריות הבאות והחזר אך ורק JSON תקין, בלי טקסט נוסף:

1. עובד לא זמין ביום מסוים: {"type":"unavailable","personName":"<שם או null>","day":"<אחד מ: ראשון,שני,שלישי,רביעי,חמישי,שישי,שבת, או null>"}
2. אירוע מיוחד/עומס חריג: {"type":"event","day":"<יום או null>"}
3. העסק סגור ביום שישי: {"type":"friday_closed"}
4. כל דבר אחר שלא קשור לזמינות עובדים, אירועים, או סגירת שישי: {"type":"other"}

דוגמאות שמות עובדים אפשריים יינתנו לך כדי לעזור בזיהוי שם, אך אם אין התאמה החזר null.
החזר תמיד JSON תקין בלבד, בפורמט אחד מהארבעה שלמעלה — שום דבר מעבר לזה.`;

export function isScheduleNoteAiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function classifyScheduleNote(text: string, employeeNames: string[]): Promise<ScheduleNoteIntent> {
  const c = getClient();
  if (!c) return { type: "other" };

  try {
    const response = await c.messages.create({
      model: MODEL,
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `שמות עובדים אפשריים: ${employeeNames.join(", ") || "(אין רשימה)"}\n\nההודעה: "${text}"`,
      }],
    });
    const block = response.content.find(b => b.type === "text");
    if (!block || block.type !== "text") return { type: "other" };

    // Haiku often wraps JSON in a ```json ... ``` fence despite the system
    // prompt asking for raw JSON — strip it before parsing instead of letting
    // it throw and silently fall back to "other" every time.
    const cleaned = block.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.type === "unavailable") {
      const day = DAY_NAMES.includes(parsed.day) ? parsed.day : null;
      const personName = typeof parsed.personName === "string" ? parsed.personName : null;
      return { type: "unavailable", personName, day };
    }
    if (parsed.type === "event") {
      const day = DAY_NAMES.includes(parsed.day) ? parsed.day : null;
      return { type: "event", day };
    }
    if (parsed.type === "friday_closed") return { type: "friday_closed" };
    return { type: "other" };
  } catch {
    return { type: "other" };
  }
}
