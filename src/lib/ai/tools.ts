import { createServiceRoleClient } from "@/lib/supabase/server";
import { calcHours } from "@/lib/shiftData";

// Matches the convention used across the rest of the app (schedule, tips, AI scheduler):
// a frozen "current" week and the "next" week it's building toward.
export const CURRENT_WEEK_START = "2026-06-21";
export const NEXT_WEEK_START = "2026-06-28";
export const TODAY_DAY_OF_WEEK = 2; // Tuesday, 23.6
export const TODAY_DATE = "2026-06-23";

type ToolCtx = { businessId: string; personId: string; isManager: boolean };

// Any date's week_start (the Sunday of its calendar week, matching the DB
// convention) and day_of_week — computed directly so this works for arbitrary
// dates ("who works tomorrow / next Saturday / on 1.7"), not just the two
// frozen weeks the rest of the app hardcodes.
function weekInfoForDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay();
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() - dayOfWeek);
  return { weekStart: sunday.toISOString().slice(0, 10), dayOfWeek };
}

async function notifyManager(
  businessId: string,
  personId: string | null,
  type: string,
  title: string,
  body: string,
  refId?: string
) {
  const supabase = createServiceRoleClient();
  await supabase.from("manager_notifications").insert({
    business_id: businessId, person_id: personId, type, title, body, ref_id: refId || null,
  });
}

export async function getEmployeeHours(ctx: ToolCtx, args: { month?: string; weekScope?: boolean }) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("clock_requests")
    .select("type, status, requested_at")
    .eq("business_id", ctx.businessId)
    .eq("person_id", ctx.personId)
    .eq("status", "approved");
  if (error) return { error: error.message };

  const month = args.month; // "YYYY-MM", optional — defaults to all history
  // "this week" means the calendar week of the app's frozen "today" — same
  // Sunday-start week the schedule/dashboard use everywhere else.
  const weekStartMs = args.weekScope ? new Date(`${CURRENT_WEEK_START}T00:00:00Z`).getTime() : null;
  const weekEndMs = weekStartMs !== null ? weekStartMs + 7 * 86400000 : null;
  const byDay: Record<string, { in?: number; out?: number }> = {};
  (data || []).forEach(r => {
    const ts = new Date(r.requested_at).getTime();
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (month && monthKey !== month) return;
    if (weekStartMs !== null && weekEndMs !== null && (ts < weekStartMs || ts >= weekEndMs)) return;
    if (!byDay[key]) byDay[key] = {};
    if (r.type === "in" && (byDay[key].in === undefined || ts < byDay[key].in!)) byDay[key].in = ts;
    if (r.type === "out" && (byDay[key].out === undefined || ts > byDay[key].out!)) byDay[key].out = ts;
  });

  let totalHours = 0;
  const shifts: { date: string; hours: number }[] = [];
  Object.values(byDay).forEach(({ in: inTs, out: outTs }) => {
    if (!inTs || !outTs) return;
    const hours = (outTs - inTs) / 3600000;
    totalHours += hours;
    shifts.push({ date: new Date(inTs).toLocaleDateString("he-IL"), hours: Math.round(hours * 10) / 10 });
  });

  return { totalHours: Math.round(totalHours * 10) / 10, shiftsCount: shifts.length, shifts };
}

export async function getUpcomingShifts(ctx: ToolCtx) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("schedule_assignments")
    .select("id, day_of_week, week_start, role_key, time_in, time_out")
    .eq("business_id", ctx.businessId)
    .eq("person_id", ctx.personId)
    .in("week_start", [CURRENT_WEEK_START, NEXT_WEEK_START])
    .order("week_start").order("day_of_week");
  if (error) return { error: error.message };

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const shifts = (data || [])
    .filter(a => a.week_start !== CURRENT_WEEK_START || a.day_of_week >= TODAY_DAY_OF_WEEK)
    .map(a => ({
      id: a.id,
      week: a.week_start === CURRENT_WEEK_START ? "השבוע" : "שבוע הבא",
      day: dayNames[a.day_of_week], role: a.role_key,
      timeIn: a.time_in?.slice(0, 5), timeOut: a.time_out?.slice(0, 5),
    }));
  return { shifts };
}

// dateStr is an explicit YYYY-MM-DD — used for "who works today/tomorrow/on 1.7"
// alike, not just "today", since employees and managers ask about any day.
export async function getScheduleForDate(ctx: ToolCtx, dateStr: string) {
  const { weekStart, dayOfWeek } = weekInfoForDate(dateStr);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("schedule_assignments")
    .select("role_key, time_in, time_out, people(name)")
    .eq("business_id", ctx.businessId)
    .eq("week_start", weekStart)
    .eq("day_of_week", dayOfWeek);
  if (error) return { error: error.message };

  type Row = { role_key: string; time_in: string; time_out: string; people: { name: string } | null };
  const working = (data || []).map(r => {
    const row = r as unknown as Row;
    return { name: row.people?.name || "", role: row.role_key, timeIn: row.time_in?.slice(0, 5), timeOut: row.time_out?.slice(0, 5) };
  });
  return { working };
}

