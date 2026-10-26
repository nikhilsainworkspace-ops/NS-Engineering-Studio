import { test, expect } from "@playwright/test";

test("public home shows the brand, real contact number, and working navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "7703977002", exact: true })).toHaveAttribute("href", "tel:7703977002");
  await expect(page.getByRole("link", { name: /Explore services/ }).first()).toHaveAttribute("href", "/services");
  await page.getByRole("link", { name: "Services", exact: true }).first().click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Work shaped around");
});

test("contact form requires valid fields and consent before submission", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const name = page.getByLabel("Your name");
  await expect(name).toBeVisible();
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.getByLabel("Your name")).toHaveAttribute("required", "");
  await expect(page.getByLabel(/I agree that my details/)).toBeVisible();
});

test("anonymous requests are redirected away from admin data", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText(/There is no default or demo account/)).toBeVisible();
});

test("unknown routes produce a real not-found response", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist-314159");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /page not found|this path goes/i })).toBeVisible();
});
