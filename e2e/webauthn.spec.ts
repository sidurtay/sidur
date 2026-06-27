import { test, expect } from "@playwright/test";
import type { CDPSession } from "@playwright/test";

function uniquePhone() {
  const suffix = Math.floor(1000000 + Math.random() * 8999999);
  return `054${suffix}`;
}

// The app stores/returns phone numbers dash-formatted ("054-1234567") — the
// raw uniquePhone() digits won't match what actually ends up in localStorage.
function dashFormat(rawDigits: string) {
  return `${rawDigits.slice(0, 3)}-${rawDigits.slice(3)}`;
}

// Drives the real WebAuthn ceremony end-to-end using a Chrome DevTools Protocol
// virtual authenticator — there's no physical fingerprint sensor in CI/headless,
// but the virtual authenticator implements the same browser-side WebAuthn API
// surface (navigator.credentials.create/get) that a real platform authenticator
// would, so this exercises the full register → login round trip for real.
async function addVirtualAuthenticator(cdp: CDPSession) {
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return authenticatorId;
}

test("manager can register a passkey and log back in with it", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await addVirtualAuthenticator(cdp);

  const bizName = `עסק טביעת אצבע ${Date.now()}`;
  const phone = uniquePhone();
  const password = "test1234";

  await page.goto("/register");
  await page.getByPlaceholder("קפה קפה נהריה").fill(bizName);
  await page.getByPlaceholder("נהריה", { exact: true }).fill("ירושלים");
  await page.getByText("בית קפה").click();
  await page.getByRole("button", { name: "המשך" }).click();

  await page.getByPlaceholder("איתי כהן").fill("מנהל טביעת אצבע");
  await page.getByPlaceholder("05X-XXXXXXX").fill(phone);
  await page.getByPlaceholder("itay@example.com").fill(`webauthn.${Date.now()}@example.com`);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "המשך" }).click();

  await page.getByRole("button", { name: /התחל עם תוכנית/ }).click();
  await expect(page.getByText("ברוכים הבאים!")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "כניסה לאפליקציה" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Register the passkey from the settings page
  await page.goto("/settings");
  const enableButton = page.getByRole("button", { name: "הפעל כניסה בטביעת אצבע" });
  await expect(enableButton).toBeVisible({ timeout: 10000 });
  await enableButton.click();
  await expect(page.getByText("מופעל", { exact: true })).toBeVisible({ timeout: 10000 });

  // Confirm the device-local flag the login page checks for is set
  const savedPhone = await page.evaluate(() => localStorage.getItem("shiftpro_webauthn_phone"));
  expect(savedPhone).toBe(dashFormat(phone));

  // Simulate a fresh login: clear the session but keep the device's passkey flag
  await page.evaluate(() => localStorage.removeItem("shiftpro_session"));
  await page.goto("/login");

  const fingerprintButton = page.getByRole("button", { name: /כניסה בטביעת אצבע/ });
  await expect(fingerprintButton).toBeVisible({ timeout: 10000 });
  await fingerprintButton.click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("shiftpro_session") || "{}"));
  expect(session.phone).toBe(dashFormat(phone));
});
