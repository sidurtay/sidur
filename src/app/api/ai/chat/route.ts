import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { matchIntent, EXAMPLE_PROMPTS } from "@/lib/ai/intentMatcher";
import * as tools from "@/lib/ai/tools";

const HISTORY_LIMIT = 16;

type Ctx = { businessId: string; personId: string; isManager: boolean };

async function buildReply(message: string, ctx: Ctx, employeeName: string): Promise<string> {
  const match = matchIntent(message, ctx.isManager);

  switch (match.intent) {
    case "greeting":
      return `שלום ${employeeName.split(" ")[0]}! איך אפשר לעזור? אפשר לשאול אותי על שעות עבודה, משמרות קרובות, או לבקש החלפה/היעדרות.`;

    case "hours": {
      const res = await tools.getEmployeeHours(ctx, { month: match.month });
      if ("error" in res) return `לא הצלחתי למשוך את השעות: ${res.error}`;
      if (res.shiftsCount === 0) return "לא מצאתי משמרות מתועדות בתקופה הזו.";
      return `עבדת ${res.totalHours} שעות ב-${res.shiftsCount} משמרות${match.month ? "" : " (כל ההיסטוריה)"}.`;
    }

    case "upcoming_shifts": {
      const res = await tools.getUpcomingShifts(ctx);
      if ("error" in res) return `לא הצלחתי למשוך את המשמרות: ${res.error}`;
      if (res.shifts.length === 0) return "אין לך משמרות קרובות מתוכננות כרגע.";
      return "המשמרות הקרובות שלך:\n" + res.shifts.map(s => `• ${s.week} — יום ${s.day}, ${s.role} (${s.timeIn}–${s.timeOut})`).join("\n");
    }

    case "today_schedule": {
      const res = await tools.getTodaySchedule(ctx);
      if ("error" in res) return `לא הצלחתי למשוך את הסידור: ${res.error}`;
      if (res.working.length === 0) return "אין משמרות מתוכננות היום.";
      return "מי עובד היום:\n" + res.working.map(w => `• ${w.name} — ${w.role} (${w.timeIn}–${w.timeOut})`).join("\n");
    }

    case "swap_requests_list": {
      const res = await tools.getShiftSwapRequests(ctx);
      if ("error" in res) return `לא הצלחתי למשוך בקשות: ${res.error}`;
      if (res.requests.length === 0) return "אין בקשות החלפה פתוחות כרגע.";
      return "בקשות החלפה פתוחות:\n" + res.requests.map(r =>
        `• ${r.requesterName} — ${r.role} (${r.timeIn}–${r.timeOut})${r.proposedToTakeOver ? ` · ${r.proposedToTakeOver} מבקש/ת לקחת` : ""}`
      ).join("\n");
    }

    case "create_swap": {
      const upcoming = await tools.getUpcomingShifts(ctx);
      if ("error" in upcoming || upcoming.shifts.length === 0) return "לא מצאתי משמרת קרובה שלך להחליף.";
      const target = upcoming.shifts[0];
      const res = await tools.createShiftSwapRequest(ctx, { assignmentId: target.id, proposedPersonName: match.proposedPersonName });
      if ("error" in res) return `הבקשה לא נשלחה: ${res.error}`;
      return `שלחתי בקשת החלפה למשמרת ${target.day} (${target.timeIn}–${target.timeOut})${match.proposedPersonName ? ` עם ${match.proposedPersonName}` : ""}. המנהל יראה אותה ויאשר.`;
    }

    case "create_absence": {
      if (!match.date) return "באיזה תאריך תרצה/י לבקש להיעדר? אפשר לכתוב למשל \"חופש ב-1.7\".";
      const res = await tools.createAbsenceRequest(ctx, { date: match.date, reason: match.reason });
      if ("error" in res) return `הבקשה לא נשלחה: ${res.error}`;
      return `שלחתי למנהל בקשת היעדרות לתאריך ${match.date}${match.reason ? ` (${match.reason})` : ""}. תקבל/י עדכון כשהיא תיענה.`;
    }

    case "manager_pending": {
      const res = await tools.getPendingManagerNotifications(ctx);
      if ("error" in res) return `לא הצלחתי למשוך התראות: ${res.error}`;
      const pending = res.notifications.filter(n => !n.read);
      if (pending.length === 0) return "אין בקשות ממתינות כרגע. 🎉";
      return "בקשות ממתינות:\n" + pending.map(n => `• ${n.title} — ${n.body}`).join("\n") + "\n\nאפשר לכתוב \"אשר את הבקשה האחרונה\" או \"דחה את הבקשה האחרונה\".";
    }

    case "approve_last":
    case "deny_last": {
      const approve = match.intent === "approve_last";
      const pendingRes = await tools.getMostRecentPendingNotification(ctx);
      if ("error" in pendingRes) return `שגיאה: ${pendingRes.error}`;
      if (!pendingRes.notification) return "אין בקשה ממתינה לאשר/לדחות.";
      const n = pendingRes.notification;
      const requestType = n.type === "absence_request" ? "absence" : "swap";
      const res = await tools.respondToRequest(ctx, { requestId: n.ref_id, requestType, approve });
      if ("error" in res) return `הפעולה נכשלה: ${res.error}`;
      await tools.markNotificationRead(n.id);
      return approve ? `אישרתי: "${n.title}".` : `דחיתי: "${n.title}".`;
    }

    default:
      return `לא הבנתי בדיוק 🙂 אפשר לנסות לשאול:\n` + EXAMPLE_PROMPTS.map(p => `• ${p}`).join("\n");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, message, isManager, employeeName } = await req.json();
    if (!businessId || !personId || !message?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const ctx: Ctx = { businessId, personId, isManager: !!isManager };
    const reply = await buildReply(message.trim(), ctx, employeeName || "");

    const supabase = createServiceRoleClient();
    await supabase.from("ai_conversations").insert([
      { business_id: businessId, person_id: personId, role: "user", content: message.trim() },
      { business_id: businessId, person_id: personId, role: "assistant", content: reply },
    ]);

    return NextResponse.json({ success: true, reply });
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
