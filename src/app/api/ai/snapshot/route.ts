import { NextRequest, NextResponse } from "next/server";
import * as tools from "@/lib/ai/tools";
import { isManager as checkIsManager } from "@/lib/auth/permissions";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ShiftCard, HoursCard, TipsCard } from "@/lib/ai/cards";

// Backs the chat drawer's proactive "home screen" — the three things people
// open the assistant to check most (today's shift, hours this week, tips
// today) shown immediately as cards, with zero typing required.
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const personId = req.nextUrl.searchParams.get("personId");
  if (!businessId || !personId) {
    return NextResponse.json({ error: "פרטים חסרים" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const ctx = { businessId, personId, isManager: await checkIsManager(supabase, businessId, personId) };

  const [scheduleRes, hoursRes, tipsRes] = await Promise.all([
    tools.getScheduleForDate(ctx, tools.TODAY_DATE),
    tools.getEmployeeHours(ctx, { weekScope: true }),
    tools.getTipsToday(ctx),
  ]);

  let shift: ShiftCard;
  if ("error" in scheduleRes) {
    shift = { type: "shift", none: true };
  } else {
    // getScheduleForDate returns everyone working that day — find this person's own row.
    const { data: mine } = await supabase
      .from("schedule_assignments")
      .select("role_key, time_in, time_out")
      .eq("business_id", businessId)
      .eq("person_id", personId)
      .eq("week_start", tools.CURRENT_WEEK_START)
      .eq("day_of_week", tools.TODAY_DAY_OF_WEEK)
      .maybeSingle();
    shift = mine
      ? { type: "shift", role: mine.role_key, timeIn: mine.time_in?.slice(0, 5), timeOut: mine.time_out?.slice(0, 5) }
      : { type: "shift", none: true };
  }

  const hours: HoursCard | null = "error" in hoursRes
    ? null
    : { type: "hours", totalHours: hoursRes.totalHours, shiftsCount: hoursRes.shiftsCount, periodLabel: "השבוע" };

  let tips: TipsCard | null = null;
  if (!("error" in tipsRes) && tipsRes.published && tipsRes.worked) {
    tips = { type: "tips", amount: tipsRes.myShare, label: `משמרת ${tipsRes.shiftLabel} · היום` };
  }

  return NextResponse.json({ success: true, shift, hours, tips });
}
