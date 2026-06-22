export type Employee = {
  name: string; initials: string; role: string;
  phone: string; since: string; cat: string;
  color: string; textColor: string;
};

const UPCOMING_DAY_DEFS = [
  { dayOfWeek: 3, day: "רביעי", date: "24.6" },
  { dayOfWeek: 4, day: "חמישי", date: "25.6" },
  { dayOfWeek: 5, day: "שישי",  date: "26.6" },
];

// Builds the real "upcoming shifts" summary (next 3 days after today) from real schedule_assignments
export function buildUpcomingShifts(assignments: { dayOfWeek: number; timeIn: string; timeOut: string }[]) {
  return UPCOMING_DAY_DEFS.map(def => {
    const dayAssignments = assignments.filter(a => a.dayOfWeek === def.dayOfWeek);
    if (dayAssignments.length === 0) {
      return { day: def.day, date: def.date, time: "—", role: "אין משמרות מתוכננות", count: 0 };
    }
    const ins = dayAssignments.map(a => a.timeIn).sort();
    const outs = dayAssignments.map(a => a.timeOut).sort();
    return { day: def.day, date: def.date, time: `${ins[0]}–${outs[outs.length - 1]}`, role: "משמרות מתוכננות", count: dayAssignments.length };
  });
}

// ── Monthly attendance / hours data (shared between manager report and employee "my hours") ──
export type ShiftEntry = { day: string; date: string; timeIn: string; timeOut: string; note?: string };
export type AttendanceMonth = { label: string; monthKey: string; weeks: { range: string; shifts: ShiftEntry[] }[] };

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function hhmm(ts: number) {
  return new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
function dateLabel(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}
function weekRangeLabel(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${dateLabel(start.getTime())}–${dateLabel(end.getTime())}`;
}

// Builds AttendanceMonth[] from real approved clock_requests (pairs the day's earliest "in" with its latest "out")
export function buildRealAttendance(requests: { type: "in" | "out"; status: string; requestedAt: number }[]): AttendanceMonth[] {
  const approved = requests.filter(r => r.status === "approved").sort((a, b) => a.requestedAt - b.requestedAt);

  const byDay: Record<string, { in?: number; out?: number }> = {};
  approved.forEach(r => {
    const d = new Date(r.requestedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDay[key]) byDay[key] = {};
    if (r.type === "in" && (byDay[key].in === undefined || r.requestedAt < byDay[key].in!)) byDay[key].in = r.requestedAt;
    if (r.type === "out" && (byDay[key].out === undefined || r.requestedAt > byDay[key].out!)) byDay[key].out = r.requestedAt;
  });

  const byMonth: Record<string, AttendanceMonth> = {};
  Object.entries(byDay).forEach(([, { in: inTs, out: outTs }]) => {
    if (!inTs) return;
    const d = new Date(inTs);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { label: d.toLocaleDateString("he-IL", { month: "long", year: "numeric" }), monthKey, weeks: [] };
    }
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const range = weekRangeLabel(weekStart);
    let week = byMonth[monthKey].weeks.find(w => w.range === range);
    if (!week) { week = { range, shifts: [] }; byMonth[monthKey].weeks.push(week); }
    week.shifts.push({
      day: HEBREW_DAYS[d.getDay()], date: dateLabel(inTs),
      timeIn: hhmm(inTs), timeOut: outTs ? hhmm(outTs) : "--:--",
    });
  });

  return Object.values(byMonth)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map(m => ({ ...m, weeks: m.weeks.sort((a, b) => b.range.localeCompare(a.range)) }));
}

export function calcHours(timeIn: string, timeOut: string): number {
  // "--:--" marks a shift still in progress (clocked in, not yet out) — its
  // duration isn't known yet, so contribute 0 rather than NaN to any sum.
  if (timeOut === "--:--") return 0;
  const [hi, mi] = timeIn.split(":").map(Number);
  const [ho, mo] = timeOut.split(":").map(Number);
  const inM  = hi * 60 + mi;
  let outM   = ho * 60 + mo;
  if (outM <= inM) outM += 24 * 60;
  return (outM - inM) / 60;
}

export function formatHours(h: number): string {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}:${String(mins).padStart(2, "0")}` : `${hrs}:00`;
}

export function exportMonthToCSV(emp: { name: string; role: string }, month: AttendanceMonth) {
  const BOM    = "﻿";
  const header = ["שם עובד","תפקיד","יום","תאריך","שעת כניסה","שעת יציאה","סה\"כ שעות","הערות"].join(",");
  const allShifts = month.weeks.flatMap(w => w.shifts);
  const rows = allShifts.map(s => {
    const h = calcHours(s.timeIn, s.timeOut);
    return [emp.name, emp.role, s.day, s.date, s.timeIn, s.timeOut, formatHours(h), s.note || ""].join(",");
  });
  const total = allShifts.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);
  rows.push(["","","","","","סה\"כ:", formatHours(total), ""].join(","));
  const csv  = BOM + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `דוח_נוכחות_${emp.name}_${month.label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
