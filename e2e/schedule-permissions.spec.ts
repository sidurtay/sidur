import { test, expect } from "@playwright/test";

// Registers a fresh business per run so the test owns its own data end-to-end.
function uniquePhone() {
  const suffix = Math.floor(1000000 + Math.random() * 8999999);
  return `050${suffix}`;
}

test.describe("editSchedule permission gates /schedule mutation controls", () => {
  const bizName = `בדיקת הרשאות ${Date.now()}`;
  const managerName = "מנהל בדיקה";
  const managerPhone = uniquePhone();
  const managerEmail = `manager.${Date.now()}@example.com`;
  const managerPassword = "test1234";

  const employeeName = "עובד בדיקה";
  const employeePhone = uniquePhone();
  const employeeEmail = `employee.${Date.now()}@example.com`;
  const employeeRole = "מלצרים"; // seeded default role for a new business
  let employeeTempPassword = "";

  test("manager registers, adds an employee, and the employee starts read-only on /schedule", async ({ page }) => {
    // Register the business as a manager.
    await page.goto("/register");
    await page.getByPlaceholder("קפה קפה נהריה").fill(bizName);
    await page.getByPlaceholder("נהריה", { exact: true }).fill("תל אביב");
    await page.getByText("בית קפה").click();
    await page.getByRole("button", { name: "המשך" }).click();

    await page.getByPlaceholder("איתי כהן").fill(managerName);
    await page.getByPlaceholder("05X-XXXXXXX").fill(managerPhone);
    await page.getByPlaceholder("itay@example.com").fill(managerEmail);
    await page.getByPlaceholder("••••••••").fill(managerPassword);
    await page.getByRole("button", { name: "המשך" }).click();

    await page.getByRole("button", { name: /התחל עם תוכנית/ }).click();
    await expect(page.getByText("ברוכים הבאים!")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "כניסה לאפליקציה" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Add a non-manager employee with the default "מלצרים" role (no editSchedule by default).
    await page.goto("/employees");
    await page.getByText("הוספת עובד חדש").waitFor({ state: "hidden" }).catch(() => {});
    await page.locator("div.cursor-pointer").first().click();
    await page.getByPlaceholder("לדוגמא: יוסי כהן").fill(employeeName);
    await page.getByPlaceholder("052-XXXXXXX").fill(employeePhone);
    await page.getByPlaceholder("name@example.com").fill(employeeEmail);
    await page.getByText("הוספת עובד חדש").locator("..").locator("..")
      .getByRole("button", { name: employeeRole, exact: true }).click();
    await page.getByRole("button", { name: "הוסף עובד ושלח פרטי כניסה" }).click();

    const tempPwLocator = page.locator("span.font-bold").first();
    await expect(tempPwLocator).toBeVisible({ timeout: 10000 });
    employeeTempPassword = (await tempPwLocator.textContent())?.trim() || "";
    expect(employeeTempPassword.length).toBeGreaterThan(0);

    // Manager confirms full edit access on /schedule.
    await page.goto("/schedule");
    await expect(page.getByText("סידור עבודה")).toBeVisible();
    await expect(page.getByText(/הוסף ל/).first()).toBeVisible();
    await expect(page.getByText("הוסף תפקיד לסידור")).toBeVisible();

    // Log out, log the employee in (forced password change on first login).
    await page.evaluate(() => localStorage.removeItem("shiftpro_session"));
    await page.goto("/login");
    await page.getByPlaceholder("05X-XXXXXXX").fill(employeePhone);
    await page.getByPlaceholder("••••••••").fill(employeeTempPassword);
    await page.getByRole("button", { name: "כניסה" }).click();

    await expect(page).toHaveURL(/\/change-password/, { timeout: 10000 });
    const newEmployeePassword = "employee1234";
    await page.getByPlaceholder("בחר סיסמה חדשה").fill(newEmployeePassword);
    await page.getByPlaceholder("הכנס שוב את הסיסמה").fill(newEmployeePassword);
    await page.getByRole("button", { name: "שמור וכנס לאפליקציה" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Employee without editSchedule sees a read-only schedule: no add/swap/remove/edit-time/add-role controls.
    await page.goto("/schedule");
    await expect(page.getByText("סידור עבודה")).toBeVisible();
    await expect(page.getByText(/הוסף ל/)).toHaveCount(0);
    await expect(page.getByText("הוסף תפקיד לסידור")).toHaveCount(0);

    // Direct navigation to the manager-only AI scheduler must bounce back to /schedule.
    await page.goto("/schedule/ai");
    await expect(page).toHaveURL(/\/schedule$/, { timeout: 10000 });

    // Defense in depth: a raw API call (bypassing the UI entirely) must also be rejected server-side.
    const session = JSON.parse((await page.evaluate(() => localStorage.getItem("shiftpro_session"))) || "{}");
    const directApiAttempt = await page.evaluate(async ({ businessId, personId }) => {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, weekStart: "2026-06-21", dayOfWeek: 0,
          personId, roleKey: "מלצרים", timeIn: "09:00", timeOut: "17:00",
          callerId: personId,
        }),
      });
      return { status: res.status, body: await res.json() };
    }, { businessId: session.businessId, personId: session.personId });
    expect(directApiAttempt.status).toBe(403);

    // Defense in depth: the employee can't self-escalate by PATCHing role-permissions directly.
    const escalationAttempt = await page.evaluate(async ({ businessId, personId }) => {
      const res = await fetch("/api/role-permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, roleKey: "מלצרים", perms: { editSchedule: true }, callerId: personId,
        }),
      });
      return { status: res.status };
    }, { businessId: session.businessId, personId: session.personId });
    expect(escalationAttempt.status).toBe(403);

    // Log back in as manager, grant the role editSchedule via settings.
    await page.evaluate(() => localStorage.removeItem("shiftpro_session"));
    await page.goto("/login");
    await page.getByPlaceholder("05X-XXXXXXX").fill(managerPhone);
    await page.getByPlaceholder("••••••••").fill(managerPassword);
    await page.getByRole("button", { name: "כניסה" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await page.goto("/settings");
    await page.getByRole("button", { name: employeeRole, exact: true }).click();
    await expect(page.getByText(`הרשאות — ${employeeRole}`)).toBeVisible();
    await page.getByText("עריכת סידור עבודה").click();
    await page.getByRole("button", { name: "סיום" }).click();
    const permsSaved = page.waitForResponse(r => r.url().includes("/api/role-permissions") && r.request().method() === "PATCH");
    await page.getByRole("button", { name: /שמור/ }).click();
    // If the active config already had non-permission changes, a save-scope modal appears first.
    const permanentScopeButton = page.getByText("לתמיד");
    if (await permanentScopeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await permanentScopeButton.click();
    }
    await permsSaved;

    // Employee now has edit access.
    await page.evaluate(() => localStorage.removeItem("shiftpro_session"));
    await page.goto("/login");
    await page.getByPlaceholder("05X-XXXXXXX").fill(employeePhone);
    await page.getByPlaceholder("••••••••").fill(newEmployeePassword);
    await page.getByRole("button", { name: "כניסה" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await page.goto("/schedule");
    await expect(page.getByText(/הוסף ל/).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("הוסף תפקיד לסידור")).toBeVisible();
  });
});
