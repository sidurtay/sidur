import Anthropic from "@anthropic-ai/sdk";
import * as tools from "./tools";

// Haiku 4.5 — plenty capable for "understand a free-text question, pick a
// read-only tool, answer in Hebrew" at a fraction of Sonnet/Opus cost. This
// only runs as the fallback when the free regex matcher in intentMatcher.ts
// can't classify the message — most traffic never reaches here.
const MODEL = "claude-haiku-4-5";
const MAX_TOOL_ROUNDS = 4;

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

export function isClaudeConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

type ToolCtx = { businessId: string; personId: string; isManager: boolean };

// Deliberately read-only. Mutating actions (swap/absence requests, approvals)
// stay on the deterministic regex path in route.ts — that path is already
// correct, audited, and notifies managers; letting an LLM free-form trigger
// a business mutation isn't worth the risk for what this fallback is for
// (answering questions the rigid matcher didn't recognize).
const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "get_upcoming_shifts",
    description: "מחזיר את המשמרות הקרובות (השבוע ושבוע הבא) של העובד ששואל.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_schedule_for_date",
    description: "מחזיר מי עובד בתאריך נתון, כולל תפקיד ושעות.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "תאריך בפורמט YYYY-MM-DD" } },
      required: ["date"],
    },
  },
  {
    name: "get_employee_hours",
    description: "מחזיר סך שעות העבודה והמשמרות של העובד ששואל, אופציונלי לחודש מסוים.",
    input_schema: {
      type: "object",
      properties: { month: { type: "string", description: "חודש בפורמט YYYY-MM, אופציונלי — אם לא מצוין מחזיר את כל ההיסטוריה" } },
      required: [],
    },
  },
  {
    name: "get_shift_swap_requests",
    description: "מחזיר בקשות החלפת משמרת פתוחות — של העובד עצמו אם הוא לא מנהל, או של כל העסק אם הוא מנהל.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_tips_today",
    description: "מחזיר את חלקו של העובד בטיפים של היום, אם הם כבר פורסמו.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_pending_manager_notifications",
    description: "מנהלים בלבד — מחזיר בקשות והתראות שממתינות לאישור/דחייה של המנהל.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

async function runTool(name: string, input: Record<string, unknown>, ctx: ToolCtx) {
  switch (name) {
    case "get_upcoming_shifts": return tools.getUpcomingShifts(ctx);
    case "get_schedule_for_date": return tools.getScheduleForDate(ctx, String(input.date || ""));
    case "get_employee_hours": return tools.getEmployeeHours(ctx, { month: input.month ? String(input.month) : undefined });
    case "get_shift_swap_requests": return tools.getShiftSwapRequests(ctx);
    case "get_tips_today": return tools.getTipsToday(ctx);
    case "get_pending_manager_notifications":
      if (!ctx.isManager) return { error: "רק מנהל יכול לראות את זה" };
      return tools.getPendingManagerNotifications(ctx);
    default:
      return { error: "כלי לא מוכר" };
  }
}

const SYSTEM_PROMPT = `את/ה העוזר/ת הדיגיטלי/ת של Sidur, אפליקציה לניהול סידור עבודה במסעדות ובתי קפה בישראל.
ענה/י בעברית, בקצרה ובאופן ידידותי (אפשר אימוג'ים קלילים, לא בכל משפט).
יש לך כלים לבדוק מידע אמיתי על המשתמש שמדבר איתך (שעות, משמרות, טיפים, בקשות פתוחות) — תמיד תשתמש/י בהם במקום לנחש או להמציא מידע.
את/ה לא יכול/ה לבצע פעולות שמשנות מידע (לשלוח בקשת החלפה/חופש, לאשר, לדחות) — רק לבדוק ולהציג. אם המשתמש מבקש לבצע פעולה כזו, הסבר/י בעדינות שצריך לעשות את זה מתוך המסכים הרגילים של האפליקציה.`;

// Returns null (not an empty string) when Claude isn't configured or the
// call fails — callers fall back to the existing canned "didn't understand"
// response rather than breaking on a missing key.
export async function askClaude(
  message: string,
  ctx: ToolCtx,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string | null> {
  const c = getClient();
  if (!c) return null;

  const messages: Anthropic.MessageParam[] = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await c.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const textBlock = response.content.find(b => b.type === "text");
        return textBlock && "text" in textBlock ? textBlock.text : null;
      }

      messages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await runTool(block.name, block.input as Record<string, unknown>, ctx);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
    return null;
  } catch (err) {
    console.error("claude chat error:", err);
    return null;
  }
}
