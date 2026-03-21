import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Website Evaluator - Playwright-based scraper for target website analysis.
 *
 * Usage:
 *   npx playwright test tests/evaluate-website.spec.ts
 *   BASE_URL not needed — this test navigates to external URLs directly.
 *
 * Environment variables:
 *   TARGET_URL - The website to evaluate (default: https://www.kmw-technology.de/hebammen)
 *   OUTPUT_DIR - Where to save results (default: ./artifacts/evaluations)
 */

const TARGET_URL =
  process.env.TARGET_URL || "https://www.kmw-technology.de/hebammen";
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ||
  path.join(process.cwd(), "artifacts", "evaluations");

interface PageEvaluation {
  url: string;
  title: string;
  metaDescription: string;
  headings: { level: string; text: string }[];
  paragraphs: string[];
  links: { text: string; href: string; isExternal: boolean }[];
  images: { alt: string; src: string }[];
  ctaButtons: string[];
  navigation: string[];
  contactInfo: string[];
  structuredData: Record<string, unknown>[];
  timestamp: string;
}

interface SiteEvaluation {
  targetUrl: string;
  pages: PageEvaluation[];
  summary: {
    totalPages: number;
    totalHeadings: number;
    totalImages: number;
    totalLinks: number;
    uniqueInternalLinks: string[];
    possibleProductFeatures: string[];
    possibleTargetAudience: string[];
  };
  timestamp: string;
}

test.describe("Website Evaluator", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  test("evaluate target website and extract structured data", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60000);

    const evaluation: SiteEvaluation = {
      targetUrl: TARGET_URL,
      pages: [],
      summary: {
        totalPages: 0,
        totalHeadings: 0,
        totalImages: 0,
        totalLinks: 0,
        uniqueInternalLinks: [],
        possibleProductFeatures: [],
        possibleTargetAudience: [],
      },
      timestamp: new Date().toISOString(),
    };

    // Step 1: Evaluate the main page
    console.log(`\n🔍 Evaluating: ${TARGET_URL}`);
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000); // Let dynamic content load

    // Take a full-page screenshot
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "main-page.png"),
      fullPage: true,
    });

    // Take a viewport screenshot
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "main-page-viewport.png"),
    });

    const mainPageData = await extractPageData(page, TARGET_URL);
    evaluation.pages.push(mainPageData);

    // Step 2: Discover and visit internal links (up to 5 subpages)
    const baseHost = new URL(TARGET_URL).host;
    const internalLinks = mainPageData.links
      .filter((l) => !l.isExternal && l.href.startsWith("http"))
      .map((l) => l.href)
      .filter((href) => {
        try {
          return new URL(href).host === baseHost;
        } catch {
          return false;
        }
      });

    const uniqueLinks = [...new Set(internalLinks)].slice(0, 5);
    evaluation.summary.uniqueInternalLinks = uniqueLinks;

    for (let i = 0; i < uniqueLinks.length; i++) {
      const link = uniqueLinks[i];
      console.log(`  📄 Subpage ${i + 1}/${uniqueLinks.length}: ${link}`);
      try {
        const subPage = await browser.newPage();
        await subPage.goto(link, { waitUntil: "networkidle", timeout: 15000 });
        await subPage.waitForTimeout(1000);

        await subPage.screenshot({
          path: path.join(OUTPUT_DIR, `subpage-${i + 1}.png`),
          fullPage: true,
        });

        const subPageData = await extractPageData(subPage, link);
        evaluation.pages.push(subPageData);
        await subPage.close();
      } catch (err) {
        console.log(`  ⚠️ Failed to evaluate ${link}: ${err}`);
      }
    }

    // Step 3: Build summary
    evaluation.summary.totalPages = evaluation.pages.length;
    evaluation.summary.totalHeadings = evaluation.pages.reduce(
      (sum, p) => sum + p.headings.length,
      0
    );
    evaluation.summary.totalImages = evaluation.pages.reduce(
      (sum, p) => sum + p.images.length,
      0
    );
    evaluation.summary.totalLinks = evaluation.pages.reduce(
      (sum, p) => sum + p.links.length,
      0
    );

    // Extract possible features from headings and paragraphs
    const allText = evaluation.pages
      .flatMap((p) => [
        ...p.headings.map((h) => h.text),
        ...p.paragraphs,
        ...p.ctaButtons,
      ])
      .filter(Boolean);

    evaluation.summary.possibleProductFeatures = allText
      .filter(
        (t) =>
          t.length > 10 &&
          t.length < 200 &&
          !t.includes("©") &&
          !t.includes("Cookie")
      )
      .slice(0, 20);

    // Step 4: Save results
    const outputPath = path.join(OUTPUT_DIR, "evaluation.json");
    fs.writeFileSync(outputPath, JSON.stringify(evaluation, null, 2));
    console.log(`\n✅ Evaluation saved to ${outputPath}`);

    // Generate a human-readable report
    const report = generateReport(evaluation);
    const reportPath = path.join(OUTPUT_DIR, "evaluation-report.txt");
    fs.writeFileSync(reportPath, report);
    console.log(`📋 Report saved to ${reportPath}`);

    // Assertions to ensure we extracted meaningful data
    expect(evaluation.pages.length).toBeGreaterThan(0);
    expect(evaluation.pages[0].title).toBeTruthy();
    expect(evaluation.pages[0].headings.length).toBeGreaterThan(0);
  });

  test("capture responsive views of target website", async ({ browser }) => {
    test.setTimeout(30000);

    const viewports = [
      { name: "desktop", width: 1920, height: 1080 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 375, height: 812 },
    ];

    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      await page.goto(TARGET_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(OUTPUT_DIR, `responsive-${vp.name}.png`),
        fullPage: true,
      });

      console.log(`📱 ${vp.name} screenshot captured (${vp.width}x${vp.height})`);
      await context.close();
    }
  });

  test("extract interaction patterns from target website", async ({
    page,
  }) => {
    test.setTimeout(30000);
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find all interactive elements
    const interactions = await page.evaluate(() => {
      const elements: {
        type: string;
        text: string;
        tag: string;
        classes: string;
      }[] = [];

      // Buttons
      document.querySelectorAll("button, [role='button']").forEach((el) => {
        elements.push({
          type: "button",
          text: (el as HTMLElement).innerText?.trim().substring(0, 100) || "",
          tag: el.tagName.toLowerCase(),
          classes: el.className?.toString().substring(0, 100) || "",
        });
      });

      // Forms
      document.querySelectorAll("form").forEach((el) => {
        const inputs = el.querySelectorAll("input, select, textarea");
        elements.push({
          type: "form",
          text: `Form with ${inputs.length} inputs`,
          tag: "form",
          classes: el.className?.toString().substring(0, 100) || "",
        });
      });

      // Clickable links styled as buttons
      document.querySelectorAll('a[class*="btn"], a[class*="button"], a[class*="cta"]').forEach((el) => {
        elements.push({
          type: "cta-link",
          text: (el as HTMLElement).innerText?.trim().substring(0, 100) || "",
          tag: "a",
          classes: el.className?.toString().substring(0, 100) || "",
        });
      });

      return elements;
    });

    const outputPath = path.join(OUTPUT_DIR, "interactions.json");
    fs.writeFileSync(outputPath, JSON.stringify(interactions, null, 2));
    console.log(
      `🖱️ Found ${interactions.length} interactive elements, saved to ${outputPath}`
    );

    // This test always passes — it's for data collection
    expect(true).toBe(true);
  });
});

