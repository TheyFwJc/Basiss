import { test, expect } from "@playwright/test";

test("a new user can sign up, add a trading account, edit it, and delete it", async ({
  page,
}) => {
  const uniqueEmail = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("E2E Test User");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Add a trading account to get started")).toBeVisible();

  await page.getByRole("button", { name: "Add your first account" }).click();
  await page.getByLabel("Name").fill("E2E Brokerage");
  await page.getByLabel("Starting balance").fill("10000");
  await page.getByRole("button", { name: "Add account" }).click();

  await expect(page.getByText("E2E Brokerage")).toBeVisible();

  await page.goto("/accounts");
  await expect(
    page.getByRole("cell", { name: "E2E Brokerage", exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: /^Actions for/ }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Name").fill("E2E Brokerage (renamed)");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("E2E Brokerage (renamed)")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: /^Actions for/ }).click();
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
  const confirmDialog = page.getByRole("alertdialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Delete" }).click({ force: true });
  await expect(page.getByText("No trading accounts yet")).toBeVisible();
});
