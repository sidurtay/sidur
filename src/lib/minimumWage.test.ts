import { describe, it, expect } from "vitest";
import { isBelowMinimumWage, MINIMUM_WAGE_HOURLY } from "./minimumWage";

describe("isBelowMinimumWage", () => {
  it("is true for a wage below the legal minimum", () => {
    expect(isBelowMinimumWage(MINIMUM_WAGE_HOURLY - 1)).toBe(true);
  });

  it("is false for a wage at or above the legal minimum", () => {
    expect(isBelowMinimumWage(MINIMUM_WAGE_HOURLY)).toBe(false);
    expect(isBelowMinimumWage(MINIMUM_WAGE_HOURLY + 5)).toBe(false);
  });

  it("is false when no wage is set at all (nothing to flag yet)", () => {
    expect(isBelowMinimumWage(undefined)).toBe(false);
    expect(isBelowMinimumWage(null)).toBe(false);
  });
});
