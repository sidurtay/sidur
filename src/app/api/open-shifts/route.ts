import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPushToBusiness } from "@/lib/push";
import { canEditSchedule } from "@/lib/auth/permissions";

function mapRow(row: { id: string; day_of_week: number; role_key: string; time_in: string; time_out: string }) {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    role: row.role_key,
    timeIn: row.time_in?.slice(0, 5),
    timeOut: row.time_out?.slice(0, 5),
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
    .from("open_shifts")
    .select("id, day_of_week, role_key, time_in, time_out")
    .eq("business_id", businessId)
    .eq("week_start", weekStart);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, openShifts: (data || []).map(mapRow) });
}

// Manager publishes an unassigned shift for a role — any eligible employee
// can claim it later via PATCH.
export async function POST(req: NextRequest) {
  try {
    const { businessId, weekStart, dayOfWeek, roleKey, timeIn, timeOut, callerId } = await req.json();
    if (!businessId || !weekStart || dayOfWeek === undefined || !roleKey || !timeIn || !timeOut || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!(await canEditSchedule(supabase, businessId, callerId))) {
      return NextResponse.json({ error: "אין הרשאה לפרסם משמרת פתוחה" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("open_shifts")
      .insert({ business_id: businessId, week_start: weekStart, day_of_week: dayOfWeek, role_key: roleKey, time_in: timeIn, time_out: timeOut })
      .select("id, day_of_week, role_key, time_in, time_out")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "פרסום המשמרת נכשל" }, { status: 500 });
    }

    sendPushToBusiness(businessId, {
      title: "⚡ משמרת פנויה — כל הקודם זוכה",
      body: `${roleKey} · ${timeIn}–${timeOut}. רוצה אותה? תפוס לפני שמישהו אחר 🏃`,
      url: "/schedule",
    }).catch(() => {});

    return NextResponse.json({ success: true, openShift: mapRow(data) });
  } catch (err) {
    console.error("create open shift error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// An employee claims an open shift — turns it into a real schedule_assignments
// row for them and removes the open listing, in that order (if the insert
// fails, the open shift stays up for someone else to try).
export async function PATCH(req: NextRequest) {
  try {
    const { id, businessId, personId, callerId } = await req.json();
    if (!id || !businessId || !personId || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }
    // You can only claim an open shift for yourself.
    if (personId !== callerId) {
      return NextResponse.json({ error: "אין הרשאה לתפוס משמרת בשם עובד אחר" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { data: openShift, error: fetchError } = await supabase
      .from("open_shifts")
      .select("id, week_start, day_of_week, role_key, time_in, time_out")
      .eq("id", id)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !openShift) {
      return NextResponse.json({ error: "המשמרת הזו כבר לא קיימת — מישהו אחר כבר תפס אותה" }, { status: 404 });
    }

    const { data: assignment, error: insertError } = await supabase
      .from("schedule_assignments")
      .insert({
        business_id: businessId, week_start: openShift.week_start, day_of_week: openShift.day_of_week,
        person_id: personId, role_key: openShift.role_key, time_in: openShift.time_in, time_out: openShift.time_out,
      })
      .select("id, day_of_week, person_id, role_key, time_in, time_out, people(name, initials, color, text_color)")
      .single();

    if (insertError || !assignment) {
      return NextResponse.json({ error: insertError?.message || "תפיסת המשמרת נכשלה" }, { status: 500 });
    }

    await supabase.from("open_shifts").delete().eq("id", id);

    type Person = { name: string; initials: string; color: string; text_color: string } | null;
    const person = assignment.people as unknown as Person;
    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id, dayOfWeek: assignment.day_of_week, personId: assignment.person_id,
        name: person?.name || "", initials: person?.initials || "", color: person?.color || "#F1EFE8", textColor: person?.text_color || "#444441",
        role: assignment.role_key, timeIn: assignment.time_in?.slice(0, 5), timeOut: assignment.time_out?.slice(0, 5),
      },
    });
  } catch (err) {
    console.error("claim open shift error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const businessId = req.nextUrl.searchParams.get("businessId");
  const callerId = req.nextUrl.searchParams.get("callerId");
  if (!id || !businessId || !callerId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }
  const supabase = createServiceRoleClient();
  if (!(await canEditSchedule(supabase, businessId, callerId))) {
    return NextResponse.json({ error: "אין הרשאה לבטל משמרת פתוחה" }, { status: 403 });
  }
  const { error } = await supabase.from("open_shifts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
