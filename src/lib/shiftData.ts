export type Employee = {
  name: string; initials: string; role: string;
  phone: string; since: string; cat: string;
  color: string; textColor: string;
};

export type Assignment = {
  id: string; name: string; initials: string; role: string;
  color: string; textColor: string; timeIn: string; timeOut: string;
};

export const ALL_EMPLOYEES: Employee[] = [
  { name: "שירה כהן",    initials: "שי", role: "מלצרית", phone: "052-1234567", since: "מרץ 2026",    cat: "מלצר",  color: "#E6F1FB", textColor: "#0C447C" },
  { name: "עידו בן דוד", initials: "עי", role: "מלצר",   phone: "052-9876543", since: "ינואר 2026",  cat: "מלצר",  color: "#FAECE7", textColor: "#712B13" },
  { name: "דניאל לוי",   initials: "דנ", role: "מטבח",   phone: "054-3334455", since: "אוגוסט 2025", cat: "מטבח",  color: "#E1F5EE", textColor: "#085041" },
  { name: "נועה ברק",    initials: "נו", role: "מטבח",   phone: "050-7778899", since: "פברואר 2026", cat: "מטבח",  color: "#E1F5EE", textColor: "#085041" },
  { name: "רותם אביב",   initials: "רו", role: "בר",     phone: "053-1112233", since: "מאי 2025",    cat: "בר",    color: "#EEEDFE", textColor: "#3C3489" },
  { name: "מיכל שרון",   initials: "מי", role: "שטיפה",  phone: "052-4445566", since: "נובמבר 2025", cat: "שטיפה", color: "#F1EFE8", textColor: "#444441" },
];

// Today's schedule (Tuesday 23.6, day index 2)
export const TODAYS_ASSIGNMENTS: (Assignment & { status: "active" | "late" | "pending"; checkin: string })[] = [
  { id: "t1", name: "שירה כהן",    initials: "שי", role: "מלצרית", color: "#E6F1FB", textColor: "#0C447C", timeIn: "08:00", timeOut: "16:00", status: "active",  checkin: "08:02" },
  { id: "t2", name: "עידו בן דוד", initials: "עי", role: "מלצר",   color: "#FAECE7", textColor: "#712B13", timeIn: "16:00", timeOut: "00:00", status: "late",    checkin: "16:45" },
  { id: "t3", name: "דניאל לוי",   initials: "דנ", role: "מטבח",   color: "#E1F5EE", textColor: "#085041", timeIn: "09:00", timeOut: "17:00", status: "active",  checkin: "09:00" },
  { id: "t4", name: "נועה ברק",    initials: "נו", role: "מטבח",   color: "#E1F5EE", textColor: "#085041", timeIn: "12:00", timeOut: "20:00", status: "pending", checkin: "--:--" },
  { id: "t5", name: "רותם אביב",   initials: "רו", role: "בר",     color: "#EEEDFE", textColor: "#3C3489", timeIn: "18:00", timeOut: "02:00", status: "pending", checkin: "--:--" },
  { id: "t6", name: "מיכל שרון",   initials: "מי", role: "שטיפה",  color: "#F1EFE8", textColor: "#444441", timeIn: "12:00", timeOut: "20:00", status: "active",  checkin: "12:05" },
];

// Upcoming shifts (next 3 days)
export const UPCOMING_SHIFTS = [
  { day: "רביעי", date: "24.6", time: "08:00–16:00", role: "משמרת בוקר",   count: 3 },
  { day: "חמישי", date: "25.6", time: "16:00–00:00", role: "משמרת ערב",    count: 4 },
  { day: "שישי",  date: "26.6", time: "12:00–22:00", role: "משמרת שישי",   count: 5 },
];

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

