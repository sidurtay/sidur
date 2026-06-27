import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { canPublishTips } from "@/lib/auth/permissions";

function mapRow(row: {
  date: string; morning_total: number | null; evening_total: number | null; daily_total: number | null;
  published: boolean; locked: boolean; locked_by: string | null; locked_at: string | null;
}) {
  return {
    date: row.date,
    morningTotal: row.morning_total != null ? String(row.morning_total) : "",
    eveningTotal: row.evening_total != null ? String(row.evening_total) : "",
    dailyTotal: row.daily_total != null ? String(row.daily_total) : "",
    published: row.published,
    locked: row.locked,
    lockedBy: row.locked_by || undefined,
    lockedAt: row.locked_at || undefined,
  };
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId חסר" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tips_days")
    .select("date, morning_total, evening_total, daily_total, published, locked, locked_by, locked_at")
    .eq("business_id", businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, days: (data || []).map(mapRow) });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, date, morningTotal, eveningTotal, dailyTotal, published, locked, lockedBy, lockedAt, notify, callerId } = await req.json();
    if (!businessId || !date || !callerId) {
      return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    if (!(await canPublishTips(supabase, businessId, callerId))) {
      return NextResponse.json({ error: "אין הרשאה לפרסם טיפים" }, { status: 403 });
    }

    if (Array.isArray(notify) && notify.length > 0) {
      await supabase.from("tips_notifications").insert(
        notify.map((n: { personId: string; title: string; body: string }) => ({
          business_id: businessId, person_id: n.personId, title: n.title, body: n.body,
        }))
      );
    }

    const { data, error } = await supabase
      .from("tips_days")
      .upsert({
        business_id: businessId, date,
        morning_total: morningTotal === "" || morningTotal == null ? null : Number(morningTotal),
        evening_total: eveningTotal === "" || eveningTotal == null ? null : Number(eveningTotal),
        daily_total: dailyTotal === "" || dailyTotal == null ? null : Number(dailyTotal),
        published: !!published, locked: !!locked,
        locked_by: lockedBy || null, locked_at: lockedAt || null,
      }, { onConflict: "business_id,date" })
      .select("date, morning_total, evening_total, daily_total, published, locked, locked_by, locked_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "השמירה נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ success: true, day: mapRow(data) });
  } catch (err) {
    console.error("save tips error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
