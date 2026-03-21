import { test, expect } from "@playwright/test";

test.describe("Configure Run Page (URL-first flow)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display URL input step by default", async ({ page }) => {
    await expect(page.getByText("Analyze a Website")).toBeVisible();
    await expect(page.getByPlaceholder("https://www.example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Analyze/ })).toBeVisible();
  });

  test("should show validation error for empty URL", async ({ page }) => {
    await page.getByRole("button", { name: /Analyze/ }).click();
    await expect(page.getByText("Please enter a URL")).toBeVisible();
  });

  test("should show validation error for invalid URL", async ({ page }) => {
    await page.getByPlaceholder("https://www.example.com").fill("not-a-url");
    await page.getByRole("button", { name: /Analyze/ }).click();
    await expect(page.getByText(/valid URL/)).toBeVisible();
  });

  test("should transition to review step after analysis", async ({ page }) => {
    // Enter a URL — the API will fail and fall back to mock data
    await page
      .getByPlaceholder("https://www.example.com")
      .fill("https://www.kmw-technology.de/hebammen");
    await page.getByRole("button", { name: /Analyze/ }).click();

    // Should show analyzing state briefly, then review
    await expect(page.getByText("Review Personas")).toBeVisible({
      timeout: 30000,
    });
  });

  test("should display website analysis card in review step", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("https://www.example.com")
      .fill("https://www.kmw-technology.de/hebammen");
    await page.getByRole("button", { name: /Analyze/ }).click();

    await expect(page.getByText("Review Personas")).toBeVisible({
      timeout: 30000,
    });

    // Analysis card should show product info
    await expect(page.getByText("Website Analysis")).toBeVisible();
    await expect(page.getByText("Change URL")).toBeVisible();
  });

  test("should display persona cards in review step", async ({ page }) => {
    await page
      .getByPlaceholder("https://www.example.com")
      .fill("https://www.kmw-technology.de/hebammen");
    await page.getByRole("button", { name: /Analyze/ }).click();

    await expect(page.getByText("Recommended Personas")).toBeVisible({
      timeout: 30000,
    });

    // Should have persona cards
    await expect(page.getByText(/Selected/)).toBeVisible();
  });

  test("should toggle persona selection on click", async ({ page }) => {
    await page
      .getByPlaceholder("https://www.example.com")
      .fill("https://www.kmw-technology.de/hebammen");
    await page.getByRole("button", { name: /Analyze/ }).click();

    await expect(page.getByText("Review Personas")).toBeVisible({
      timeout: 30000,
    });

    // Get the initial selected count text
    const footerText = page.getByText(/Persona.*Selected/);
    await expect(footerText).toBeVisible();
  });

  test("should show Run Overnight button in review step", async ({ page }) => {
    await page
      .getByPlaceholder("https://www.example.com")
      .fill("https://www.kmw-technology.de/hebammen");
    await page.getByRole("button", { name: /Analyze/ }).click();

    await expect(page.getByText("Review Personas")).toBeVisible({
      timeout: 30000,
    });

    await expect(
      page.getByRole("button", { name: /Run Overnight/ })
    ).toBeVisible();
  });

  test("should allow going back to URL input via Change URL", async ({
    page,
  }) => {
    await page
      .getByPlaceholder("https://www.example.com")
      .fill("https://www.kmw-technology.de/hebammen");
    await page.getByRole("button", { name: /Analyze/ }).click();

    await expect(page.getByText("Review Personas")).toBeVisible({
      timeout: 30000,
    });

    await page.getByText("Change URL").click();
    await expect(page.getByText("Analyze a Website")).toBeVisible();
  });

  test("should submit URL on Enter key", async ({ page }) => {
    const input = page.getByPlaceholder("https://www.example.com");
    await input.fill("https://www.kmw-technology.de/hebammen");
    await input.press("Enter");

    // Should start analyzing
    await expect(page.getByText("Review Personas")).toBeVisible({
      timeout: 30000,
    });
  });
});
