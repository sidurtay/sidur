import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { matchIntent, EXAMPLE_PROMPTS } from "@/lib/ai/intentMatcher";
import * as tools from "@/lib/ai/tools";

const HISTORY_LIMIT = 16;

type Ctx = { businessId: string; personId: string; isManager: boolean };
type ChatAction = { label: string; href: string };
type ChatReply = { text: string; action?: ChatAction };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function buildReply(message: string, ctx: Ctx, employeeName: string): Promise<string | ChatReply> {
  const match = matchIntent(message, ctx.isManager);
  const firstName = employeeName.split(" ")[0];

  switch (match.intent) {
    case "greeting":
      return pick([
        `היי ${firstName}! 👋 במה אפשר לעזור — שעות, משמרות, מי עובד היום? תגיד/י ואני אבדוק.`,
        `שלום ${firstName} 😊 במה אפשר לעזור — אפשר לשאול על שעות עבודה, משמרות קרובות, או לבקש חופש/החלפה.`,
        `הי ${firstName}! במה אפשר לעזור הפעם?`,
      ]);

    case "thanks":
      return pick(["בכל זמן! 🙌", "בשמחה 😊", "אין בעד מה, אני כאן אם תצטרך/י עוד משהו."]);

    case "faq":
      return match.faqAnswer || "";

    case "build_schedule":
      return {
        text: pick([
          "סבבה, בוא נבנה את שבוע 28.6–4.7 🪄 אני אשאל אותך כמה עובדים אתה צריך לכל משמרת ואתחשב באילוצים שהוגשו.",
          "אשמח לעזור עם הסידור 🪄 בוא נעבור על כמה שאלות קצרות לגבי כמות העובדים הדרושה לשבוע 28.6–4.7.",
        ]),
        action: { label: "בנה לי את הסידור 🪄", href: "/schedule/ai" },
      };

    case "tips_today": {
      const res = await tools.getTipsToday(ctx);
      if ("error" in res) return `הופ, נתקלתי בתקלה כשבדקתי את הטיפים 😕 (${res.error})`;
      if (!res.published) return "הטיפים של היום עדיין לא פורסמו — אעדכן אותך כשהם יהיו מוכנים 🕐";
      if (!res.worked) return "לא רשומה לך משמרת היום, אז אין טיפים לחלוקה 🤷";
      return `קיבלת בערך ₪${res.myShare} מטיפי משמרת ה${res.shiftLabel} של היום (${res.myHours} שעות) 💰`;
    }

    case "hours": {
      const res = await tools.getEmployeeHours(ctx, { month: match.month });
      if ("error" in res) return `הופ, נתקלתי בתקלה כשמשכתי את השעות 😕 (${res.error})`;
      if (res.shiftsCount === 0) return "לא מצאתי משמרות מתועדות בתקופה הזו.";
      return pick([
        `עבדת ${res.totalHours} שעות ב-${res.shiftsCount} משמרות${match.month ? "" : " (כל ההיסטוריה)"} 💪`,
        `סך הכל ${res.totalHours} שעות, על ${res.shiftsCount} משמרות${match.month ? "" : " (כל ההיסטוריה)"}.`,
      ]);
    }

    case "upcoming_shifts": {
      const res = await tools.getUpcomingShifts(ctx);
      if ("error" in res) return `הופ, נתקלתי בתקלה כשמשכתי את המשמרות 😕 (${res.error})`;
      if (res.shifts.length === 0) return pick(["אין לך משמרות קרובות מתוכננות כרגע — תהנה/י מהזמן הפנוי 😎", "כרגע לא רשומה לך אף משמרת קדימה."]);
      const intro = pick(["אלה המשמרות הקרובות שלך:", "הנה מה שיש לך קדימה:"]);
      return intro + "\n" + res.shifts.map(s => `• ${s.week} — יום ${s.day}, ${s.role} (${s.timeIn}–${s.timeOut})`).join("\n");
    }

    case "schedule_for_date": {
      const date = match.date!;
      const res = await tools.getScheduleForDate(ctx, date);
      if ("error" in res) return `הופ, נתקלתי בתקלה כשמשכתי את הסידור 😕 (${res.error})`;
      const label = match.dateLabel || "אז";
      if (res.working.length === 0) return `אין משמרות מתוכננות ל${label === "היום" ? "היום" : label} 🤷`;
      return `מי עובד ${label}:\n` + res.working.map(w => `• ${w.name} — ${w.role} (${w.timeIn}–${w.timeOut})`).join("\n");
    }

    case "swap_requests_list": {
      const res = await tools.getShiftSwapRequests(ctx);
      if ("error" in res) return `הופ, נתקלתי בתקלה כשמשכתי את הבקשות 😕 (${res.error})`;
      if (res.requests.length === 0) return "אין בקשות החלפה פתוחות כרגע ✨";
      return "בקשות החלפה פתוחות:\n" + res.requests.map(r =>
        `• ${r.requesterName} — ${r.role} (${r.timeIn}–${r.timeOut})${r.proposedToTakeOver ? ` · ${r.proposedToTakeOver} מבקש/ת לקחת` : ""}`
      ).join("\n");
    }

    case "create_swap": {
      const upcoming = await tools.getUpcomingShifts(ctx);
      if ("error" in upcoming || upcoming.shifts.length === 0) return "לא מצאתי משמרת קרובה שלך להחליף 🤔";
      const target = upcoming.shifts[0];
      const res = await tools.createShiftSwapRequest(ctx, { assignmentId: target.id, proposedPersonName: match.proposedPersonName });
      if ("error" in res) return `הבקשה לא נשלחה 😕 (${res.error})`;
      return pick([
        `שלחתי בקשת החלפה למשמרת ${target.day} (${target.timeIn}–${target.timeOut})${match.proposedPersonName ? ` עם ${match.proposedPersonName}` : ""} 📨 המנהל יראה אותה ויאשר.`,
        `סודר! בקשה להחלפת המשמרת ביום ${target.day} (${target.timeIn}–${target.timeOut})${match.proposedPersonName ? ` עם ${match.proposedPersonName}` : ""} יצאה למנהל 📨`,
      ]);
    }

    case "create_absence": {
      if (!match.date) return "באיזה תאריך תרצה/י לבקש להיעדר? אפשר לכתוב למשל \"חופש ב-1.7\" או \"חופש מחר\" 🗓️";
      const res = await tools.createAbsenceRequest(ctx, { date: match.date, reason: match.reason });
      if ("error" in res) return `הבקשה לא נשלחה 😕 (${res.error})`;
      return pick([
        `שלחתי למנהל בקשת היעדרות לתאריך ${match.date}${match.reason ? ` (${match.reason})` : ""} 📨 תקבל/י עדכון כשהיא תיענה.`,
        `רשמתי בקשת חופש ל-${match.date}${match.reason ? ` (${match.reason})` : ""} והעברתי למנהל לאישור 📨`,
      ]);
    }

    case "manager_pending": {
      const res = await tools.getPendingManagerNotifications(ctx);
      if ("error" in res) return `הופ, נתקלתי בתקלה כשמשכתי התראות 😕 (${res.error})`;
      const pending = res.notifications.filter(n => !n.read);
      if (pending.length === 0) return pick(["אין בקשות ממתינות כרגע. הכל נקי! 🎉", "הכל מטופל — אין כרגע שום דבר שמחכה לך 🎉"]);
      return "בקשות ממתינות:\n" + pending.map(n => `• ${n.title} — ${n.body}`).join("\n") + "\n\nאפשר לכתוב \"אשר את הבקשה האחרונה\" או \"דחה את הבקשה האחרונה\".";
    }

    case "approve_last":
    case "deny_last": {
      const approve = match.intent === "approve_last";
      const pendingRes = await tools.getMostRecentPendingNotification(ctx);
      if ("error" in pendingRes) return `שגיאה 😕 (${pendingRes.error})`;
      if (!pendingRes.notification) return "אין בקשה ממתינה לאשר/לדחות כרגע 🤷";
      const n = pendingRes.notification;
      const requestType = n.type === "absence_request" ? "absence" : "swap";
      const res = await tools.respondToRequest(ctx, { requestId: n.ref_id, requestType, approve });
      if ("error" in res) return `הפעולה נכשלה 😕 (${res.error})`;
      await tools.markNotificationRead(n.id);
      return approve
        ? pick([`✅ אישרתי: "${n.title}".`, `✅ בוצע — "${n.title}" אושרה.`])
        : pick([`🚫 דחיתי: "${n.title}".`, `🚫 בוצע — "${n.title}" נדחתה.`]);
    }

    default:
      return pick([
        "לא בטוח שהבנתי 🙂 אפשר למשל לשאול אותי:\n",
        "הממ, זה לא משהו שאני מכיר בינתיים — אבל אפשר לנסות:\n",
      ]) + EXAMPLE_PROMPTS.map(p => `• ${p}`).join("\n");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, message, isManager, employeeName } = await req.json();
    if (!businessId || !personId || !message?.trim()) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const ctx: Ctx = { businessId, personId, isManager: !!isManager };
    const result = await buildReply(message.trim(), ctx, employeeName || "");
    const reply = typeof result === "string" ? result : result.text;
    const action = typeof result === "string" ? undefined : result.action;

    const supabase = createServiceRoleClient();
    await supabase.from("ai_conversations").insert([
      { business_id: businessId, person_id: personId, role: "user", content: message.trim() },
      { business_id: businessId, person_id: personId, role: "assistant", content: reply },
    ]);

    return NextResponse.json({ success: true, reply, action });
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
