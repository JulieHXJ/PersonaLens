import { chromium, Browser, Page } from "playwright";
import OpenAI from "openai";
import { Persona, WebsiteAnalysis } from "./types";
import { createLogger } from "./logger";

const log = createLogger("agent:persona-tester");

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
      project: process.env.OPENAI_PROJECT_ID,
    });
  }
  return _openai;
}

const MODEL = "gpt-4.1-mini";
const MAX_STEPS = 25;

export interface BetaTestResult {
  personaId: string;
  personaName: string;
  actionLog: { action: string; feedback: string; screenshot?: string }[];
  summary: {
    overallVerdict: string;
    buySignal: number;
    wouldRecommend: boolean;
    topLikes: string[];
    topDislikes: string[];
    bugs: string[];
    uxIssues: string[];
    missingFeatures: string[];
    confusingElements: string[];
    killerQuote: string;
    overallSentiment: string;
    willingnessToPay: {
      tooCheap: number;
      bargain: number;
      gettingExpensive: number;
      tooExpensive: number;
    };
    topObjections: string[];
    featureRanking: string[];
    discoveryChannel: string;
    currentSolution: string;
    surpriseInsight: string;
  };
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate to a URL on the website. You'll receive a screenshot.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to navigate to" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "click_element",
      description: "Click a button, link, or interactive element by its visible text. You'll receive a screenshot.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Visible text of element to click" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fill_input",
      description: "Type text into an input field by its label, placeholder, or type. For password fields use fieldType='password'.",
      parameters: {
        type: "object",
        properties: {
          placeholder: { type: "string", description: "Label or placeholder of the input" },
          fieldType: { type: "string", description: "HTML input type (e.g. 'password', 'email')" },
          value: { type: "string", description: "Text to type" },
        },
        required: ["value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scroll_down",
      description: "Scroll down to see more content. You'll receive a screenshot.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_page_content",
      description: "Extract all text content from the current page.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "give_feedback",
      description: "Share your honest, critical feedback about what you just saw or tried. Call this AFTER each action to document your reaction.",
      parameters: {
        type: "object",
        properties: {
          feedback: {
            type: "string",
            description: "Your honest, detailed reaction as this persona. Be specific and critical.",
          },
          category: {
            type: "string",
            enum: ["bug", "ux_issue", "confusion", "like", "dislike", "missing_feature", "general"],
            description: "Category of feedback",
          },
          severity: {
            type: "string",
            enum: ["critical", "major", "minor", "positive"],
            description: "How severe is this issue (or positive if it's praise)",
          },
        },
        required: ["feedback", "category", "severity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish_testing",
      description: "Call when you've tested enough. Provide your complete honest assessment.",
      parameters: {
        type: "object",
        properties: {
          overallVerdict: {
            type: "string",
            description: "2-3 sentence honest verdict. Would you use this? Why or why not?",
          },
          buySignal: {
            type: "number",
            description: "0.0 to 1.0 — how likely you are to actually pay for and use this product",
          },
          wouldRecommend: {
            type: "boolean",
            description: "Would you recommend this to a colleague?",
          },
          topLikes: {
            type: "array",
            items: { type: "string" },
            description: "Top 2-3 things you liked",
          },
          topDislikes: {
            type: "array",
            items: { type: "string" },
            description: "Top 2-3 things you disliked or found frustrating",
          },
          bugs: {
            type: "array",
            items: { type: "string" },
            description: "Bugs or broken things you found",
          },
          uxIssues: {
            type: "array",
            items: { type: "string" },
            description: "UX problems — confusing flows, bad layout, unclear labels",
          },
          missingFeatures: {
            type: "array",
            items: { type: "string" },
            description: "Features you expected but didn't find",
          },
          confusingElements: {
            type: "array",
            items: { type: "string" },
            description: "Things that confused you or you didn't understand",
          },
          killerQuote: {
            type: "string",
            description: "Your single most honest, memorable reaction to this product",
          },
          overallSentiment: {
            type: "string",
            description: "One phrase capturing your feeling (e.g. 'impressed but skeptical', 'frustrated', 'would switch immediately')",
          },
          willingnessToPay: {
            type: "object",
            properties: {
              tooCheap: { type: "number" },
              bargain: { type: "number" },
              gettingExpensive: { type: "number" },
              tooExpensive: { type: "number" },
            },
            description: "Monthly price in euros: too cheap (suspicious), bargain, getting expensive, too expensive",
          },
          topObjections: {
            type: "array",
            items: { type: "string" },
            description: "Main reasons you might NOT use this product",
          },
          featureRanking: {
            type: "array",
            items: { type: "string" },
            description: "Rank features from most to least important (from what you saw)",
          },
          discoveryChannel: {
            type: "string",
            description: "Where would you expect to find a tool like this?",
          },
          currentSolution: {
            type: "string",
            description: "What do you currently use to solve this problem?",
          },
          surpriseInsight: {
            type: "string",
            description: "Something unexpected — good or bad — that you noticed",
          },
        },
        required: [
          "overallVerdict", "buySignal", "wouldRecommend", "topLikes",
          "topDislikes", "bugs", "uxIssues", "killerQuote", "overallSentiment",
          "willingnessToPay", "topObjections", "featureRanking",
          "discoveryChannel", "currentSolution", "surpriseInsight",
        ],
      },
    },
  },
];

async function captureScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ type: "jpeg", quality: 70 });
  return buffer.toString("base64");
}