async function extractPageData(
  page: import("@playwright/test").Page,
  url: string
): Promise<PageEvaluation> {
  return page.evaluate((pageUrl: string) => {
    const headings: { level: string; text: string }[] = [];
    document
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .forEach((h) =>
        headings.push({
          level: h.tagName.toLowerCase(),
          text: (h as HTMLElement).innerText?.trim().substring(0, 200) || "",
        })
      );

    const paragraphs: string[] = [];
    document.querySelectorAll("p").forEach((p) => {
      const text = (p as HTMLElement).innerText?.trim();
      if (text && text.length > 20) paragraphs.push(text.substring(0, 500));
    });

    const links: { text: string; href: string; isExternal: boolean }[] = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      const text = (a as HTMLElement).innerText?.trim().substring(0, 100) || "";
      const isExternal =
        href.startsWith("http") && !href.includes(window.location.host);
      links.push({ text, href, isExternal });
    });

    const images: { alt: string; src: string }[] = [];
    document.querySelectorAll("img").forEach((img) => {
      images.push({
        alt: (img as HTMLImageElement).alt || "",
        src: (img as HTMLImageElement).src?.substring(0, 200) || "",
      });
    });

    const ctaButtons: string[] = [];
    document.querySelectorAll("button, a.btn, [role='button']").forEach((b) => {
      const text = (b as HTMLElement).innerText?.trim();
      if (text) ctaButtons.push(text.substring(0, 100));
    });

    const navigation: string[] = [];
    document.querySelectorAll("nav a, header a").forEach((a) => {
      const text = (a as HTMLElement).innerText?.trim();
      if (text) navigation.push(text.substring(0, 100));
    });

    // Extract contact info patterns
    const bodyText = document.body.innerText || "";
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const phonePattern =
      /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    const contactInfo = [
      ...(bodyText.match(emailPattern) || []),
      ...(bodyText.match(phonePattern) || []).slice(0, 5),
    ];

    // Extract structured data (JSON-LD)
    const structuredData: Record<string, unknown>[] = [];
    document
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((s) => {
        try {
          structuredData.push(JSON.parse(s.textContent || ""));
        } catch {
          // ignore parse errors
        }
      });

    const metaDesc =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || "";

    return {
      url: pageUrl,
      title: document.title || "",
      metaDescription: metaDesc,
      headings,
      paragraphs,
      links,
      images,
      ctaButtons,
      navigation,
      contactInfo,
      structuredData,
      timestamp: new Date().toISOString(),
    } as PageEvaluation;
  }, url);
}

