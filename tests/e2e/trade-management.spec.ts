import { test, expect } from "@playwright/test";
import { dismissOnboarding } from "./helpers";

test("a user can log a trade and see P&L and R calculated automatically", async ({
  page,
}) => {
  const uniqueEmail = `e2e-trade-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Trade E2E User");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await dismissOnboarding(page);

  await page.getByRole("button", { name: "Add your first account" }).click();
  await page.getByLabel("Name").fill("E2E Trading Account");
  await page.getByLabel("Starting balance").fill("50000");
  await page.getByRole("button", { name: "Add account" }).click();
  await expect(page.getByText("E2E Trading Account")).toBeVisible();

  await page.goto("/trades/new");
  await page.getByPlaceholder("AAPL").fill("MSFT");

  const numberInputs = page.locator('input[type="number"]');
  await numberInputs.nth(0).fill("50"); // entry quantity
  await numberInputs.nth(1).fill("100"); // entry price

  await numberInputs.nth(4).fill("50"); // exit quantity
  await numberInputs.nth(5).fill("120"); // exit price

  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL(/\/trades\/[a-z0-9]+$/);

  await expect(page.getByText("$1,000.00").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "MSFT" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Total P&L").first()).toBeVisible();
  await expect(page.getByText("$1,000.00").first()).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible(); // win rate with one winning trade

  await page.goto("/trades");
  await expect(page.getByRole("cell", { name: "MSFT" })).toBeVisible();

  await page.getByRole("cell", { name: "MSFT" }).click();
  await expect(page).toHaveURL(/\/trades\/[a-z0-9]+$/);
  await page.getByRole("button", { name: "Delete" }).click();
  const confirmDialog = page.getByRole("alertdialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Delete" }).click({ force: true });
  await expect(page.getByText("No trades logged yet")).toBeVisible();
});
