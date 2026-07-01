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

// A generic list card — reused for "my upcoming shifts", "pending swap
// requests", and "pending manager notifications": all three are just a
// titled list of rows with a primary + secondary line, so one flexible
// shape covers them instead of three near-identical types.
export type ListItem = { primary: string; secondary: string };
export type ListCard = { type: "list"; icon: "shifts" | "swap" | "pending"; title: string; items: ListItem[] };

// A small "it's done" acknowledgement — used for absence/swap requests sent,
// and approve/deny actions — instead of a plain sentence with an emoji.
export type ConfirmCard = { type: "confirm"; tone: "success" | "info"; title: string; subtitle?: string };

// Proactive heads-up when a high-traffic Israeli holiday/event is coming up
// and the current schedule looks thin for that date — see israeliHolidays.ts.
export type HolidayCard = { type: "holiday"; holidayName: string; date: string; dateLabel: string; daysAway: number; scheduledCount: number; typicalCount: number };

export type AnyCard = RosterCard | HoursCard | TipsCard | ShiftCard | AvailabilityCard | ListCard | ConfirmCard | HolidayCard;

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
