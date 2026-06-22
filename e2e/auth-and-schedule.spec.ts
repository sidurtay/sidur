import { test, expect } from "@playwright/test";

// Each run registers a brand-new business so the test owns its own credentials
// end-to-end (no dependency on hand-seeded data with unknown plaintext passwords).
function uniquePhone() {
  // Israeli-looking mobile number, last 7 digits randomized per run to dodge collisions.
  const suffix = Math.floor(1000000 + Math.random() * 8999999);
  return `050${suffix}`;
}

test.describe("registration → manager login → schedule", () => {
  const bizName = `בדיקה אוטומטית ${Date.now()}`;
  const managerName = "מנהל בדיקה";
  const phone = uniquePhone();
  const password = "test1234";

  test("a new manager can register, land on the dashboard, and see the schedule", async ({ page }) => {
    await page.goto("/register");

    // Step 1 — business details
    await page.getByPlaceholder("קפה קפה נהריה").fill(bizName);
    await page.getByPlaceholder("נהריה", { exact: true }).fill("תל אביב");
    await page.getByText("בית קפה").click();
    await page.getByRole("button", { name: "המשך" }).click();

    // Step 2 — manager details
    await page.getByPlaceholder("איתי כהן").fill(managerName);
    await page.getByPlaceholder("05X-XXXXXXX").fill(phone);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: "המשך" }).click();

    // Step 3 — plan (default "business" plan is preselected) → finish
    await page.getByRole("button", { name: /התחל עם תוכנית/ }).click();

    // Step 4 — success screen
    await expect(page.getByText("ברוכים הבאים!")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(bizName)).toBeVisible();

    await page.getByRole("button", { name: "כניסה לאפליקציה" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(new RegExp(managerName.split(" ")[0]))).toBeVisible();

    // Now log out (clear session) and log back in with the same credentials, end-to-end
    // through the real /api/auth/login route — proves the registered password actually works.
    await page.evaluate(() => localStorage.removeItem("shiftpro_session"));
    await page.goto("/login");
    await page.getByPlaceholder("05X-XXXXXXX").fill(phone);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: "כניסה" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Schedule page should load for the newly created business without errors
    await page.goto("/schedule");
    await expect(page.getByText("סידור עבודה")).toBeVisible();
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("05X-XXXXXXX").fill(phone);
    await page.getByPlaceholder("••••••••").fill("wrong-password");
    await page.getByRole("button", { name: "כניסה" }).click();
    await expect(page.getByText("טלפון או סיסמה שגויים")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
