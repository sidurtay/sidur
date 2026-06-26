// Israeli minimum wage — single source of truth so every wage check across
// the app compares against the same number. Update this when the rate
// changes (it's adjusted periodically, most recently 1.4.2026); everywhere
// that imports it re-checks against the current value automatically, there's
// nothing else to update.
//
// Source: Histadrut / Kol Zchut, effective 1.4.2026 — ₪35.40/hour for adults
// (18+). Does not account for the lower youth minimum wage tiers.
export const MINIMUM_WAGE_HOURLY = 35.4;
export const MINIMUM_WAGE_EFFECTIVE_FROM = "2026-04-01";

export function isBelowMinimumWage(hourlyWage: number | undefined | null): boolean {
  return hourlyWage != null && hourlyWage < MINIMUM_WAGE_HOURLY;
}