export async function getShiftSwapRequests(ctx: ToolCtx) {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("swap_requests")
    .select(`
      id, status, created_at, assignment_id,
      schedule_assignments(day_of_week, week_start, role_key, time_in, time_out),
      requester:people!swap_requests_requested_by_fkey(name),
      proposer:people!swap_requests_proposed_person_fkey(name)
    `)
    .eq("business_id", ctx.businessId)
    .eq("status", "pending");
  if (!ctx.isManager) query = query.eq("requested_by", ctx.personId);

  const { data, error } = await query;
  if (error) return { error: error.message };

  type Row = {
    id: string; status: string; created_at: string;
    schedule_assignments: { day_of_week: number; role_key: string; time_in: string; time_out: string } | null;
    requester: { name: string } | null; proposer: { name: string } | null;
  };
  const requests = (data || []).map(r => {
    const row = r as unknown as Row;
    return {
      id: row.id, status: row.status,
      requesterName: row.requester?.name, proposedToTakeOver: row.proposer?.name,
      role: row.schedule_assignments?.role_key,
      timeIn: row.schedule_assignments?.time_in?.slice(0, 5), timeOut: row.schedule_assignments?.time_out?.slice(0, 5),
    };
  });
  return { requests };
}

export async function createShiftSwapRequest(
  ctx: ToolCtx,
  args: { assignmentId: string; proposedPersonName?: string }
) {
  const supabase = createServiceRoleClient();

  let proposedPersonId: string | null = null;
  if (args.proposedPersonName) {
    const { data: match } = await supabase
      .from("people").select("id, name").eq("business_id", ctx.businessId)
      .ilike("name", `%${args.proposedPersonName}%`).limit(1).maybeSingle();
    if (match) proposedPersonId = match.id;
  }

  const { data, error } = await supabase
    .from("swap_requests")
    .insert({ business_id: ctx.businessId, assignment_id: args.assignmentId, requested_by: ctx.personId, proposed_person: proposedPersonId })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message || "הבקשה נכשלה" };

  const { data: me } = await supabase.from("people").select("name").eq("id", ctx.personId).single();
  await notifyManager(
    ctx.businessId, ctx.personId, "swap_request",
    "בקשת החלפת משמרת חדשה",
    `${me?.name || "עובד"} מבקש/ת להחליף משמרת${args.proposedPersonName ? ` עם ${args.proposedPersonName}` : ""}`,
    data.id
  );
  return { success: true, requestId: data.id };
}

export async function createAbsenceRequest(ctx: ToolCtx, args: { date: string; reason?: string }) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("absence_requests")
    .insert({ business_id: ctx.businessId, person_id: ctx.personId, date: args.date, reason: args.reason || null })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message || "הבקשה נכשלה" };

  const { data: me } = await supabase.from("people").select("name").eq("id", ctx.personId).single();
  await notifyManager(
    ctx.businessId, ctx.personId, "absence_request",
    "בקשת היעדרות חדשה",
    `${me?.name || "עובד"} מבקש/ת להיעדר בתאריך ${args.date}${args.reason ? ` — ${args.reason}` : ""}`,
    data.id
  );
  return { success: true, requestId: data.id };
}

export async function sendNotificationToManager(ctx: ToolCtx, args: { type: string; title: string; body: string }) {
  await notifyManager(ctx.businessId, ctx.personId, args.type || "other", args.title, args.body);
  return { success: true };
}

