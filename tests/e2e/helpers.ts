import type { Page } from "@playwright/test";

/**
 * New users land on /dashboard behind a full-screen welcome overlay and a
 * spotlight product tour (see WelcomeExperience/ProductTour). Call this right
 * after signup so later assertions/interactions aren't blocked by it.
 */
export async function dismissOnboarding(page: Page) {
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.getByLabel("Skip tour").click({ timeout: 5000 }).catch(() => {});
}
