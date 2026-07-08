import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";
import { ADHOC_ROLE_KEY } from "@/lib/adhoc";
import { requireBusinessSession, requireSession } from "@/lib/auth/session";

// Matches the app-wide frozen "today" used across schedule/dashboard/AI assistant.
const CURRENT_WEEK_START = "2026-06-21";
const TODAY_DAY_OF_WEEK = 2;

function addHours(hhmmss: string, hours: number) {
  const [h, m, s] = hhmmss.split(":").map(Number);
  const total = (h * 3600 + m * 60 + (s || 0) + hours * 3600) % 86400;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

// An approved fingerprint clock-request only lives in clock_requests — the
// manager's "מי עובד היום" attendance view and the schedule page's colored
// check-in icons both read actual_in_time/actual_out_time off
// schedule_assignments instead, the same field the manual/QR flows write to.
// Without this, a fingerprint approval would never surface anywhere except
// the employee's own card.
async function syncAssignmentClock(
  supabase: ReturnType<typeof createServiceRoleClient>,
  businessId: string, personId: string, type: "in" | "out"
) {
  // A person can hold more than one role/assignment today (e.g. covering both
  // מלצרים and אחמ"ש) — one fingerprint tap is a single real-world attendance
  // event, so it applies to all of today's assignment rows for that person.
  const time = new Date().toTimeString().slice(0, 8);
  const update = type === "in"
    ? { actual_in_time: time, actual_in_source: "fingerprint" }
    : { actual_out_time: time, actual_out_source: "fingerprint" };
  const { data: updated } = await supabase
    .from("schedule_assignments")
    .update(update)
    .eq("business_id", businessId)
    .eq("person_id", personId)
    .eq("week_start", CURRENT_WEEK_START)
    .eq("day_of_week", TODAY_DAY_OF_WEEK)
    .select("id");

  // Clocked in but had zero assignments today — auto-create a בלת"ם row so
  // this shows up on today's schedule instead of vanishing into thin air.
  if (type === "in" && (!updated || updated.length === 0)) {
    const { data: person } = await supabase.from("people").select("role_key").eq("id", personId).maybeSingle();
    await supabase.from("schedule_assignments").insert({
      business_id: businessId, week_start: CURRENT_WEEK_START, day_of_week: TODAY_DAY_OF_WEEK,
      person_id: personId, role_key: ADHOC_ROLE_KEY, home_role_key: person?.role_key || null,
      time_in: time, time_out: addHours(time, 8),
      actual_in_time: time, actual_in_source: "fingerprint",
    });
  }
}

function mapRow(row: {
  id: string; person_id: string; type: string; status: string; requested_at: string; resolved_at: string | null;
  people: { name: string } | null;
}) {
  return {
    id: row.id,
    personId: row.person_id,
    employeeName: row.people?.name || "",
    type: row.type as "in" | "out",
    status: row.status as "pending" | "approved" | "denied",
    requestedAt: new Date(row.requested_at).getTime(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : undefined,
  };
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const personId = req.nextUrl.searchParams.get("personId");
  const { error: authError } = requireBusinessSession(req, businessId);
  if (authError) return authError;

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("clock_requests")
    .select("id, person_id, type, status, requested_at, resolved_at, people(name)")
    .eq("business_id", businessId)
    .order("requested_at");

  if (personId) query = query.eq("person_id", personId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = Parameters<typeof mapRow>[0];
  return NextResponse.json({ success: true, requests: (data || []).map(r => mapRow(r as unknown as Row)) });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, type, autoApprove } = await req.json();
    if (!businessId || !personId || !type) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;
    // A clock-in/out request can only be submitted for yourself.
    if (personId !== session.personId) {
      return NextResponse.json({ error: "אין הרשאה לדווח נוכחות בשם עובד אחר" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("clock_requests")
      .insert({
        business_id: businessId, person_id: personId, type,
        status: autoApprove ? "approved" : "pending",
        resolved_at: autoApprove ? new Date().toISOString() : null,
      })
      .select("id, person_id, type, status, requested_at, resolved_at, people(name)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "הבקשה נכשלה" }, { status: 500 });
    }

    if (autoApprove) await syncAssignmentClock(supabase, businessId, personId, type);

    type Row = Parameters<typeof mapRow>[0];
    return NextResponse.json({ success: true, request: mapRow(data as unknown as Row) });
  } catch (err) {
    console.error("create clock request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, approve } = await req.json();
    if (!id || approve === undefined) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    const { session, error: authError } = requireSession(req);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    const { data: existing } = await supabase
      .from("clock_requests")
      .select("business_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "הבקשה לא נמצאה" }, { status: 404 });
    }
    if (existing.business_id !== session.businessId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    if (!(await isManager(supabase, existing.business_id, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה לאשר/לדחות בקשת נוכחות" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("clock_requests")
      .update({ status: approve ? "approved" : "denied", resolved_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, business_id, person_id, type, status, requested_at, resolved_at, people(name)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "העדכון נכשל" }, { status: 500 });
    }

    if (approve) await syncAssignmentClock(supabase, data.business_id, data.person_id, data.type as "in" | "out");

    type Row = Parameters<typeof mapRow>[0];
    return NextResponse.json({ success: true, request: mapRow(data as unknown as Row) });
  } catch (err) {
    console.error("update clock request error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
