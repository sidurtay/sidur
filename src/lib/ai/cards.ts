// Structured "answer cards" the chat can render instead of a plain sentence —
// only defined for the handful of intents where a visual card genuinely beats
// a sentence (who's working, hours worked, tips). Everything else stays text.
export type RosterPerson = { name: string; initials: string; role: string; timeIn: string; timeOut: string };
export type RosterCard = { type: "roster"; label: string; people: RosterPerson[] };
export type HoursCard = { type: "hours"; totalHours: number; shiftsCount: number; periodLabel: string };
export type TipsCard = { type: "tips"; amount: number; label: string };
export type ShiftCard = { type: "shift"; role: string; timeIn: string; timeOut: string } | { type: "shift"; none: true };

export type AvailablePerson = { name: string; initials: string; phone: string; role: string; status: string };
export type AvailabilityCard = { type: "availability"; dateLabel: string; people: AvailablePerson[] };

export type AnyCard = RosterCard | HoursCard | TipsCard | ShiftCard | AvailabilityCard;

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