function screenshotToolResponse(
  toolCallId: string,
  text: string,
  base64: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content: [
      { type: "text", text },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "low" },
      },
    ] as unknown as string,
  };
}

export type DeviceMode = "desktop" | "mobile";

const VIEWPORTS: Record<DeviceMode, { width: number; height: number; userAgent: string }> = {
  desktop: {
    width: 1280,
    height: 900,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  mobile: {
    width: 375,
    height: 812,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
};

export async function runPersonaTest(
  persona: Persona,
  analysis: WebsiteAnalysis,
  onEvent?: (msg: string) => void,
  device: DeviceMode = "desktop"
): Promise<BetaTestResult> {
  const runStart = Date.now();
  let browser: Browser | null = null;
  const targetUrl = analysis.url;
  const allowedOrigin = new URL(targetUrl).origin;
  const actionLog: BetaTestResult["actionLog"] = [];
  const feedbackItems: { feedback: string; category: string; severity: string }[] = [];
  const vp = VIEWPORTS[device];

  log.info(`Starting persona test: ${persona.name} (${device})`, { personaId: persona.id, url: targetUrl, device });
  onEvent?.(`Starting beta test as ${persona.name} (${persona.role}) on ${device}`);

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.userAgent,
      isMobile: device === "mobile",
      hasTouch: device === "mobile",
    });
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1500);

    const initialBase64 = await captureScreenshot(page);
    const initialContent = await page.evaluate(() => {
      const headings: string[] = [];
      document.querySelectorAll("h1, h2, h3").forEach((h) => {
        const t = (h as HTMLElement).innerText?.trim();
        if (t) headings.push(`[${h.tagName}] ${t}`);
      });
      const paragraphs: string[] = [];
      document.querySelectorAll("p").forEach((p) => {
        const t = (p as HTMLElement).innerText?.trim();
        if (t && t.length > 15) paragraphs.push(t.substring(0, 300));
      });
      return { title: document.title, headings, paragraphs: paragraphs.slice(0, 5) };
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are ${persona.name}, age ${persona.age}, ${persona.role}.
Background: ${persona.background}
Tech savviness: ${persona.techSavviness}
Pain points: ${persona.painPoints.join("; ")}
Goals: ${persona.goals.join("; ")}

You are beta-testing a website/product on a ${device === "mobile" ? "MOBILE PHONE (iPhone, 375x812px)" : "DESKTOP COMPUTER (1280x900px)"}. You must be BRUTALLY HONEST and CRITICAL — like a real user who has no reason to be nice. You are NOT impressed by default. You have limited patience.
${device === "mobile" ? "\nMOBILE-SPECIFIC: Pay extra attention to responsive design, touch targets, hamburger menus, text readability on small screens, and whether the layout adapts properly. Report any elements that overlap, are too small to tap, or require horizontal scrolling." : ""}

YOUR TESTING APPROACH:
1. If you see a login form with demo credentials on the page, LOG IN FIRST (use fieldType='password' for password fields).
2. After login, visit EVERY page in the navigation. Click EVERY button you see.
3. After each action, call give_feedback with your honest, critical reaction.
4. Try real workflows end-to-end: create a customer, create an invoice, use any AI features.
5. Look for floating buttons (bottom-right corner), modals, AI assistants — test them!
6. If something doesn't work or is confusing, report it immediately via give_feedback.
7. Think: "Would I actually use this daily? Would I pay for this? What's frustrating?"
8. Be SPECIFIC: don't say "it's nice" — say exactly what works or doesn't and WHY.

IMPORTANT:
- You are NOT impressed by default. You have used many tools before and have HIGH standards.
- If a button does nothing, that's a bug. Report it with category "bug".
- If you don't understand something within 5 seconds, report it as "confusion".
- Compare to tools you currently use. Be honest about whether this is better or worse.
- Try to break things: enter weird data, click things in wrong order, test edge cases.
- You stay on the same domain: ${allowedOrigin}
- After thoroughly testing all features, call finish_testing with your complete assessment.
- You have max ${MAX_STEPS} actions — use them all to test as much as possible.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You've just opened ${targetUrl}. Page title: "${initialContent.title}". Headings: ${initialContent.headings.join(", ")}. Content: ${initialContent.paragraphs.join(" | ")}. Screenshot attached. Start your beta test — explore, click things, try features, and give honest feedback.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${initialBase64}`, detail: "low" },
          },
        ],
      },
    ];

    let summaryResult: Record<string, unknown> | null = null;

    for (let step = 0; step < MAX_STEPS; step++) {
      onEvent?.(`${persona.name} thinking... (step ${step + 1}/${MAX_STEPS})`);

      const response = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice:
          step >= MAX_STEPS - 1
            ? { type: "function", function: { name: "finish_testing" } }
            : "auto",
        max_tokens: 1500,
      });

      const msg = response.choices[0].message;
      messages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          if (tc.type !== "function") continue;
          const name = tc.function.name;
          const args = JSON.parse(tc.function.arguments || "{}");

          log.debug(`${persona.name} tool: ${name}`, args);

          if (name === "finish_testing") {
            summaryResult = args;
            messages.push({ role: "tool", tool_call_id: tc.id, content: "Testing complete." });
            break;
          }

          if (name === "give_feedback") {
            feedbackItems.push(args);
            actionLog.push({ action: `[${args.category}/${args.severity}]`, feedback: args.feedback });
            onEvent?.(`${persona.name}: "${args.feedback.substring(0, 80)}..."`);
            messages.push({ role: "tool", tool_call_id: tc.id, content: "Feedback recorded. Continue testing." });
            continue;
          }

          // Browser actions
          let resultText = "";
          let screenshot: string | undefined;

          try {
            switch (name) {
              case "navigate_to": {
                const dest = new URL(args.url as string);
                if (dest.origin !== allowedOrigin) {
                  resultText = `Blocked: ${args.url} is outside the allowed domain.`;
                  break;
                }
                await page.goto(args.url, { waitUntil: "networkidle", timeout: 15000 });
                await page.waitForTimeout(1000);
                screenshot = await captureScreenshot(page);
                resultText = `Navigated to ${args.url}. Title: "${await page.title()}". Screenshot attached.`;
                break;
              }
              case "click_element": {
                try {
                  await page.getByText(args.text, { exact: false }).first().click();
                  await page.waitForLoadState("networkidle", { timeout: 10000 });
                  await page.waitForTimeout(800);
                  screenshot = await captureScreenshot(page);
                  resultText = `Clicked "${args.text}". Now on: ${page.url()}. Screenshot attached.`;
                } catch {
                  screenshot = await captureScreenshot(page);
                  resultText = `Could not click "${args.text}" — element not found or not clickable. This might be a bug. Screenshot attached.`;
                }
                break;
              }
              case "fill_input": {
                let filled = false;
                const fType = args.fieldType as string | undefined;
                const ph = args.placeholder as string;
                // By fieldType (e.g. input[type="password"])
                if (fType && !filled) try {
                  const byType = page.locator(`input[type="${fType}"]`).first();
                  if (await byType.isVisible({ timeout: 1000 })) { await byType.fill(args.value); filled = true; }
                } catch { /* next */ }
                // By label
                if (ph && !filled) try {
                  const byLabel = page.getByLabel(ph, { exact: false }).first();
                  if (await byLabel.isVisible({ timeout: 1000 })) { await byLabel.fill(args.value); filled = true; }
                } catch { /* next */ }
                // By placeholder
                if (ph && !filled) try {
                  const byPh = page.getByPlaceholder(ph, { exact: false }).first();
                  if (await byPh.isVisible({ timeout: 1000 })) { await byPh.fill(args.value); filled = true; }
                } catch { /* next */ }
                // By role
                if (ph && !filled) try {
                  const byRole = page.getByRole("textbox", { name: ph }).first();
                  if (await byRole.isVisible({ timeout: 1000 })) { await byRole.fill(args.value); filled = true; }
                } catch { /* give up */ }
                if (filled) {
                  screenshot = await captureScreenshot(page);
                  resultText = `Filled "${ph || fType}" with "${args.value}". Screenshot attached.`;
                } else {
                  resultText = `Could not find input "${ph || fType}". This might be a bug.`;
                }
                break;
              }
              case "scroll_down": {
                await page.evaluate(() => window.scrollBy(0, 800));
                await page.waitForTimeout(500);
                screenshot = await captureScreenshot(page);
                resultText = "Scrolled down. Screenshot attached.";
                break;
              }
              case "extract_page_content": {
                const content = await page.evaluate(() => {
                  const h: string[] = [];
                  document.querySelectorAll("h1,h2,h3").forEach((el) => {
                    const t = (el as HTMLElement).innerText?.trim();
                    if (t) h.push(`[${el.tagName}] ${t}`);
                  });
                  const p: string[] = [];
                  document.querySelectorAll("p").forEach((el) => {
                    const t = (el as HTMLElement).innerText?.trim();
                    if (t && t.length > 15) p.push(t.substring(0, 300));
                  });
                  return { title: document.title, url: window.location.href, headings: h.slice(0, 15), paragraphs: p.slice(0, 10) };
                });
                resultText = JSON.stringify(content, null, 2);
                break;
              }
            }
          } catch (err) {
            resultText = `Action failed: ${err instanceof Error ? err.message : "unknown error"}. This could be a bug in the website.`;
          }

          actionLog.push({ action: `${name}: ${JSON.stringify(args)}`, feedback: resultText, screenshot });

          if (screenshot) {
            messages.push(screenshotToolResponse(tc.id, resultText, screenshot));
          } else {
            messages.push({ role: "tool", tool_call_id: tc.id, content: resultText });
          }
        }
        if (summaryResult) break;
      } else if (msg.content) {
        onEvent?.(`${persona.name}: ${msg.content.substring(0, 100)}`);
      }
    }

    await browser.close();
    browser = null;

    const s = summaryResult || {};
    const result: BetaTestResult = {
      personaId: persona.id,
      personaName: persona.name,
      actionLog,
      summary: {
        overallVerdict: (s.overallVerdict as string) || "No verdict provided",
        buySignal: (s.buySignal as number) || 0,
        wouldRecommend: (s.wouldRecommend as boolean) || false,
        topLikes: (s.topLikes as string[]) || [],
        topDislikes: (s.topDislikes as string[]) || [],
        bugs: (s.bugs as string[]) || [],
        uxIssues: (s.uxIssues as string[]) || [],
        missingFeatures: (s.missingFeatures as string[]) || [],
        confusingElements: (s.confusingElements as string[]) || [],
        killerQuote: (s.killerQuote as string) || "",
        overallSentiment: (s.overallSentiment as string) || "",
        willingnessToPay: (s.willingnessToPay as BetaTestResult["summary"]["willingnessToPay"]) || { tooCheap: 0, bargain: 0, gettingExpensive: 0, tooExpensive: 0 },
        topObjections: (s.topObjections as string[]) || [],
        featureRanking: (s.featureRanking as string[]) || [],
        discoveryChannel: (s.discoveryChannel as string) || "",
        currentSolution: (s.currentSolution as string) || "",
        surpriseInsight: (s.surpriseInsight as string) || "",
      },
    };

    log.timed(`Persona test complete: ${persona.name}`, Date.now() - runStart, {
      buySignal: result.summary.buySignal,
      bugs: result.summary.bugs.length,
      uxIssues: result.summary.uxIssues.length,
    });

    return result;
  } catch (error) {
    if (browser) await browser.close();
    log.error(`Persona test failed: ${persona.name}`, { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
