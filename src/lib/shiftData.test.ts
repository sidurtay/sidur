import { describe, it, expect } from "vitest";
import { calcHours, formatHours, calcOvertimeHours, calcPay, formatCurrency, compareWeekToSchedule, findNoShows } from "./shiftData";

describe("calcHours", () => {
  it("computes a same-day shift duration", () => {
    expect(calcHours("08:00", "16:00")).toBe(8);
  });

  it("wraps overnight shifts past midnight", () => {
    expect(calcHours("18:00", "02:00")).toBe(8);
  });

  it("returns 0 for a shift still in progress, instead of NaN (regression)", () => {
    expect(calcHours("08:00", "--:--")).toBe(0);
    expect(Number.isNaN(calcHours("08:00", "--:--"))).toBe(false);
  });

  it("does not poison a reduce sum across multiple shifts when one is in progress", () => {
    const shifts = [
      { timeIn: "08:00", timeOut: "16:00" },
      { timeIn: "09:00", timeOut: "--:--" },
    ];
    const total = shifts.reduce((sum, s) => sum + calcHours(s.timeIn, s.timeOut), 0);
    expect(total).toBe(8);
    expect(Number.isNaN(total)).toBe(false);
  });
});

describe("formatHours", () => {
  it("formats whole hours", () => {
    expect(formatHours(8)).toBe("8:00");
  });

  it("formats fractional hours as minutes", () => {
    expect(formatHours(8.5)).toBe("8:30");
  });
});

describe("calcOvertimeHours", () => {
  it("is 0 for an 8-hour shift or shorter", () => {
    expect(calcOvertimeHours("08:00", "16:00")).toBe(8 - 8);
    expect(calcOvertimeHours("08:00", "14:00")).toBe(0);
  });

  it("counts only the hours past the 8-hour threshold", () => {
    expect(calcOvertimeHours("08:00", "18:00")).toBe(2);
  });

  it("is 0 for a shift still in progress", () => {
    expect(calcOvertimeHours("08:00", "--:--")).toBe(0);
  });
});

describe("compareWeekToSchedule", () => {
  const assignments = [
    { dayOfWeek: 0, timeIn: "08:00", timeOut: "16:00" }, // ראשון
    { dayOfWeek: 1, timeIn: "09:00", timeOut: "17:00" }, // שני
  ];

  it("flags a shift that started well past the planned time as late", () => {
    const result = compareWeekToSchedule([{ day: "ראשון", date: "1.1", timeIn: "08:30", timeOut: "16:00" }], assignments);
    expect(result[0].status).toBe("late");
  });

  it("flags a shift that ended well before the planned time as early-leave", () => {
    const result = compareWeekToSchedule([{ day: "שני", date: "2.1", timeIn: "09:00", timeOut: "15:00" }], assignments);
    expect(result[0].status).toBe("early-leave");
  });

  it("is ok within the grace window", () => {
    const result = compareWeekToSchedule([{ day: "ראשון", date: "1.1", timeIn: "08:05", timeOut: "16:00" }], assignments);
    expect(result[0].status).toBe("ok");
  });

  it("marks a day with no matching planned shift as unscheduled", () => {
    const result = compareWeekToSchedule([{ day: "שבת", date: "7.1", timeIn: "10:00", timeOut: "14:00" }], assignments);
    expect(result[0].status).toBe("unscheduled");
  });
});

describe("findNoShows", () => {
  it("returns planned days that have no corresponding actual shift", () => {
    const assignments = [
      { dayOfWeek: 0, timeIn: "08:00", timeOut: "16:00" },
      { dayOfWeek: 1, timeIn: "09:00", timeOut: "17:00" },
    ];
    const shifts = [{ day: "ראשון", date: "1.1", timeIn: "08:00", timeOut: "16:00" }];
    const result = findNoShows(assignments, shifts);
    expect(result).toEqual([{ day: "שני", plannedIn: "09:00", plannedOut: "17:00" }]);
  });

  it("returns nothing when every planned day was worked", () => {
    const assignments = [{ dayOfWeek: 0, timeIn: "08:00", timeOut: "16:00" }];
    const shifts = [{ day: "ראשון", date: "1.1", timeIn: "08:00", timeOut: "16:00" }];
    expect(findNoShows(assignments, shifts)).toEqual([]);
  });
});

describe("calcPay", () => {
  it("pays regular hours at the flat hourly wage with no overtime", () => {
    expect(calcPay("08:00", "16:00", 40)).toBe(8 * 40);
  });

  it("pays overtime hours at a 125% premium", () => {
    // 10h shift: 8 regular + 2 overtime
    const expected = 8 * 40 + 2 * 40 * 1.25;
    expect(calcPay("08:00", "18:00", 40)).toBeCloseTo(expected, 5);
  });

  it("never pays less than straight time would for the same hours", () => {
    const totalHours = calcHours("08:00", "20:00");
    const pay = calcPay("08:00", "20:00", 40);
    expect(pay).toBeGreaterThanOrEqual(totalHours * 40);
  });
});

describe("formatCurrency", () => {
  it("formats with the shekel sign and rounds to whole numbers", () => {
    expect(formatCurrency(1234.6)).toBe("₪1,235");
  });
});
