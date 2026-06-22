import { describe, it, expect, vi, beforeEach } from "vitest";

// A minimal chainable query-builder mock: every chain method (.select/.eq/.in/.order/...)
// returns `this`, and the object itself is a thenable so `await supabase.from(...)....`
// resolves to whatever this test queued up via `queueResult`. `.single()`/`.maybeSingle()`
// resolve the same queued result (real PostgREST semantics aren't relevant here — only the
// shape `{ data, error }` that tools.ts destructures).
function makeChainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "in", "order", "limit", "ilike", "update", "insert"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  (chain as { then: unknown }).then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const fromMock = vi.fn();
const supabaseMock = { from: fromMock };

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => supabaseMock,
}));

beforeEach(() => {
  fromMock.mockReset();
});

const ctx = { businessId: "biz-1", personId: "person-1", isManager: false };

describe("getEmployeeHours", () => {
  it("pairs clock-in/out events into shifts and sums hours", async () => {
    const { getEmployeeHours } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({
      data: [
        { type: "in", status: "approved", requested_at: "2026-06-21T08:00:00Z" },
        { type: "out", status: "approved", requested_at: "2026-06-21T16:00:00Z" },
      ],
      error: null,
    }));
    const res = await getEmployeeHours(ctx, {});
    expect("error" in res).toBe(false);
    if (!("error" in res)) {
      expect(res.shiftsCount).toBe(1);
      expect(res.totalHours).toBe(8);
    }
  });

  it("filters out days where only a clock-in or only a clock-out exists", async () => {
    const { getEmployeeHours } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({
      data: [{ type: "in", status: "approved", requested_at: "2026-06-22T08:00:00Z" }],
      error: null,
    }));
    const res = await getEmployeeHours(ctx, {});
    if (!("error" in res)) {
      expect(res.shiftsCount).toBe(0);
      expect(res.totalHours).toBe(0);
    }
  });

  it("propagates a Supabase error", async () => {
    const { getEmployeeHours } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({ data: null, error: { message: "boom" } }));
    const res = await getEmployeeHours(ctx, {});
    expect(res).toEqual({ error: "boom" });
  });
});

describe("getUpcomingShifts", () => {
  it("excludes today's already-passed day_of_week in the current week but keeps later days", async () => {
    const { getUpcomingShifts, CURRENT_WEEK_START, NEXT_WEEK_START, TODAY_DAY_OF_WEEK } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({
      data: [
        { id: "a1", day_of_week: TODAY_DAY_OF_WEEK - 1, week_start: CURRENT_WEEK_START, role_key: "מלצרים", time_in: "08:00:00", time_out: "16:00:00" },
        { id: "a2", day_of_week: TODAY_DAY_OF_WEEK, week_start: CURRENT_WEEK_START, role_key: "בר", time_in: "09:00:00", time_out: "17:00:00" },
        { id: "a3", day_of_week: 1, week_start: NEXT_WEEK_START, role_key: "מטבח", time_in: "10:00:00", time_out: "18:00:00" },
      ],
      error: null,
    }));
    const res = await getUpcomingShifts(ctx);
    if ("error" in res) throw new Error("unexpected error");
    expect(res.shifts.map(s => s.id)).toEqual(["a2", "a3"]);
    expect(res.shifts[0].week).toBe("השבוע");
    expect(res.shifts[1].week).toBe("שבוע הבא");
    expect(res.shifts[0].timeIn).toBe("09:00");
  });
});

describe("getScheduleForDate", () => {
  it("maps assignment rows with embedded person name", async () => {
    const { getScheduleForDate } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({
      data: [{ role_key: "מלצרים", time_in: "08:00:00", time_out: "16:00:00", people: { name: "שירה כהן" } }],
      error: null,
    }));
    const res = await getScheduleForDate(ctx, "2026-06-23");
    if ("error" in res) throw new Error("unexpected error");
    expect(res.working).toEqual([{ name: "שירה כהן", role: "מלצרים", timeIn: "08:00", timeOut: "16:00" }]);
  });

  it("falls back to empty name when person relation is missing", async () => {
    const { getScheduleForDate } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({
      data: [{ role_key: "בר", time_in: "18:00:00", time_out: "02:00:00", people: null }],
      error: null,
    }));
    const res = await getScheduleForDate(ctx, "2026-06-23");
    if ("error" in res) throw new Error("unexpected error");
    expect(res.working[0].name).toBe("");
  });

  it("resolves the correct week_start/day_of_week for an arbitrary future date (regression: was hardcoded to 'today')", async () => {
    const { getScheduleForDate } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({ data: [], error: null }));
    await getScheduleForDate(ctx, "2026-06-24"); // Wednesday, the day after the frozen "today"
    const calls = fromMock.mock.results[0].value;
    expect(calls.eq).toHaveBeenCalledWith("week_start", "2026-06-21");
    expect(calls.eq).toHaveBeenCalledWith("day_of_week", 3);
  });
});

describe("respondToRequest", () => {
  it("rejects non-managers", async () => {
    const { respondToRequest } = await import("./tools");
    const res = await respondToRequest(ctx, { requestId: "r1", requestType: "absence", approve: true });
    expect(res).toEqual({ error: "רק מנהל יכול לאשר או לדחות בקשות" });
  });

  it("rejects approving a swap with no proposed replacement", async () => {
    const { respondToRequest } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({ data: { assignment_id: "a1", proposed_person: null }, error: null }));
    const res = await respondToRequest({ ...ctx, isManager: true }, { requestId: "r1", requestType: "swap", approve: true });
    expect(res).toEqual({ error: "לא הוצע עובד מחליף לבקשה הזו" });
  });
});

describe("getMostRecentPendingNotification", () => {
  it("rejects non-managers", async () => {
    const { getMostRecentPendingNotification } = await import("./tools");
    const res = await getMostRecentPendingNotification(ctx);
    expect(res).toEqual({ error: "רק מנהל יכול לראות את זה" });
  });

  it("returns null notification when there is nothing pending", async () => {
    const { getMostRecentPendingNotification } = await import("./tools");
    fromMock.mockReturnValueOnce(makeChainable({ data: null, error: null }));
    const res = await getMostRecentPendingNotification({ ...ctx, isManager: true });
    expect(res).toEqual({ notification: null });
  });
});
