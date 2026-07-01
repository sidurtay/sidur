// Israeli holidays/events relevant to restaurant & cafe foot traffic — dates
// for the 2026 calendar. "demand" flags whether the business type this app
// serves (cafes, restaurants, bars) typically sees a rush (chag eve, Lag
// BaOmer bonfires, Independence Day BBQs) or a lull (Yom Kippur, most
// businesses closed) around that date.
export type IsraeliHoliday = { date: string; name: string; demand: "high" | "low" };

export const ISRAELI_HOLIDAYS_2026: IsraeliHoliday[] = [
  { date: "2026-03-02", name: "פורים", demand: "high" },
  { date: "2026-04-01", name: "ערב פסח", demand: "high" },
  { date: "2026-04-02", name: "פסח", demand: "low" },
  { date: "2026-04-08", name: "שביעי של פסח", demand: "low" },
  { date: "2026-04-21", name: "יום הזיכרון", demand: "low" },
  { date: "2026-04-22", name: "יום העצמאות", demand: "high" },
  { date: "2026-05-05", name: "ל\"ג בעומר", demand: "high" },
  { date: "2026-05-21", name: "שבועות", demand: "high" },
  { date: "2026-09-11", name: "ערב ראש השנה", demand: "high" },
  { date: "2026-09-12", name: "ראש השנה", demand: "low" },
  { date: "2026-09-13", name: "ראש השנה", demand: "low" },
  { date: "2026-09-21", name: "ערב יום כיפור", demand: "high" },
  { date: "2026-09-22", name: "יום כיפור", demand: "low" },
  { date: "2026-09-26", name: "ערב סוכות", demand: "high" },
  { date: "2026-09-27", name: "סוכות", demand: "high" },
  { date: "2026-10-04", name: "שמחת תורה", demand: "high" },
  { date: "2026-12-04", name: "חנוכה", demand: "high" },
];

// Returns the nearest upcoming holiday within `withinDays`, or null.
export function upcomingHoliday(todayISO: string, withinDays = 10): (IsraeliHoliday & { daysAway: number }) | null {
  const today = new Date(`${todayISO}T00:00:00Z`).getTime();
  let best: (IsraeliHoliday & { daysAway: number }) | null = null;
  for (const h of ISRAELI_HOLIDAYS_2026) {
    const diffDays = Math.round((new Date(`${h.date}T00:00:00Z`).getTime() - today) / 86400000);
    if (diffDays >= 0 && diffDays <= withinDays) {
      if (!best || diffDays < best.daysAway) best = { ...h, daysAway: diffDays };
    }
  }
  return best;
}
