// Curated starting points per business type — chosen at registration so a
// manager never has to stare at role categories (מטבח / בר...) that make no
// sense for their business, or hours defaults tuned for a restaurant when
// they run a gym. The onboarding wizard lets them override every field here;
// this is just what loads pre-selected.

export type RolePreset = { key: string; label: string };
export type HoursPreset = {
  openDays: number[];     // 0=ראשון ... 6=שבת
  from: string;
  to: string;
};

export const BUSINESS_TYPE_KEYS = [
  "cafe", "restaurant", "icecream", "bar", "bakery", "barbershop",
  "beauty", "gym", "clothing", "grocery", "cleaning", "hotel", "other",
] as const;

export type BusinessTypeKey = typeof BUSINESS_TYPE_KEYS[number];

export const ROLE_PRESETS: Record<BusinessTypeKey, RolePreset[]> = {
  cafe:       [{ key: "אחמ\"ש", label: "אחמ\"ש" }, { key: "מלצרים", label: "מלצרים" }, { key: "מטבח", label: "מטבח" }, { key: "בר", label: "בר" }],
  restaurant: [{ key: "אחמ\"ש", label: "אחמ\"ש" }, { key: "מלצרים", label: "מלצרים" }, { key: "מטבח", label: "מטבח" }, { key: "בר", label: "בר" }, { key: "שטיפה", label: "שטיפה" }],
  icecream:   [{ key: "מגישים", label: "מגישים" }, { key: "קופה", label: "קופה" }],
  bar:        [{ key: "אחמ\"ש", label: "אחמ\"ש" }, { key: "ברמנים", label: "ברמנים" }, { key: "מלצרים", label: "מלצרים" }],
  bakery:     [{ key: "אופים", label: "אופים" }, { key: "מוכרים", label: "מוכרים" }, { key: "קופה", label: "קופה" }],
  barbershop: [{ key: "ספרים", label: "ספרים" }, { key: "קבלה", label: "קבלה" }],
  beauty:     [{ key: "קוסמטיקאיות", label: "קוסמטיקאיות" }, { key: "מניקוריסטיות", label: "מניקוריסטיות" }, { key: "קבלה", label: "קבלה" }],
  gym:        [{ key: "מאמנים", label: "מאמנים" }, { key: "קבלה", label: "קבלה" }, { key: "ניקיון", label: "ניקיון" }],
  clothing:   [{ key: "מוכרים", label: "מוכרים" }, { key: "קופה", label: "קופה" }],
  grocery:    [{ key: "קופאים", label: "קופאים" }, { key: "מלאי", label: "מלאי" }, { key: "אחמ\"ש", label: "אחמ\"ש" }],
  cleaning:   [{ key: "מנקים", label: "מנקים" }, { key: "רכז שטח", label: "רכז שטח" }],
  hotel:      [{ key: "קבלה", label: "קבלה" }, { key: "חדרנות", label: "חדרנות" }, { key: "מטבח", label: "מטבח" }, { key: "אחמ\"ש", label: "אחמ\"ש" }],
  other:      [{ key: "אחמ\"ש", label: "אחמ\"ש" }, { key: "עובדים", label: "עובדים" }],
};

export const HOURS_PRESETS: Record<BusinessTypeKey, HoursPreset> = {
  cafe:       { openDays: [0, 1, 2, 3, 4, 5], from: "07:00", to: "22:00" },
  restaurant: { openDays: [0, 1, 2, 3, 4, 5], from: "08:00", to: "23:00" },
  icecream:   { openDays: [0, 1, 2, 3, 4, 5, 6], from: "11:00", to: "23:00" },
  bar:        { openDays: [0, 1, 2, 3, 4, 5], from: "18:00", to: "02:00" },
  bakery:     { openDays: [0, 1, 2, 3, 4, 5], from: "06:00", to: "20:00" },
  barbershop: { openDays: [0, 1, 2, 3, 4], from: "09:00", to: "19:00" },
  beauty:     { openDays: [0, 1, 2, 3, 4], from: "09:00", to: "19:00" },
  gym:        { openDays: [0, 1, 2, 3, 4, 5, 6], from: "06:00", to: "23:00" },
  clothing:   { openDays: [0, 1, 2, 3, 4, 5], from: "09:30", to: "20:00" },
  grocery:    { openDays: [0, 1, 2, 3, 4, 5, 6], from: "07:00", to: "22:00" },
  cleaning:   { openDays: [0, 1, 2, 3, 4], from: "07:00", to: "16:00" },
  hotel:      { openDays: [0, 1, 2, 3, 4, 5, 6], from: "00:00", to: "23:59" },
  other:      { openDays: [0, 1, 2, 3, 4, 5], from: "09:00", to: "18:00" },
};

export function rolePresetFor(bizType: string | null | undefined): RolePreset[] {
  const key = (bizType || "other") as BusinessTypeKey;
  return ROLE_PRESETS[key] || ROLE_PRESETS.other;
}

export function hoursPresetFor(bizType: string | null | undefined): HoursPreset {
  const key = (bizType || "other") as BusinessTypeKey;
  return HOURS_PRESETS[key] || HOURS_PRESETS.other;
}
