import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should load the Configure page by default", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Nightshift/);
    await expect(page.getByText("Analyze a Website")).toBeVisible();
  });

  test("should navigate to Live Progress page via sidebar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Live Progress" }).first().click();
    await expect(page).toHaveURL(/\/progress/);
    await expect(page.getByText("#NS-992-ALPHA")).toBeVisible();
  });

  test("should navigate to Morning Report page via sidebar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Morning Report" }).first().click();
    await expect(page).toHaveURL(/\/report/);
    await expect(page.getByText("Morning Report").first()).toBeVisible();
  });

  test("should highlight active nav item in sidebar", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");
    const progressLink = page
      .locator("aside")
      .getByRole("link", { name: "Live Progress" });
    await expect(progressLink).toHaveClass(/text-\[#A4C9FF\]/);
  });
});
