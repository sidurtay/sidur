import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

function mapRow(row: {
  id: string; day_of_week: number; person_id: string; role_key: string; home_role_key: string | null;
  time_in: string; time_out: string;
  actual_in_time: string | null; actual_in_source: string | null;
  actual_out_time: string | null; actual_out_source: string | null;
  people: { name: string; initials: string; color: string; text_color: string } | null;
}) {
  const person = row.people;
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    personId: row.person_id,
    name: person?.name || "",
    initials: person?.initials || "",
    color: person?.color || "#F1EFE8",
    textColor: person?.text_color || "#444441",
    role: row.role_key,
    homeRole: row.home_role_key || undefined,
    timeIn: row.time_in?.slice(0, 5),
    timeOut: row.time_out?.slice(0, 5),
    actualIn: row.actual_in_time ? { time: row.actual_in_time.slice(0, 5), source: row.actual_in_source } : undefined,
    actualOut: row.actual_out_time ? { time: row.actual_out_time.slice(0, 5), source: row.actual_out_source } : undefined,
  };
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const weekStart = req.nextUrl.searchParams.get("weekStart");
  if (!businessId || !weekStart) {
    return NextResponse.json({ error: "businessId ו-weekStart חסרים" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("schedule_assignments")
    .select("id, day_of_week, person_id, role_key, home_role_key, time_in, time_out, actual_in_time, actual_in_source, actual_out_time, actual_out_source, people(name, initials, color, text_color)")
    .eq("business_id", businessId)
    .eq("week_start", weekStart);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = Parameters<typeof mapRow>[0];
  const assignments = (data || []).map(r => mapRow(r as unknown as Row));
  return NextResponse.json({ success: true, assignments });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, weekStart, dayOfWeek, personId, roleKey, homeRoleKey, timeIn, timeOut } = await req.json();
    if (!businessId || !weekStart || dayOfWeek === undefined || !personId || !roleKey) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("schedule_assignments")
      .insert({
        business_id: businessId, week_start: weekStart, day_of_week: dayOfWeek,
        person_id: personId, role_key: roleKey, home_role_key: homeRoleKey || null,
        time_in: timeIn || "09:00", time_out: timeOut || "17:00",
      })
      .select("id, day_of_week, person_id, role_key, home_role_key, time_in, time_out, actual_in_time, actual_in_source, actual_out_time, actual_out_source, people(name, initials, color, text_color)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "השיבוץ נכשל" }, { status: 500 });
    }

    type Row = Parameters<typeof mapRow>[0];
    return NextResponse.json({ success: true, assignment: mapRow(data as unknown as Row) });
  } catch (err) {
    console.error("create assignment error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...fields } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id חסר" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (fields.personId !== undefined) update.person_id = fields.personId;
    if (fields.roleKey !== undefined) update.role_key = fields.roleKey;
    if (fields.homeRoleKey !== undefined) update.home_role_key = fields.homeRoleKey;
    if (fields.timeIn !== undefined) update.time_in = fields.timeIn;
    if (fields.timeOut !== undefined) update.time_out = fields.timeOut;
    if (fields.actualInTime !== undefined) update.actual_in_time = fields.actualInTime;
    if (fields.actualInSource !== undefined) update.actual_in_source = fields.actualInSource;
    if (fields.actualOutTime !== undefined) update.actual_out_time = fields.actualOutTime;
    if (fields.actualOutSource !== undefined) update.actual_out_source = fields.actualOutSource;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("schedule_assignments")
      .update(update)
      .eq("id", id)
      .select("id, day_of_week, person_id, role_key, home_role_key, time_in, time_out, actual_in_time, actual_in_source, actual_out_time, actual_out_source, people(name, initials, color, text_color)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "העדכון נכשל" }, { status: 500 });
    }

    type Row = Parameters<typeof mapRow>[0];
    return NextResponse.json({ success: true, assignment: mapRow(data as unknown as Row) });
  } catch (err) {
    console.error("update assignment error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id חסר" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("schedule_assignments").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