function generateReport(evaluation: SiteEvaluation): string {
  const lines: string[] = [];
  lines.push("=" .repeat(60));
  lines.push("NIGHTSHIFT WEBSITE EVALUATION REPORT");
  lines.push("=".repeat(60));
  lines.push(`Target: ${evaluation.targetUrl}`);
  lines.push(`Date: ${evaluation.timestamp}`);
  lines.push(`Pages analyzed: ${evaluation.summary.totalPages}`);
  lines.push("");

  for (const page of evaluation.pages) {
    lines.push("-".repeat(40));
    lines.push(`PAGE: ${page.url}`);
    lines.push(`Title: ${page.title}`);
    lines.push(`Meta: ${page.metaDescription}`);
    lines.push("");

    if (page.headings.length > 0) {
      lines.push("HEADINGS:");
      page.headings.forEach((h) => lines.push(`  [${h.level}] ${h.text}`));
      lines.push("");
    }

    if (page.paragraphs.length > 0) {
      lines.push("KEY CONTENT:");
      page.paragraphs.slice(0, 5).forEach((p) => lines.push(`  • ${p}`));
      lines.push("");
    }

    if (page.ctaButtons.length > 0) {
      lines.push("CTA / BUTTONS:");
      page.ctaButtons.forEach((b) => lines.push(`  → ${b}`));
      lines.push("");
    }

    if (page.contactInfo.length > 0) {
      lines.push("CONTACT INFO:");
      page.contactInfo.forEach((c) => lines.push(`  📧 ${c}`));
      lines.push("");
    }

    if (page.navigation.length > 0) {
      lines.push("NAVIGATION:");
      page.navigation.forEach((n) => lines.push(`  • ${n}`));
      lines.push("");
    }
  }

  lines.push("=".repeat(60));
  lines.push("SUMMARY");
  lines.push("=".repeat(60));
  lines.push(`Total headings: ${evaluation.summary.totalHeadings}`);
  lines.push(`Total images: ${evaluation.summary.totalImages}`);
  lines.push(`Total links: ${evaluation.summary.totalLinks}`);

  if (evaluation.summary.uniqueInternalLinks.length > 0) {
    lines.push("\nINTERNAL LINKS DISCOVERED:");
    evaluation.summary.uniqueInternalLinks.forEach((l) =>
      lines.push(`  • ${l}`)
    );
  }

  if (evaluation.summary.possibleProductFeatures.length > 0) {
    lines.push("\nEXTRACTED CONTENT (for AI analysis):");
    evaluation.summary.possibleProductFeatures.forEach((f) =>
      lines.push(`  • ${f}`)
    );
  }

  return lines.join("\n");
}
