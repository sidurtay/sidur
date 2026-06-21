import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const weekStart = req.nextUrl.searchParams.get("weekStart");
  const personId = req.nextUrl.searchParams.get("personId");
  if (!businessId || !weekStart) {
    return NextResponse.json({ error: "businessId ו-weekStart חסרים" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  if (personId) {
    // Single person — used to pre-fill their own form
    const [{ data: rows }, { data: noteRow }] = await Promise.all([
      supabase.from("constraints").select("day_of_week, status").eq("business_id", businessId).eq("person_id", personId).eq("week_start", weekStart),
      supabase.from("constraint_notes").select("note").eq("business_id", businessId).eq("person_id", personId).eq("week_start", weekStart).maybeSingle(),
    ]);
    const availability: Record<number, string> = {};
    (rows || []).forEach(r => { availability[r.day_of_week] = r.status; });
    return NextResponse.json({ success: true, availability, weekNote: noteRow?.note || "" });
  }

  // No personId — full business view, used by the manager / AI scheduler
  const [{ data: rows, error }, { data: notes }] = await Promise.all([
    supabase.from("constraints").select("person_id, day_of_week, status, people(name)").eq("business_id", businessId).eq("week_start", weekStart),
    supabase.from("constraint_notes").select("person_id, note").eq("business_id", businessId).eq("week_start", weekStart),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byPerson: Record<string, { personId: string; name: string; availability: Record<number, string>; weekNote: string }> = {};
  type Row = { person_id: string; day_of_week: number; status: string; people: { name: string } | null };
  (rows || []).forEach(r => {
    const row = r as unknown as Row;
    if (!byPerson[row.person_id]) {
      byPerson[row.person_id] = { personId: row.person_id, name: row.people?.name || "", availability: {}, weekNote: "" };
    }
    byPerson[row.person_id].availability[row.day_of_week] = row.status;
  });
  (notes || []).forEach(n => {
    if (byPerson[n.person_id]) byPerson[n.person_id].weekNote = n.note;
  });

  return NextResponse.json({ success: true, people: Object.values(byPerson) });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, personId, weekStart, availability, weekNote } = await req.json();
    if (!businessId || !personId || !weekStart || !availability) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const rows = Object.entries(availability).map(([dayOfWeek, status]) => ({
      business_id: businessId, person_id: personId, week_start: weekStart,
      day_of_week: Number(dayOfWeek), status,
    }));

    const { error: constraintsError } = await supabase
      .from("constraints")
      .upsert(rows, { onConflict: "business_id,person_id,week_start,day_of_week" });
    if (constraintsError) {
      return NextResponse.json({ error: constraintsError.message }, { status: 500 });
    }

    const { error: noteError } = await supabase
      .from("constraint_notes")
      .upsert(
        { business_id: businessId, person_id: personId, week_start: weekStart, note: weekNote || "" },
        { onConflict: "business_id,person_id,week_start" }
      );
    if (noteError) {
      return NextResponse.json({ error: noteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("save constraints error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
