import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/auth/permissions";
import { calcHours } from "@/lib/shiftData";
import { weekInfoForDate } from "@/lib/ai/tools";
import { requireBusinessSession } from "@/lib/auth/session";

// Monthly payroll/accountant export — per employee: hours worked (from
// approved clock in/out events, the same source of truth my-hours/AI chat
// use), computed wage, and their proportional tips share for the month.
// CSV rather than PDF/Excel-binary: every accounting tool and Excel/Sheets
// opens it directly, and it needs no extra dependency to generate.
export async function GET(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get("businessId");
    const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
    if (!businessId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "פרטים חסרים או לא תקינים" }, { status: 400 });
    }
    const { session, error: authError } = requireBusinessSession(req, businessId);
    if (authError) return authError;

    const supabase = createServiceRoleClient();
    if (!(await isManager(supabase, businessId, session.personId))) {
      return NextResponse.json({ error: "אין הרשאה לצפות בדוח שכר" }, { status: 403 });
    }

    const { data: employees, error: empError } = await supabase
      .from("people")
      .select("id, name, hourly_wage")
      .eq("business_id", businessId)
      .eq("role_type", "employee");
    if (empError) {
      console.error("payroll export employees error:", empError.message);
      return NextResponse.json({ error: "טעינת העובדים נכשלה" }, { status: 500 });
    }

    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const monthDates = Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
    const monthStart = `${month}-01T00:00:00.000Z`;
    const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}T23:59:59.999Z`;

    // Hours worked: earliest approved "in" / latest approved "out" per person per day.
    const { data: clockRows } = await supabase
      .from("clock_requests")
      .select("person_id, type, requested_at")
      .eq("business_id", businessId)
      .eq("status", "approved")
      .gte("requested_at", monthStart)
      .lte("requested_at", monthEnd);

    const hoursByPerson: Record<string, number> = {};
    const byPersonDay: Record<string, { in?: number; out?: number }> = {};
    (clockRows || []).forEach(r => {
      const ts = new Date(r.requested_at).getTime();
      const d = new Date(ts);
      const key = `${r.person_id}:${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      if (!byPersonDay[key]) byPersonDay[key] = {};
      if (r.type === "in" && (byPersonDay[key].in === undefined || ts < byPersonDay[key].in!)) byPersonDay[key].in = ts;
      if (r.type === "out" && (byPersonDay[key].out === undefined || ts > byPersonDay[key].out!)) byPersonDay[key].out = ts;
    });
    Object.entries(byPersonDay).forEach(([key, { in: inTs, out: outTs }]) => {
      if (!inTs || !outTs) return;
      const personId = key.split(":")[0];
      hoursByPerson[personId] = (hoursByPerson[personId] || 0) + (outTs - inTs) / 3600000;
    });

    // Tips: same proportional per-shift split used everywhere else in the app,
    // accumulated across every published day in the month.
    const { data: tipsDays } = await supabase
      .from("tips_days")
      .select("date, morning_total, evening_total, published")
      .eq("business_id", businessId)
      .gte("date", monthDates[0])
      .lte("date", monthDates[monthDates.length - 1])
      .eq("published", true);

    const tipsByPerson: Record<string, number> = {};
    for (const tipsDay of tipsDays || []) {
      const { weekStart, dayOfWeek } = weekInfoForDate(tipsDay.date);
      const { data: assignments } = await supabase
        .from("schedule_assignments")
        .select("person_id, time_in, time_out")
        .eq("business_id", businessId)
        .eq("week_start", weekStart)
        .eq("day_of_week", dayOfWeek);
      if (!assignments?.length) continue;

      for (const isEvening of [false, true]) {
        const shiftAssignments = assignments.filter(a => (parseInt(a.time_in.slice(0, 2), 10) >= 15) === isEvening);
        if (!shiftAssignments.length) continue;
        const totalForShift = Number(isEvening ? tipsDay.evening_total : tipsDay.morning_total) || 0;
        const totalHours = shiftAssignments.reduce((s, a) => s + calcHours(a.time_in.slice(0, 5), a.time_out.slice(0, 5)), 0);
        if (totalHours <= 0) continue;
        shiftAssignments.forEach(a => {
          const myHours = calcHours(a.time_in.slice(0, 5), a.time_out.slice(0, 5));
          tipsByPerson[a.person_id] = (tipsByPerson[a.person_id] || 0) + (totalForShift * myHours) / totalHours;
        });
      }
    }

    const rows = (employees || []).map(e => {
      const hours = Math.round((hoursByPerson[e.id] || 0) * 10) / 10;
      const wage = e.hourly_wage != null ? Math.round(hours * Number(e.hourly_wage)) : 0;
      const tips = Math.round(tipsByPerson[e.id] || 0);
      return { name: e.name, hours, hourlyWage: e.hourly_wage != null ? Number(e.hourly_wage) : "", wage, tips, total: wage + tips };
    });

    const header = ["שם עובד", "שעות עבודה", "שכר לשעה", "שכר לתשלום", "טיפים", 'סה"כ'];
    const csvLines = [
      header.join(","),
      ...rows.map(r => [r.name, r.hours, r.hourlyWage, r.wage, r.tips, r.total].join(",")),
    ];
    // BOM so Excel opens Hebrew UTF-8 correctly instead of showing mojibake.
    const csv = "﻿" + csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll-${month}.csv"`,
      },
    });
  } catch (err) {
    console.error("payroll export error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
