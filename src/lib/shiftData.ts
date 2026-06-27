import ExcelJS from "exceljs";

export type Employee = {
  name: string; initials: string; role: string;
  phone: string; since: string; cat: string;
  color: string; textColor: string;
};

// Brand colors (see globals.css) — kept in ARGB since ExcelJS fills don't
// understand CSS variables or hex shorthand.
const XLSX_NAVY   = "FF14181F";
const XLSX_ORANGE = "FFF97316";
const XLSX_GREEN  = "FF15803D";
const XLSX_GRAY   = "FFF7F8F9";
const XLSX_BORDER = "FFE5E7EB";
const XLSX_WHITE  = "FFFFFFFF";

function styleWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sidur";
  wb.created = new Date();
  return wb;
}

function addBrandHeader(sheet: ExcelJS.Worksheet, title: string, subtitle: string, colSpan: number) {
  sheet.views = [{ rightToLeft: true }];

  sheet.mergeCells(1, 1, 1, colSpan);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `Sidur · ${title}`;
  titleCell.font = { bold: true, size: 14, color: { argb: XLSX_WHITE } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_NAVY } };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(2, 1, 2, colSpan);
  const subCell = sheet.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = { bold: true, size: 11, color: { argb: XLSX_NAVY } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
  sheet.getRow(2).height = 20;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: XLSX_WHITE }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_ORANGE } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin", color: { argb: XLSX_BORDER } }, bottom: { style: "thin", color: { argb: XLSX_BORDER } }, left: { style: "thin", color: { argb: XLSX_BORDER } }, right: { style: "thin", color: { argb: XLSX_BORDER } } };
  });
  row.height = 20;
}

function styleDataRow(row: ExcelJS.Row, striped: boolean) {
  row.eachCell(cell => {
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin", color: { argb: XLSX_BORDER } }, bottom: { style: "thin", color: { argb: XLSX_BORDER } }, left: { style: "thin", color: { argb: XLSX_BORDER } }, right: { style: "thin", color: { argb: XLSX_BORDER } } };
    if (striped) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_GRAY } };
  });
}

function styleTotalRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: XLSX_WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLSX_GREEN } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  row.height = 20;
}

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

// Hours beyond an 8-hour shift count as overtime (Israeli labor law's daily
// threshold) — kept separate from total hours so managers can see exposure
// without having to do the subtraction themselves.
const DAILY_OVERTIME_THRESHOLD = 8;
export function calcOvertimeHours(timeIn: string, timeOut: string): number {
  return Math.max(0, calcHours(timeIn, timeOut) - DAILY_OVERTIME_THRESHOLD);
}

// Simplified overtime premium — real Israeli law tiers this (125% for the
// first 2 overtime hours/day, 150% beyond that), but tracking that precisely
// needs a full daily breakdown this app doesn't have yet. A flat 125% on all
// overtime hours is a deliberately conservative approximation: it never
// *overstates* what's owed, so it's safe to show as an estimate, just not a
// substitute for a real payroll calculation.
const OVERTIME_MULTIPLIER = 1.25;
export function calcPay(timeIn: string, timeOut: string, hourlyWage: number, overtimeEnabled = true): number {
  const totalHours = calcHours(timeIn, timeOut);
  const overtimeHours = calcOvertimeHours(timeIn, timeOut);
  const regularHours = totalHours - overtimeHours;
  const multiplier = overtimeEnabled ? OVERTIME_MULTIPLIER : 1;
  return regularHours * hourlyWage + overtimeHours * hourlyWage * multiplier;
}

export function formatCurrency(amount: number): string {
  return `₪${Math.round(amount).toLocaleString("he-IL")}`;
}

export type ComparisonStatus = "ok" | "late" | "early-leave" | "no-show" | "unscheduled";
export type ComparedShift = ShiftEntry & { plannedIn?: string; plannedOut?: string; status: ComparisonStatus };

const LATE_GRACE_MINUTES = 10;
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Cross-references a week's actual clock-in/out shifts against that same
// week's planned schedule_assignments (matched by weekday) to flag lateness
// and early leaving — the "planned vs. actual" comparison managers don't
// currently have any view into.
export function compareWeekToSchedule(
  shifts: ShiftEntry[],
  assignments: { dayOfWeek: number; timeIn: string; timeOut: string }[]
): ComparedShift[] {
  const byDay: Record<number, { timeIn: string; timeOut: string }> = {};
  assignments.forEach(a => { byDay[a.dayOfWeek] = a; });

  return shifts.map(s => {
    const dayIdx = HEBREW_DAYS.indexOf(s.day);
    const planned = byDay[dayIdx];
    if (!planned) return { ...s, status: "unscheduled" as const };

    let status: ComparisonStatus = "ok";
    if (toMinutes(s.timeIn) > toMinutes(planned.timeIn) + LATE_GRACE_MINUTES) status = "late";
    else if (s.timeOut !== "--:--" && toMinutes(s.timeOut) < toMinutes(planned.timeOut) - LATE_GRACE_MINUTES) status = "early-leave";
    return { ...s, plannedIn: planned.timeIn, plannedOut: planned.timeOut, status };
  });
}

