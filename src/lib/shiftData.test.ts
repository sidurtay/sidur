import { describe, it, expect } from "vitest";
import { calcHours, formatHours } from "./shiftData";

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
