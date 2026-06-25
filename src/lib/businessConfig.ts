export type DayConfig = {
  name: string;
  open: boolean;
  from: string;
  to: string;
};

// Whether the manual schedule page groups each role's employees by shift.
// Gated by subscription plan — "starter" (free) only supports "none".
export type ShiftSplit = "none" | "morning_evening" | "morning_evening_night";

/**
 * Buckets a scheduled start time into a shift, given the split mode in effect.
 * Treats anything from 21:00 onward (or starting right at midnight, i.e. a
 * shift that rolls into the next calendar day) as "night" — but only when
 * the night bucket is actually enabled; otherwise it folds into "evening".
 */
export function shiftBucket(timeIn: string, split: ShiftSplit): "morning" | "evening" | "night" {
  const hour = parseInt(timeIn.split(":")[0], 10) || 0;
  const isLate = hour === 0 || hour >= 21;
  if (isLate) return split === "morning_evening_night" ? "night" : "evening";
  return hour < 15 ? "morning" : "evening";
}

export const SHIFT_BUCKET_LABEL: Record<"morning" | "evening" | "night", string> = {
  morning: "בוקר",
  evening: "ערב",
  night: "לילה",
};

export type BusinessConfig = {
  bizName: string;
  bizId: string;
  days: DayConfig[];
  roles: string[];
  initialized: boolean;
};

export type StoredConfig = {
  permanent: BusinessConfig;
  weekOverride?: {
    days: DayConfig[];
    weekStart: string; // ISO "YYYY-MM-DD" of Monday/Sunday this override applies to
  };
};

const KEY = "shiftpro_business_config";

export const DEFAULT_CONFIG: BusinessConfig = {
  bizName: "קפה קפה נהריה",
  bizId: "515735686",
  days: [
    { name: "ראשון", open: true,  from: "08:00", to: "23:00" },
    { name: "שני",   open: true,  from: "08:00", to: "23:00" },
    { name: "שלישי", open: true,  from: "08:00", to: "23:00" },
    { name: "רביעי", open: true,  from: "08:00", to: "23:00" },
    { name: "חמישי", open: true,  from: "08:00", to: "00:00" },
    { name: "שישי",  open: true,  from: "08:00", to: "00:00" },
    { name: "שבת",   open: false, from: "",       to: ""       },
  ],
  roles: ["אחמ\"ש", "מלצרים", "מטבח", "בר", "שטיפה"],
  initialized: false,
};

// Next-week start for override reference
export const NEXT_WEEK_START = "2026-06-28";

export function getStoredConfig(): StoredConfig {
  if (typeof window === "undefined") return { permanent: DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { permanent: DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    // Defensive: if stored in old format (without .permanent), fall back
    if (!parsed || !parsed.permanent) return { permanent: DEFAULT_CONFIG };
    return parsed as StoredConfig;
  } catch {
    return { permanent: DEFAULT_CONFIG };
  }
}

/**
 * Returns the config that should be used THIS WEEK / NEXT WEEK scheduling.
 * If a week override exists and its weekStart is next week's start, use it.
 */
export function getEffectiveConfig(): BusinessConfig {
  const stored = getStoredConfig();
  if (stored.weekOverride && stored.weekOverride.weekStart === NEXT_WEEK_START) {
    return { ...stored.permanent, days: stored.weekOverride.days };
  }
  return stored.permanent;
}

export function savePermanent(config: BusinessConfig) {
  const stored = getStoredConfig();
  const updated: StoredConfig = {
    ...stored,
    permanent: { ...config, initialized: true },
  };
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function saveWeekOverride(days: DayConfig[]) {
  const stored = getStoredConfig();
  const updated: StoredConfig = {
    ...stored,
    weekOverride: { days, weekStart: NEXT_WEEK_START },
  };
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function clearWeekOverride() {
  const stored = getStoredConfig();
  const { weekOverride: _, ...rest } = stored;
  localStorage.setItem(KEY, JSON.stringify(rest));
}

/** True if the two configs have meaningful differences in days or roles */
export function configChanged(a: BusinessConfig, b: BusinessConfig): boolean {
  if (a.bizName !== b.bizName || a.bizId !== b.bizId) return true;
  if (JSON.stringify(a.days) !== JSON.stringify(b.days)) return true;
  if (JSON.stringify(a.roles) !== JSON.stringify(b.roles)) return true;
  return false;
}

/** Days that affect scheduling (open days only), mapped to their index 0=Sun…6=Sat */
export function getOpenDayIndices(days: DayConfig[]): number[] {
  return days.map((d, i) => ({ ...d, i })).filter(d => d.open).map(d => d.i);
}