// Manager-only: approve/deny a pending absence or swap request raised through the assistant.
export async function respondToRequest(ctx: ToolCtx, args: { requestId: string; requestType: "absence" | "swap"; approve: boolean }) {
  if (!ctx.isManager) return { error: "רק מנהל יכול לאשר או לדחות בקשות" };
  const supabase = createServiceRoleClient();

  if (args.requestType === "absence") {
    const { error } = await supabase
      .from("absence_requests")
      .update({ status: args.approve ? "approved" : "denied" })
      .eq("id", args.requestId)
      .eq("business_id", ctx.businessId);
    if (error) return { error: error.message };
    return { success: true };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("swap_requests").select("assignment_id, proposed_person").eq("id", args.requestId).single();
  if (fetchError || !existing) return { error: fetchError?.message || "הבקשה לא נמצאה" };

  if (args.approve) {
    if (!existing.proposed_person) return { error: "לא הוצע עובד מחליף לבקשה הזו" };
    const { error: assignError } = await supabase
      .from("schedule_assignments").update({ person_id: existing.proposed_person }).eq("id", existing.assignment_id);
    if (assignError) return { error: assignError.message };
  }
  const { error } = await supabase
    .from("swap_requests").update({ status: args.approve ? "approved" : "denied" }).eq("id", args.requestId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getPendingManagerNotifications(ctx: ToolCtx) {
  if (!ctx.isManager) return { error: "רק מנהל יכול לראות את זה" };
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("manager_notifications")
    .select("id, type, title, body, ref_id, read, created_at")
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return { error: error.message };
  return { notifications: data || [] };
}

// The single most recent not-yet-actioned notification — used by the free-tier
// "approve the last request" / "deny the last request" intents.
export async function getMostRecentPendingNotification(ctx: ToolCtx) {
  if (!ctx.isManager) return { error: "רק מנהל יכול לראות את זה" };
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("manager_notifications")
    .select("id, type, title, body, ref_id")
    .eq("business_id", ctx.businessId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { notification: null };
  return { notification: data };
}

// Tips are tracked per-business per-shift (one pool, not per employee), and
// split client-side proportionally to hours worked — see tips/page.tsx's
// calcShares(). This mirrors that same proportional split so the assistant
// can answer "how much did I make in tips today" with a real number instead
// of just pointing at the tips page.
export async function getTipsToday(ctx: ToolCtx) {
  const supabase = createServiceRoleClient();
  const { data: tipsDay, error: tipsError } = await supabase
    .from("tips_days")
    .select("morning_total, evening_total, daily_total, published")
    .eq("business_id", ctx.businessId)
    .eq("date", TODAY_DATE)
    .maybeSingle();
  if (tipsError) return { error: tipsError.message };
  if (!tipsDay || !tipsDay.published) return { published: false };

  const { data: assignments, error: assignError } = await supabase
    .from("schedule_assignments")
    .select("person_id, time_in, time_out")
    .eq("business_id", ctx.businessId)
    .eq("week_start", CURRENT_WEEK_START)
    .eq("day_of_week", TODAY_DAY_OF_WEEK);
  if (assignError) return { error: assignError.message };

  const mine = (assignments || []).find(a => a.person_id === ctx.personId);
  if (!mine) return { published: true, myShare: 0, worked: false };

  const myHour = parseInt(mine.time_in.slice(0, 2), 10);
  const isEvening = myHour >= 15;
  const shiftAssignments = (assignments || []).filter(a => {
    const h = parseInt(a.time_in.slice(0, 2), 10);
    return (h >= 15) === isEvening;
  });

  const totalForShift = Number(isEvening ? tipsDay.evening_total : tipsDay.morning_total) || 0;
  const totalHours = shiftAssignments.reduce((s, a) => s + calcHours(a.time_in.slice(0, 5), a.time_out.slice(0, 5)), 0);
  const myHours = calcHours(mine.time_in.slice(0, 5), mine.time_out.slice(0, 5));
  const myShare = totalHours > 0 ? Math.round((totalForShift * myHours) / totalHours) : 0;

  return { published: true, worked: true, myShare, shiftLabel: isEvening ? "ערב" : "בוקר", myHours: Math.round(myHours * 10) / 10 };
}

// Same per-day proportional split as getTipsToday, generalized to any single
// date — the building block getTipsForPeriod sums over a range with.
async function tipsShareForDate(ctx: ToolCtx, date: string) {
  const supabase = createServiceRoleClient();
  const { data: tipsDay, error: tipsError } = await supabase
    .from("tips_days")
    .select("morning_total, evening_total, published")
    .eq("business_id", ctx.businessId)
    .eq("date", date)
    .maybeSingle();
  if (tipsError || !tipsDay || !tipsDay.published) return 0;

  const { weekStart, dayOfWeek } = weekInfoForDate(date);
  const { data: assignments } = await supabase
    .from("schedule_assignments")
    .select("person_id, time_in, time_out")
    .eq("business_id", ctx.businessId)
    .eq("week_start", weekStart)
    .eq("day_of_week", dayOfWeek);

  const mine = (assignments || []).find(a => a.person_id === ctx.personId);
  if (!mine) return 0;

  const myHour = parseInt(mine.time_in.slice(0, 2), 10);
  const isEvening = myHour >= 15;
  const shiftAssignments = (assignments || []).filter(a => {
    const h = parseInt(a.time_in.slice(0, 2), 10);
    return (h >= 15) === isEvening;
  });

  const totalForShift = Number(isEvening ? tipsDay.evening_total : tipsDay.morning_total) || 0;
  const totalHours = shiftAssignments.reduce((s, a) => s + calcHours(a.time_in.slice(0, 5), a.time_out.slice(0, 5)), 0);
  const myHours = calcHours(mine.time_in.slice(0, 5), mine.time_out.slice(0, 5));
  return totalHours > 0 ? Math.round((totalForShift * myHours) / totalHours) : 0;
}

// "today" / "this week" (Sun–Sat of the app's frozen "today") / "this month
// so far" — lets the assistant answer "how much in tips this week/month"
// instead of only "today" like getTipsToday.
export async function getTipsForPeriod(ctx: ToolCtx, scope: "today" | "week" | "month") {
  let dates: string[];
  if (scope === "today") {
    dates = [TODAY_DATE];
  } else if (scope === "week") {
    const start = new Date(`${CURRENT_WEEK_START}T00:00:00Z`);
    dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  } else {
    const [y, m, dayOfMonth] = TODAY_DATE.split("-").map(Number);
    dates = Array.from({ length: dayOfMonth }, (_, i) => `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
  }

  let total = 0;
  for (const date of dates) total += await tipsShareForDate(ctx, date);
  return { total };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = createServiceRoleClient();
  await supabase.from("manager_notifications").update({ read: true }).eq("id", notificationId);
}
