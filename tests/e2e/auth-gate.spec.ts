import { test, expect } from "@playwright/test";

test("landing page shows the marketing copy and links to auth pages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /know exactly how you trade/i })).toBeVisible();
  // Basis renders these as styled <a> elements via a Button component, which
  // exposes an accessible role of "button" rather than "link" by design.
  await expect(page.getByRole("button", { name: "Log in" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" }).first()).toBeVisible();
});

test("unauthenticated users are redirected away from the app to /login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
});

test("login and signup forms render their required fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
