import { test, expect } from "@playwright/test";

function uniquePhone() {
  const suffix = Math.floor(1000000 + Math.random() * 8999999);
  return `052${suffix}`;
}

// Registers a fresh business + manager, then drives the floating AI chat drawer
// through the real UI to confirm the free rule-based assistant (intentMatcher +
// lib/ai/tools) is wired correctly end-to-end, not just at the API layer.
test("manager can open the AI assistant and ask about pending requests", async ({ page }) => {
  const bizName = `עסק AI ${Date.now()}`;
  const phone = uniquePhone();
  const password = "test1234";

  await page.goto("/register");
  await page.getByPlaceholder("קפה קפה נהריה").fill(bizName);
  await page.getByPlaceholder("נהריה", { exact: true }).fill("חיפה");
  await page.getByText("בית קפה").click();
  await page.getByRole("button", { name: "המשך" }).click();

  await page.getByPlaceholder("איתי כהן").fill("מנהל AI");
  await page.getByPlaceholder("05X-XXXXXXX").fill(phone);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "המשך" }).click();

  await page.getByRole("button", { name: /התחל עם תוכנית/ }).click();
  await expect(page.getByText("ברוכים הבאים!")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "כניסה לאפליקציה" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const aiButton = page.getByRole("button", { name: "פתח עוזר AI" });
  await expect(aiButton).toBeVisible({ timeout: 10000 });
  // The button has a perpetual breathing/wink CSS animation, so Playwright's
  // "wait until stable" actionability check never resolves — force the click.
  await aiButton.click({ force: true });

  const chatInput = page.getByPlaceholder("שאל אותי משהו...");
  await expect(chatInput).toBeVisible();

  await chatInput.fill("שלום");
  await chatInput.press("Enter");
  await expect(page.getByText(/איך אפשר לעזור/)).toHaveCount(1, { timeout: 10000 });

  await chatInput.fill("בקשות ממתינות");
  await chatInput.press("Enter");
  await expect(page.getByText(/אין בקשות ממתינות כרגע/)).toBeVisible({ timeout: 10000 });
});
