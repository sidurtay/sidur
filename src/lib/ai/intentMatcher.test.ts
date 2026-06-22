import { describe, it, expect } from "vitest";
import { matchIntent } from "./intentMatcher";

describe("matchIntent — greeting", () => {
  it("matches Hebrew greetings (regression: \\b never matched Hebrew letters)", () => {
    expect(matchIntent("שלום", false).intent).toBe("greeting");
    expect(matchIntent("היי", false).intent).toBe("greeting");
    expect(matchIntent("הי", false).intent).toBe("greeting");
    expect(matchIntent("שלום!", false).intent).toBe("greeting");
    expect(matchIntent("שלום, מה קורה", false).intent).toBe("greeting");
  });

  it("matches English greetings", () => {
    expect(matchIntent("hi", false).intent).toBe("greeting");
    expect(matchIntent("hello there", false).intent).toBe("greeting");
  });

  it("does not match greeting when the word appears mid-sentence", () => {
    expect(matchIntent("מתישהו אמרתי שלום", false).intent).not.toBe("greeting");
  });
});

describe("matchIntent — hours", () => {
  it("matches hours questions in Hebrew and English", () => {
    expect(matchIntent("כמה שעות עבדתי החודש?", false).intent).toBe("hours");
    expect(matchIntent("how many hours did I work", false).intent).toBe("hours");
  });

  it("extracts month from Hebrew month name", () => {
    const res = matchIntent("כמה שעות עבדתי ביוני?", false);
    expect(res.intent).toBe("hours");
    expect(res.month).toBe("2026-06");
  });

  it("extracts current month for 'החודש'", () => {
    const res = matchIntent("כמה שעות עבדתי החודש?", false);
    expect(res.month).toBe("2026-06");
  });

  it("leaves month undefined when not specified", () => {
    const res = matchIntent("כמה שעות עבדתי?", false);
    expect(res.month).toBeUndefined();
  });
});

describe("matchIntent — upcoming_shifts / today_schedule / swap_requests_list", () => {
  it("matches upcoming shifts", () => {
    expect(matchIntent("מתי המשמרות הקרובות שלי?", false).intent).toBe("upcoming_shifts");
    expect(matchIntent("when do I work", false).intent).toBe("upcoming_shifts");
  });

  it("matches today's schedule", () => {
    expect(matchIntent("מי עובד היום?", false).intent).toBe("schedule_for_date");
    expect(matchIntent("who is working today", false).intent).toBe("schedule_for_date");
  });

  it("matches schedule lookups for other days too (regression: only 'today' used to work)", () => {
    const tomorrow = matchIntent("מי עובד מחר?", false);
    expect(tomorrow.intent).toBe("schedule_for_date");
    expect(tomorrow.date).toBe("2026-06-24");

    const weekday = matchIntent("מי עובד בשבת?", false);
    expect(weekday.intent).toBe("schedule_for_date");
    expect(weekday.date).toBe("2026-06-27");
  });

  it("matches swap requests list", () => {
    expect(matchIntent("יש בקשות החלפה?", false).intent).toBe("swap_requests_list");
  });
});

describe("matchIntent — create_absence", () => {
  it("extracts 'tomorrow' as a date (regression: \\bמחר\\b never matched)", () => {
    const res = matchIntent("אני רוצה לבקש חופש מחר", false);
    expect(res.intent).toBe("create_absence");
    expect(res.date).toBe("2026-06-24");
  });

  it("extracts 'today' as a date (regression: \\bהיום\\b never matched)", () => {
    const res = matchIntent("אני רוצה לבקש חופש היום", false);
    expect(res.intent).toBe("create_absence");
    expect(res.date).toBe("2026-06-23");
  });

  it("extracts an explicit DD.MM date", () => {
    const res = matchIntent("אני רוצה לבקש חופש ב-1.7 כי יש לי חתונה", false);
    expect(res.intent).toBe("create_absence");
    expect(res.date).toBe("2026-07-01");
    expect(res.reason).toContain("חתונה");
  });

  it("matches without a date and leaves date undefined", () => {
    const res = matchIntent("אני רוצה לבקש חופש", false);
    expect(res.intent).toBe("create_absence");
    expect(res.date).toBeUndefined();
  });
});

describe("matchIntent — create_swap", () => {
  it("matches a swap request and extracts the proposed person", () => {
    const res = matchIntent("אני רוצה להחליף משמרת עם דנה", false);
    expect(res.intent).toBe("create_swap");
    expect(res.proposedPersonName).toBe("דנה");
  });

  it("matches a swap request without a named person", () => {
    const res = matchIntent("אני רוצה להחליף משמרת", false);
    expect(res.intent).toBe("create_swap");
    expect(res.proposedPersonName).toBeUndefined();
  });
});

describe("matchIntent — manager-only intents", () => {
  it("matches manager_pending only when isManager is true", () => {
    expect(matchIntent("בקשות ממתינות", true).intent).toBe("manager_pending");
    expect(matchIntent("בקשות ממתינות", false).intent).not.toBe("manager_pending");
  });

  it("matches approve_last/deny_last only for managers", () => {
    expect(matchIntent("אשר את הבקשה האחרונה", true).intent).toBe("approve_last");
    expect(matchIntent("אשר את הבקשה האחרונה", false).intent).not.toBe("approve_last");
    expect(matchIntent("דחה את הבקשה האחרונה", true).intent).toBe("deny_last");
    expect(matchIntent("דחה את הבקשה האחרונה", false).intent).not.toBe("deny_last");
  });
});

describe("matchIntent — unknown fallback", () => {
  it("falls back to unknown for unrecognized text", () => {
    expect(matchIntent("בלה בלה משהו לא קשור", false).intent).toBe("unknown");
    expect(matchIntent("asdkjasdkj", false).intent).toBe("unknown");
  });
});
