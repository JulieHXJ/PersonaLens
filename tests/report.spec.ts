import { test, expect } from "@playwright/test";

test.describe("Morning Report Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/report");
    await page.waitForLoadState("networkidle");
  });

  test("should display the demand gauge", async ({ page }) => {
    await expect(page.getByText("76%").first()).toBeVisible();
    await expect(page.getByText("Strong Signal")).toBeVisible();
  });

  test("should show expressed intent stats", async ({ page }) => {
    await expect(page.getByText("Expressed Intent")).toBeVisible();
  });

  test("should display all tab navigation items", async ({ page }) => {
    for (const tab of [
      "01. Heatmap",
      "02. Willingness",
      "03. Killer Quotes",
      "04. Objections",
      "05. Priorities",
      "06. Competitive",
      "07. Deep Dive",
    ]) {
      await expect(page.getByRole("button", { name: tab })).toBeVisible();
    }
  });

  test("should display the demand heatmap", async ({ page }) => {
    await expect(
      page.getByText("Demand Heatmap: Segments vs Features")
    ).toBeVisible();
  });

  test("should show the insight card", async ({ page }) => {
    await expect(
      page.getByText("Infrastructure dominance is the play.")
    ).toBeVisible();
  });

  test("should display willingness to pay section", async ({ page }) => {
    await expect(page.getByText("Willingness to Pay Curve")).toBeVisible();
    await expect(page.getByText(/Sweet Spot/)).toBeVisible();
  });

  test("should show killer quotes", async ({ page }) => {
    await expect(page.getByText("Buy Signals")).toBeVisible();
    await expect(page.getByText("Surprises")).toBeVisible();
  });

  test("should display objection matrix", async ({ page }) => {
    await expect(page.getByText("Objection Matrix")).toBeVisible();
    await expect(page.getByText("Pricing Complexity")).toBeVisible();
  });

  test("should show feature priorities", async ({ page }) => {
    await expect(page.getByText("Feature Priority Tiered List")).toBeVisible();
  });

  test("should display competitive landscape", async ({ page }) => {
    await expect(
      page.getByText("Competitive Landscape (Preference Score)")
    ).toBeVisible();
    await expect(page.getByText("NIGHTSHIFT")).toBeVisible();
  });

  test("should show segment deep dive cards", async ({ page }) => {
    await expect(page.getByText("Segment Deep Dive")).toBeVisible();
    await expect(page.getByText("Global Enterprise")).toBeVisible();
    await expect(page.getByText("Scale-up Series B")).toBeVisible();
  });

  test("should switch active tab on click", async ({ page }) => {
    const tab = page.getByRole("button", { name: "02. Willingness" });
    await tab.click();
    await expect(tab).toHaveClass(/text-primary/);
  });
});
