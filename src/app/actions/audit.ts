"use server";

import { chromium } from "playwright";
import chromiumEdge from "@sparticuz/chromium";

export interface AuditResult {
  screenshotBase64: string;
  simplifiedHtml: string;
}

export async function runVisualSensor(url: string): Promise<AuditResult> {
  let browser;
  try {
    // Launch headless browser
    console.log("Launching Playwright browser...");
    const options: Record<string, unknown> = { headless: true };
    // Force Playwright to use the local Chrome/Chromium executable
    // instead of relying on the cached downloaded version which causes path issues in this environment
    options.executablePath = process.platform === 'darwin' 
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined;

    // Only add args if in Linux/sandbox, let Mac use default for stability
    if (process.platform === 'linux') {
      options.args = [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ];
      
      // Vercel/AWS Lambda specific configurations for serverless environment
      if (process.env.VERCEL) {
        options.executablePath = await chromiumEdge.executablePath();
        options.args = chromiumEdge.args;
      }
    }
    browser = await chromium.launch(options);
    console.log("Browser launched. Creating context...");
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    console.log(`Context created. Navigating to ${url}...`);
    // Navigate to URL - using 'load' instead of 'networkidle' to prevent hanging on tracking scripts
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    // Let the page settle a bit
    await page.waitForTimeout(2000);
    console.log(`Navigation complete. Handling consent...`);

    // Handle Cookie Consent Bypass (Simple Heuristic)
    const consentKeywords = ['Ablehnen', 'Reject', 'Zustimmen', 'Accept', 'Akzeptieren'];
    for (const keyword of consentKeywords) {
      try {
        const button = page.locator(`button:has-text("${keyword}"), a:has-text("${keyword}")`).first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          await page.waitForTimeout(500); // Give it a bit of time to disappear
          break;
        }
      } catch {
        // Ignore if not found
      }
    }

    console.log(`Taking screenshot...`);
    // Take high-res full page screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: "jpeg", quality: 80 });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Extract simplified DOM tree
    // Only keeping interactive elements and headings for AI analysis
    console.log(`Extracting DOM tree...`);
    let simplifiedHtml: string;
    try {
      simplifiedHtml = (await page.evaluate(`
        (() => {
          const allowedTags = ['A', 'BUTTON', 'INPUT', 'FORM', 'SELECT', 'TEXTAREA', 'H1', 'H2', 'H3', 'P', 'IMG'];
          
          function buildSimplifiedTree(node) {
            if (!allowedTags.includes(node.tagName) && node.children.length === 0) return null;
            
            const obj = { tag: node.tagName.toLowerCase() };
            
            const rect = node.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              obj.box = Math.round(rect.x) + ',' + Math.round(rect.y) + ',' + Math.round(rect.width) + ',' + Math.round(rect.height);
            }

            if (['H1', 'H2', 'H3', 'P', 'BUTTON', 'A'].includes(node.tagName) && node.textContent) {
               const text = node.textContent.trim().replace(/\\s+/g, ' ');
               if (text) obj.text = text;
            }
            
            if (node.tagName === 'IMG') {
              obj.alt = node.getAttribute('alt') || '';
            }

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) {
               obj.type = node.getAttribute('type') || '';
               obj.placeholder = node.getAttribute('placeholder') || '';
            }

            const children = [];
            for (const child of Array.from(node.children)) {
              const childNode = buildSimplifiedTree(child);
              if (childNode) children.push(childNode);
            }

            if (children.length > 0) obj.children = children;
            
            if (!['A', 'BUTTON', 'INPUT', 'FORM', 'SELECT', 'TEXTAREA', 'IMG'].includes(node.tagName) && children.length === 0 && !obj.text) {
              return null;
            }

            return obj;
          }
          
          const tree = buildSimplifiedTree(document.body);
          return JSON.stringify(tree, null, 2);
        })()
      `)) as string;
      console.log("DOM tree extracted successfully.");
    } catch (evalError) {
      console.error("Error during DOM evaluation:", evalError);
      throw new Error(`DOM evaluation failed: ${evalError instanceof Error ? evalError.message : String(evalError)}`);
    }

    return { screenshotBase64, simplifiedHtml };
  } catch (error) {
    console.error("Playwright error:", error);
    // @ts-expect-error - Error might have message property
    if (error && error.message) {
        // @ts-expect-error - Error might have message property
        console.error("Playwright error message:", error.message);
    }
    // throw new Error("Failed to run visual sensor.");
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
