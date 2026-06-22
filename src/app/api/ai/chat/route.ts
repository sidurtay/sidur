import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { AI_TOOLS } from "@/lib/ai/toolSchemas";
import * as tools from "@/lib/ai/tools";

const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 4;
const HISTORY_LIMIT = 16;

type ToolName = "get_employee_hours" | "get_upcoming_shifts" | "get_today_schedule" | "get_shift_swap_requests"
  | "create_shift_swap_request" | "create_absence_request" | "send_notification_to_manager"
  | "get_pending_manager_notifications" | "respond_to_request";

async function runTool(name: ToolName, args: Record<string, unknown>, ctx: { businessId: string; personId: string; isManager: boolean }) {
  switch (name) {
    case "get_employee_hours": return tools.getEmployeeHours(ctx, args as { month?: string });
    case "get_upcoming_shifts": return tools.getUpcomingShifts(ctx);
    case "get_today_schedule": return tools.getTodaySchedule(ctx);
    case "get_shift_swap_requests": return tools.getShiftSwapRequests(ctx);
    case "create_shift_swap_request": return tools.createShiftSwapRequest(ctx, args as { assignmentId: string; proposedPersonName?: string });
    case "create_absence_request": return tools.createAbsenceRequest(ctx, args as { date: string; reason?: string });
    case "send_notification_to_manager": return tools.sendNotificationToManager(ctx, args as { type: string; title: string; body: string });
    case "get_pending_manager_notifications": return tools.getPendingManagerNotifications(ctx);
    case "respond_to_request": return tools.respondToRequest(ctx, args as { requestId: string; requestType: "absence" | "swap"; approve: boolean });
    default: return { error: `כלי לא מוכר: ${name}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, message, isManager, employeeName, businessName } = await req.json();
    if (!businessId || !personId || !message?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ה-AI Assistant לא מוגדר עדיין (חסר ANTHROPIC_API_KEY בסביבת השרת)" }, { status: 500 });
    }

    const supabase = createServiceRoleClient();
    const ctx = { businessId, personId, isManager: !!isManager };

    // Pull recent history for conversational context
    const { data: historyRows } = await supabase
      .from("ai_conversations")
      .select("role, content")
      .eq("business_id", businessId)
      .eq("person_id", personId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    const history = (historyRows || []).reverse();

    const anthropic = new Anthropic({ apiKey });
    const today = new Date("2026-06-23"); // app-wide frozen "today", matches the rest of Sidur

    const systemPrompt = `את/ה העוזר/ת האישי/ת בתוך אפליקציית Sidur — אפליקציה לניהול עובדים, סידור עבודה, ונוכחות במסעדות ובתי קפה בישראל.
את/ה מדבר/ת עם ${employeeName || "משתמש"} מהעסק "${businessName || ""}", שהוא/היא ${ctx.isManager ? "מנהל/ת" : "עובד/ת"} בעסק.
היום בתוך האפליקציה הוא ${today.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}.
דבר/י בעברית בקצרה וברורה (אלא אם המשתמש כתב באנגלית — אז תענה/י באנגלית), בטון חברי ומקצועי.
תמיד תשתמש/י בכלים (tools) כדי לקבל מידע אמיתי או לבצע פעולות — אל תמציא/י נתונים.
אם פעולה נכשלת, הסבר/י בקצרה למה ומה אפשר לעשות.
${ctx.isManager ? "בתור מנהל/ת, את/ה יכול/ה גם לראות ולאשר/לדחות בקשות ממתינות." : "כעובד/ת, את/ה יכול/ה לבקש החלפת משמרת או היעדרות — הבקשה תישלח למנהל לאישור."}`;

    const messages: Anthropic.MessageParam[] = [
      ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message.trim() },
    ];

    let finalText = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages,
      });

      const toolUseBlocks = response.content.filter(b => b.type === "tool_use");
      const textBlocks = response.content.filter(b => b.type === "text");
      finalText = textBlocks.map(b => (b as Anthropic.TextBlock).text).join("\n");

      if (toolUseBlocks.length === 0) break;

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const tu = block as Anthropic.ToolUseBlock;
        let result: unknown;
        try {
          result = await runTool(tu.name as ToolName, tu.input as Record<string, unknown>, ctx);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "שגיאה לא צפויה" };
        }
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) });
      }
      messages.push({ role: "user", content: toolResults });

      if (response.stop_reason !== "tool_use") break;
    }

    if (!finalText) finalText = "סליחה, לא הצלחתי להבין את הבקשה. אפשר לנסות לנסח אחרת?";

    await supabase.from("ai_conversations").insert([
      { business_id: businessId, person_id: personId, role: "user", content: message.trim() },
      { business_id: businessId, person_id: personId, role: "assistant", content: finalText },
    ]);

    return NextResponse.json({ success: true, reply: finalText });
  } catch (err) {
    console.error("ai chat error:", err);
    return NextResponse.json({ error: "שגיאת שרת — נסה שוב" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const personId = req.nextUrl.searchParams.get("personId");
  if (!businessId || !personId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("role, content, created_at")
    .eq("business_id", businessId)
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, history: (data || []).reverse() });
}