export const mockAttendance: Record<string, AttendanceMonth[]> = {
  "שירה כהן": [
    {
      label: "יוני 2026", monthKey: "2026-06",
      weeks: [
        { range: "21.6–27.6", shifts: [
          { day: "ראשון",  date: "21.6", timeIn: "08:02", timeOut: "16:05" },
          { day: "שני",    date: "22.6", timeIn: "07:58", timeOut: "15:55" },
          { day: "שלישי", date: "23.6", timeIn: "08:10", timeOut: "16:30" },
          { day: "רביעי", date: "24.6", timeIn: "08:00", timeOut: "16:00" },
          { day: "שישי",  date: "26.6", timeIn: "12:05", timeOut: "20:00" },
        ]},
        { range: "14.6–20.6", shifts: [
          { day: "ראשון",  date: "14.6", timeIn: "08:00", timeOut: "16:00" },
          { day: "שלישי", date: "16.6", timeIn: "08:05", timeOut: "17:00", note: "שעות נוספות" },
          { day: "חמישי", date: "18.6", timeIn: "08:00", timeOut: "16:00" },
          { day: "שישי",  date: "19.6", timeIn: "12:00", timeOut: "22:00", note: "שישי ארוך" },
        ]},
        { range: "7.6–13.6", shifts: [
          { day: "ראשון",  date: "7.6",  timeIn: "08:00", timeOut: "16:00" },
          { day: "שני",    date: "8.6",  timeIn: "08:00", timeOut: "16:00" },
          { day: "רביעי", date: "10.6", timeIn: "08:00", timeOut: "16:00" },
          { day: "שישי",  date: "12.6", timeIn: "12:00", timeOut: "21:00" },
        ]},
        { range: "1.6–6.6", shifts: [
          { day: "ראשון",  date: "1.6",  timeIn: "08:00", timeOut: "16:00" },
          { day: "שלישי", date: "3.6",  timeIn: "08:00", timeOut: "16:00" },
          { day: "חמישי", date: "5.6",  timeIn: "08:00", timeOut: "16:00" },
        ]},
      ],
    },
    {
      label: "מאי 2026", monthKey: "2026-05",
      weeks: [
        { range: "25.5–31.5", shifts: [
          { day: "ראשון",  date: "25.5", timeIn: "08:00", timeOut: "16:00" },
          { day: "שלישי", date: "27.5", timeIn: "08:00", timeOut: "16:00" },
          { day: "חמישי", date: "29.5", timeIn: "08:00", timeOut: "16:00" },
          { day: "שישי",  date: "30.5", timeIn: "12:00", timeOut: "22:00", note: "שישי ארוך" },
        ]},
        { range: "18.5–24.5", shifts: [
          { day: "ראשון",  date: "18.5", timeIn: "08:00", timeOut: "16:00" },
          { day: "שני",    date: "19.5", timeIn: "08:00", timeOut: "16:00" },
          { day: "שישי",  date: "23.5", timeIn: "12:00", timeOut: "22:00" },
        ]},
      ],
    },
  ],
  "עידו בן דוד": [
    {
      label: "יוני 2026", monthKey: "2026-06",
      weeks: [
        { range: "21.6–27.6", shifts: [
          { day: "ראשון",  date: "21.6", timeIn: "16:00", timeOut: "00:05" },
          { day: "שני",    date: "22.6", timeIn: "15:55", timeOut: "23:50" },
          { day: "שישי",  date: "26.6", timeIn: "16:10", timeOut: "00:00" },
        ]},
        { range: "14.6–20.6", shifts: [
          { day: "שני",    date: "15.6", timeIn: "16:00", timeOut: "00:00" },
          { day: "רביעי", date: "17.6", timeIn: "16:00", timeOut: "23:30" },
          { day: "שישי",  date: "19.6", timeIn: "18:00", timeOut: "02:00", note: "אירוע" },
        ]},
        { range: "7.6–13.6", shifts: [
          { day: "שני",    date: "8.6",  timeIn: "16:00", timeOut: "00:00" },
          { day: "חמישי", date: "11.6", timeIn: "16:00", timeOut: "00:00" },
          { day: "שישי",  date: "12.6", timeIn: "18:00", timeOut: "02:00" },
        ]},
      ],
    },
  ],
  "דניאל לוי": [
    {
      label: "יוני 2026", monthKey: "2026-06",
      weeks: [
        { range: "21.6–27.6", shifts: [
          { day: "ראשון",  date: "21.6", timeIn: "09:00", timeOut: "17:00" },
          { day: "שלישי", date: "23.6", timeIn: "09:00", timeOut: "17:30" },
          { day: "רביעי", date: "24.6", timeIn: "09:00", timeOut: "17:00" },
          { day: "חמישי", date: "25.6", timeIn: "09:00", timeOut: "18:00", note: "שעות נוספות" },
        ]},
        { range: "14.6–20.6", shifts: [
          { day: "ראשון",  date: "14.6", timeIn: "09:00", timeOut: "17:00" },
          { day: "שני",    date: "15.6", timeIn: "09:00", timeOut: "17:00" },
          { day: "שלישי", date: "16.6", timeIn: "09:00", timeOut: "17:00" },
          { day: "רביעי", date: "17.6", timeIn: "09:00", timeOut: "17:00" },
          { day: "חמישי", date: "18.6", timeIn: "09:00", timeOut: "17:00" },
        ]},
      ],
    },
  ],
  "נועה ברק": [
    {
      label: "יוני 2026", monthKey: "2026-06",
      weeks: [
        { range: "21.6–27.6", shifts: [
          { day: "ראשון",  date: "21.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "שני",    date: "22.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "שישי",  date: "26.6", timeIn: "10:00", timeOut: "22:00", note: "שישי ארוך" },
        ]},
        { range: "14.6–20.6", shifts: [
          { day: "ראשון",  date: "14.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "שלישי", date: "16.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "שישי",  date: "19.6", timeIn: "10:00", timeOut: "20:00" },
        ]},
      ],
    },
  ],
  "רותם אביב": [
    {
      label: "יוני 2026", monthKey: "2026-06",
      weeks: [
        { range: "21.6–27.6", shifts: [
          { day: "ראשון",  date: "21.6", timeIn: "18:00", timeOut: "02:00" },
          { day: "שלישי", date: "23.6", timeIn: "10:00", timeOut: "18:00" },
          { day: "רביעי", date: "24.6", timeIn: "18:00", timeOut: "02:00" },
          { day: "שישי",  date: "26.6", timeIn: "18:00", timeOut: "03:00", note: "שישי לילה" },
        ]},
        { range: "14.6–20.6", shifts: [
          { day: "שני",    date: "15.6", timeIn: "18:00", timeOut: "02:00" },
          { day: "חמישי", date: "18.6", timeIn: "18:00", timeOut: "02:00" },
          { day: "שישי",  date: "19.6", timeIn: "20:00", timeOut: "04:00", note: "לילה ארוך" },
        ]},
      ],
    },
  ],
  "מיכל שרון": [
    {
      label: "יוני 2026", monthKey: "2026-06",
      weeks: [
        { range: "21.6–27.6", shifts: [
          { day: "ראשון",  date: "21.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "שני",    date: "22.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "שלישי", date: "23.6", timeIn: "12:00", timeOut: "20:00" },
        ]},
        { range: "14.6–20.6", shifts: [
          { day: "ראשון",  date: "14.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "שני",    date: "15.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "רביעי", date: "17.6", timeIn: "12:00", timeOut: "20:00" },
          { day: "חמישי", date: "18.6", timeIn: "12:00", timeOut: "20:00" },
        ]},
      ],
    },
  ],
};

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
