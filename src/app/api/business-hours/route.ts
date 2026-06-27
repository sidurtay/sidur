import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("day_of_week, is_open, open_time, close_time")
    .eq("business_id", businessId)
    .order("day_of_week");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const days = DAY_NAMES.map((name, i) => {
    const row = (data || []).find(d => d.day_of_week === i);
    return {
      name, open: row?.is_open ?? true,
      from: row?.open_time?.slice(0, 5) || "08:00",
      to: row?.close_time?.slice(0, 5) || "23:00",
    };
  });

  return NextResponse.json({ success: true, days });
}

export async function PATCH(req: NextRequest) {
  try {
    const { businessId, days, callerId } = await req.json();
    if (!businessId || !Array.isArray(days) || days.length !== 7 || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!(await isManager(supabase, businessId, callerId))) {
      return NextResponse.json({ error: "אין הרשאה לעדכן שעות פעילות" }, { status: 403 });
    }

    const rows = days.map((d: { open: boolean; from: string; to: string }, i: number) => ({
      business_id: businessId, day_of_week: i,
      is_open: d.open, open_time: d.open ? d.from : null, close_time: d.open ? d.to : null,
    }));
    const { error } = await supabase.from("business_hours").upsert(rows, { onConflict: "business_id,day_of_week" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update business hours error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
