import { test, expect } from "@playwright/test";

test.describe("Live Progress Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");
  });

  test("should display progress header with run ID", async ({ page }) => {
    await expect(page.getByText("#NS-992-ALPHA")).toBeVisible();
    await expect(page.getByText("82% COMPLETE")).toBeVisible();
  });

  test("should show progress bar", async ({ page }) => {
    const progressBar = page.locator(".from-primary.to-tertiary").first();
    await expect(progressBar).toBeVisible();
  });

  test("should display all four metric cards", async ({ page }) => {
    await expect(page.getByText("Total Personas")).toBeVisible();
    await expect(page.getByText("Generated")).toBeVisible();
    // "Interviews" text appears in both header and card
    await expect(
      page.locator("p", { hasText: "Interviews" }).first()
    ).toBeVisible();
    await expect(page.getByText("Token Load")).toBeVisible();
  });

  test("should show terminal log with entries", async ({ page }) => {
    await expect(
      page.getByText("kinetic-observer://logs/run-992.bash")
    ).toBeVisible();
    await expect(page.getByText("LIVE")).toBeVisible();
    await expect(page.getByText(/System boot successful/)).toBeVisible();
  });

  test("should show active interview details", async ({ page }) => {
    await expect(
      page.getByText(/Carlos, 38, architect/)
    ).toBeVisible();
  });

  test("should display persona distribution", async ({ page }) => {
    await expect(page.getByText("Persona Distribution")).toBeVisible();
    await expect(page.getByText("Demographic: Gen Z")).toBeVisible();
  });

  test("should show live insight card", async ({ page }) => {
    await expect(page.getByText("Live Insight")).toBeVisible();
    await expect(
      page.getByText(/Price sensitivity is trending lower/)
    ).toBeVisible();
  });

  test("should display time info", async ({ page }) => {
    await expect(page.getByText("ELAPSED")).toBeVisible();
    await expect(page.getByText("EST. REMAINING")).toBeVisible();
  });
});
