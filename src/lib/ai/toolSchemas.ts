import type Anthropic from "@anthropic-ai/sdk";

// JSON-schema tool definitions handed to Claude. Kept in one place so the
// route handler and the dispatcher (tools.ts) can't drift out of sync.
export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_employee_hours",
    description: "מחזיר כמה שעות העובד הנוכחי עבד, בהתבסס על דיווחי כניסה/יציאה מאושרים בפועל. אפשר לסנן לחודש מסוים.",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "פורמט YYYY-MM, לדוגמה 2026-06. אם לא מצוין — כל ההיסטוריה." },
      },
    },
  },
  {
    name: "get_upcoming_shifts",
    description: "מחזיר את המשמרות הקרובות (השבוע הנוכחי מהיום והלאה + שבוע הבא) של העובד הנוכחי.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_today_schedule",
    description: "מחזיר את כל העובדים המשובצים היום בעסק.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_shift_swap_requests",
    description: "מחזיר בקשות החלפת משמרת פתוחות (ממתינות). למנהל מחזיר את כל הבקשות בעסק, לעובד רק את הבקשות שלו.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_shift_swap_request",
    description: "פותח בקשת החלפת משמרת חדשה למשמרת של העובד הנוכחי. דורש assignmentId של המשמרת — אם אין אותו, השתמש קודם ב-get_upcoming_shifts כדי למצוא אותו.",
    input_schema: {
      type: "object",
      properties: {
        assignmentId: { type: "string", description: "המזהה (id) של המשמרת מתוך get_upcoming_shifts" },
        proposedPersonName: { type: "string", description: "שם העובד שמוצע לקחת את המשמרת, אם יש" },
      },
      required: ["assignmentId"],
    },
  },
  {
    name: "create_absence_request",
    description: "שולח בקשת היעדרות למנהל בתאריך מסוים.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "תאריך בפורמט YYYY-MM-DD" },
        reason: { type: "string", description: "סיבת ההיעדרות, אופציונלי" },
      },
      required: ["date"],
    },
  },
  {
    name: "send_notification_to_manager",
    description: "שולח התראה כללית למנהל, לכל דבר שלא מתאים לבקשת החלפה או היעדרות.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "סוג ההתראה, מילה אחת קצרה באנגלית" },
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "get_pending_manager_notifications",
    description: "מנהל בלבד — מחזיר את ההתראות האחרונות שממתינות למנהל (בקשות החלפה/היעדרות וכו').",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "respond_to_request",
    description: "מנהל בלבד — מאשר או דוחה בקשת היעדרות או בקשת החלפת משמרת.",
    input_schema: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        requestType: { type: "string", enum: ["absence", "swap"] },
        approve: { type: "boolean" },
      },
      required: ["requestId", "requestType", "approve"],
    },
  },
];