// Days with a planned shift but no matching clock-in at all — these never show
// up in `shifts` (which is built only from real clock_requests), so they have
// to be derived from the schedule side instead.
export function findNoShows(
  assignments: { dayOfWeek: number; timeIn: string; timeOut: string }[],
  shifts: ShiftEntry[]
): { day: string; plannedIn: string; plannedOut: string }[] {
  const workedDays = new Set(shifts.map(s => HEBREW_DAYS.indexOf(s.day)));
  return assignments
    .filter(a => !workedDays.has(a.dayOfWeek))
    .map(a => ({ day: HEBREW_DAYS[a.dayOfWeek], plannedIn: a.timeIn, plannedOut: a.timeOut }));
}

// One combined, branded payroll-ready Excel sheet across every employee,
// instead of having to download and re-merge N separate per-employee files.
export async function exportAllToExcel(
  rows: { name: string; role: string; day: string; date: string; timeIn: string; timeOut: string; hourlyWage?: number; overtimeEnabled?: boolean }[],
  businessName: string,
  filename: string
) {
  const wb = styleWorkbook();
  const sheet = wb.addWorksheet("דוח שכר");
  const cols = 9;
  addBrandHeader(sheet, "דוח שעות לשכר", `${businessName} — כל העובדים`, cols);

  sheet.columns = [
    { width: 18 }, { width: 12 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 14 },
  ];

  const headerRow = sheet.addRow(["שם עובד", "תפקיד", "יום", "תאריך", "שעת כניסה", "שעת יציאה", "סה\"כ שעות", "שעות נוספות", "שכר משוער"]);
  styleHeaderRow(headerRow);

  rows.forEach((s, i) => {
    const h  = calcHours(s.timeIn, s.timeOut);
    const ot = calcOvertimeHours(s.timeIn, s.timeOut);
    const pay = s.hourlyWage != null ? formatCurrency(calcPay(s.timeIn, s.timeOut, s.hourlyWage, s.overtimeEnabled)) : "—";
    const row = sheet.addRow([s.name, s.role, s.day, s.date, s.timeIn, s.timeOut, formatHours(h), ot > 0 ? formatHours(ot) : "—", pay]);
    styleDataRow(row, i % 2 === 1);
  });

  const totalHours = rows.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);
  const totalPay = rows.reduce((sum, s) => sum + (s.hourlyWage != null ? calcPay(s.timeIn, s.timeOut, s.hourlyWage, s.overtimeEnabled) : 0), 0);
  const totalRow = sheet.addRow(["", "", "", "", "", "סה\"כ:", formatHours(totalHours), "", totalPay > 0 ? formatCurrency(totalPay) : ""]);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 5);
  styleTotalRow(totalRow);

  await downloadWorkbook(wb, filename);
}

export async function exportMonthToExcel(emp: { name: string; role: string; hourlyWage?: number; overtimeEnabled?: boolean }, month: AttendanceMonth, businessName: string) {
  const wb = styleWorkbook();
  const sheet = wb.addWorksheet("דוח נוכחות");
  const hasWage = emp.hourlyWage != null;
  const cols = hasWage ? 7 : 6;
  addBrandHeader(sheet, "דוח שעות עבודה", `${emp.name} · ${emp.role} · ${businessName} — ${month.label}`, cols);

  sheet.columns = hasWage
    ? [{ width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 14 }, { width: 14 }]
    : [{ width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 14 }];

  const headers = ["יום", "תאריך", "שעת כניסה", "שעת יציאה", "סה\"כ שעות", "הערות"];
  if (hasWage) headers.splice(5, 0, "שכר משוער");
  const headerRow = sheet.addRow(headers);
  styleHeaderRow(headerRow);

  const allShifts = month.weeks.flatMap(w => w.shifts);
  allShifts.forEach((s, i) => {
    const h = calcHours(s.timeIn, s.timeOut);
    const cells = [s.day, s.date, s.timeIn, s.timeOut, formatHours(h)];
    if (hasWage) cells.push(formatCurrency(calcPay(s.timeIn, s.timeOut, emp.hourlyWage!, emp.overtimeEnabled)));
    cells.push(s.note || "");
    const row = sheet.addRow(cells);
    styleDataRow(row, i % 2 === 1);
  });

  const total = allShifts.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);
  const totalRowCells = ["", "", "", "סה\"כ:", formatHours(total)];
  if (hasWage) {
    const totalPay = allShifts.reduce((sum, s) => sum + calcPay(s.timeIn, s.timeOut, emp.hourlyWage!, emp.overtimeEnabled), 0);
    totalRowCells.push(formatCurrency(totalPay));
  }
  totalRowCells.push("");
  const totalRow = sheet.addRow(totalRowCells);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, 3);
  styleTotalRow(totalRow);

  await downloadWorkbook(wb, `דוח_נוכחות_${emp.name}_${month.label}.xlsx`);
}
