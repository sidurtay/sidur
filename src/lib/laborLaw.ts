import { calcHours } from "@/lib/shiftData";

// Awareness-only checks against Israel's Hours of Work and Rest Law (חוק שעות
// עבודה ומנוחה, תשי"א-1951) — these never block scheduling, they only flag
// things for the manager/אחמ"ש to be aware of, per explicit product decision.
// Numbers: standard workweek is 42 hours (תוקן מ-2018, צו הרחבה לקיצור שבוע
// העבודה); max 6 working days/week with a mandatory 7th rest day; weekly rest
// is at least 36 consecutive hours. Source: כל-זכות (kolzchut.org.il).
export const MAX_WEEKLY_HOURS = 42;
export const MAX_WORK_DAYS_PER_WEEK = 6;
export const MAX_SINGLE_SHIFT_HOURS = 12; // common ceiling cited for a single day incl. overtime

export type ShiftLike = { dayOfWeek: number; timeIn: string; timeOut: string };

export type LaborWarning = { type: "weekly_hours" | "work_days" | "long_shift"; message: string };

// Checks one person's full week of assignments and returns any awareness
// flags — empty array means nothing to flag.
export function checkLaborWarnings(shifts: ShiftLike[]): LaborWarning[] {
  const warnings: LaborWarning[] = [];
  if (shifts.length === 0) return warnings;

  const days = new Set(shifts.map(s => s.dayOfWeek));
  const totalHours = shifts.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);

  if (totalHours > MAX_WEEKLY_HOURS) {
    warnings.push({
      type: "weekly_hours",
      message: `${Math.round(totalHours * 10) / 10} שעות השבוע — מעל שבוע העבודה הרגיל בחוק (${MAX_WEEKLY_HOURS} שעות)`,
    });
  }

  if (days.size > MAX_WORK_DAYS_PER_WEEK) {
    warnings.push({
      type: "work_days",
      message: `משובץ/ת ${days.size} ימים השבוע — החוק דורש לפחות יום מנוחה שבועי אחד`,
    });
  }

  const longShift = shifts.find(s => calcHours(s.timeIn, s.timeOut) > MAX_SINGLE_SHIFT_HOURS);
  if (longShift) {
    warnings.push({
      type: "long_shift",
      message: `משמרת של מעל ${MAX_SINGLE_SHIFT_HOURS} שעות ביום ${longShift.dayOfWeek}`,
    });
  }

  return warnings;
}
