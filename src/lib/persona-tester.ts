import { chromium, Browser, Page } from "playwright";
import OpenAI from "openai";
import * as crypto from "crypto";
import { Persona, WebsiteAnalysis } from "./types";
import { createLogger } from "./logger";

const log = createLogger("agent:persona-tester");

interface ScreenshotDedup {
  hashes: Set<string>;
  contentKeys: Set<string>;
  duplicateCount: number;
}

function createDedup(): ScreenshotDedup {
  return { hashes: new Set(), contentKeys: new Set(), duplicateCount: 0 };
}

async function isScreenshotDuplicate(
  page: Page,
  buffer: Buffer,
  dedup: ScreenshotDedup
): Promise<boolean> {
  const hash = crypto.createHash("md5").update(buffer).digest("hex");
  if (dedup.hashes.has(hash)) {
    dedup.duplicateCount++;
    return true;
  }
  const scrollY = await page.evaluate(() => window.scrollY).catch(() => 0);
  const contentKey = `${page.url()}|${Math.floor(scrollY / 300)}`;
  if (dedup.contentKeys.has(contentKey)) {
    dedup.duplicateCount++;
    return true;
  }
  dedup.hashes.add(hash);
  dedup.contentKeys.add(contentKey);
  return false;
}

function isConsentRelatedAction(toolName: string, args: Record<string, unknown>): boolean {
  if (toolName !== "click_element" && toolName !== "submit_form") return false;
  const text = ((args.text as string) || (args.buttonText as string) || "").toLowerCase();
  return ["cookie", "consent", "accept all", "reject all", "datenschutz",
    "privacy", "ablehnen", "akzeptieren", "zustimmen", "agree",
    "necessary", "i agree", "got it", "refuser", "accepter",
    "alle akzeptieren", "alle ablehnen"].some((k) => text.includes(k));
}

let _gemini: OpenAI | null = null;
function getGemini() {
  if (!_gemini) {
    _gemini = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _gemini;
}

const MODEL = "gemini-3.1-flash-lite-preview";
const MAX_STEPS = 25;

export interface DetailedFinding {
  category: string;
  severity: "critical" | "major" | "minor" | "positive";
  title: string;
  description: string;
  pageUrl?: string;
  evidence?: string;
  rootCauseType?: "system_bug" | "ux_friction" | "semantic_confusion";
}

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
    detailedFindings: DetailedFinding[];
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
      description: "Click a button or link by its visible text. IMPORTANT: Use the text of the actual button/link (e.g. 'Download now', 'Learn more'), NOT the heading or description above it.",
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
      description: "Share your honest, critical feedback about what you just saw or tried. Call this AFTER each action to document your reaction. Be EXTREMELY SPECIFIC: name the exact element, link text, button label, section name, or URL path. IMPORTANT: Always set rootCauseType to distinguish real bugs from your own click errors.",
      parameters: {
        type: "object",
        properties: {
          feedback: {
            type: "string",
            description: "Your honest, detailed reaction. Name the exact link text, button label, or element. Example: 'The \"Pricing\" link in the top nav leads to a 404' instead of 'some links are broken'.",
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
          rootCauseType: {
            type: "string",
            enum: ["system_bug", "ux_friction", "semantic_confusion"],
            description: "Root cause: system_bug = real functional failure; ux_friction = feature works but hard to find/use; semantic_confusion = you clicked the wrong element or misunderstood the UI (your mistake)",
          },
        },
        required: ["feedback", "category", "severity", "rootCauseType"],
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

async function dismissConsentBanners(page: Page): Promise<boolean> {
  let dismissed = false;

  const rejectPatterns = [
    "Reject all", "Reject All", "Decline all", "Decline All",
    "Only necessary", "Necessary only", "Accept necessary",
    "Deny", "No thanks", "No, thanks",
    "Alle ablehnen", "Alles ablehnen", "Ablehnen",
    "Nur notwendige", "Nur erforderliche",
    "Tout refuser", "Refuser",
    "Accept all", "Accept All", "Alle akzeptieren", "Ich stimme zu",
    "I agree", "Got it", "OK", "Agree", "Zustimmen",
    "Tout accepter", "Agree & close",
    "Before you continue", "Continue",
    "Customize", "Save and exit",
    "Akzeptieren und weiter", "Weiter",
    "Allow all", "Allow All",
    "Manage preferences", "Confirm choices",
  ];

  for (const text of rejectPatterns) {
    try {
      const btn = page.getByRole("button", { name: text, exact: false });
      if (await btn.first().isVisible({ timeout: 500 })) {
        await btn.first().click();
        await page.waitForTimeout(1000);
        log.info(`Dismissed consent banner with: "${text}"`);
        dismissed = true;
        break;
      }
    } catch { /* try next */ }
  }

  if (!dismissed) {
    const selectorPatterns = [
      '[aria-label="Reject all"]', '[aria-label="Alle ablehnen"]',
      '#L2AGLb', 'button[jsname="higCR"]', 'button[jsname="b3VHJd"]',
      '.fc-cta-do-not-consent', '.fc-cta-consent',
      '[data-testid="cookie-policy-manage-dialog-btn-reject-all"]',
      '#onetrust-reject-all-handler', '#onetrust-accept-btn-handler',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '.cookie-banner__reject', '.js-cookie-reject',
      '#cookie-consent-reject', '[data-action="cookie-reject"]',
      '.consent-banner button', '[class*="consent"] button',
      '[class*="cookie"] button', '[id*="cookie"] button',
      '[class*="gdpr"] button', '[id*="gdpr"] button',
      'tp-yt-paper-dialog button', // YouTube consent
      'ytd-consent-bump-v2-lightbox button', // YouTube
      '.consent-bump button',
    ];

    for (const selector of selectorPatterns) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 300 })) {
          await el.click();
          await page.waitForTimeout(1000);
          log.info(`Dismissed consent banner with selector: ${selector}`);
          dismissed = true;
          break;
        }
      } catch { /* try next */ }
    }
  }

  // Second pass: check if an overlay is still blocking
  if (dismissed) {
    const stillBlocked = await isPageBlocked(page);
    if (stillBlocked) {
      log.warn("Page still blocked after first consent dismiss, retrying");
      for (const text of ["Accept all", "Accept All", "I agree", "Agree", "OK", "Continue"]) {
        try {
          const btn = page.getByRole("button", { name: text, exact: false });
          if (await btn.first().isVisible({ timeout: 300 })) {
            await btn.first().click();
            await page.waitForTimeout(1000);
            log.info(`Second-pass consent dismiss: "${text}"`);
            break;
          }
        } catch { /* try next */ }
      }
    }
  }

  return dismissed;
}

async function isPageBlocked(page: Page): Promise<boolean> {
  try {
    return await page.evaluate(() => {
      const overlays = document.querySelectorAll(
        '[class*="consent"], [class*="cookie"], [class*="gdpr"], [class*="overlay"], [class*="modal"], [role="dialog"]'
      );
      for (const el of overlays) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (style.display !== "none" && style.visibility !== "hidden" &&
            rect.width > window.innerWidth * 0.3 && rect.height > window.innerHeight * 0.3) {
          return true;
        }
      }
      const bodyContent = document.body.innerText?.trim() || "";
      return bodyContent.length < 50;
    });
  } catch {
    return false;
  }
}

async function captureScreenshot(page: Page, dedup?: ScreenshotDedup): Promise<string | null> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  } catch { /* proceed anyway */ }

  const buffer = await page.screenshot({ type: "jpeg", quality: 60 });

  if (buffer.length < 5000) {
    await page.waitForTimeout(2000);
    const retry = await page.screenshot({ type: "jpeg", quality: 60 });
    if (retry.length < 5000) return null;
    if (dedup && await isScreenshotDuplicate(page, retry, dedup)) return null;
    return retry.toString("base64");
  }

  if (dedup && await isScreenshotDuplicate(page, buffer, dedup)) return null;
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
  const feedbackItems: { feedback: string; category: string; severity: string; pageUrl: string; rootCauseType: string }[] = [];
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

    // Aggressively try to dismiss consent banners (up to 3 rounds)
    for (let attempt = 0; attempt < 3; attempt++) {
      const dismissed = await dismissConsentBanners(page);
      if (!dismissed) break;
      await page.waitForTimeout(500);
    }

    const dedup = createDedup();

    // Detect if page is still blocked by consent/login overlay
    const pageBlocked = await isPageBlocked(page);

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

SYSTEM-LEVEL AWARENESS — Handle non-business obstacles first:
- CONSENT/COOKIE BANNERS: If you see a full-screen overlay, modal, or banner asking about cookies/privacy/consent with blurred or blocked background, this is NOT a product bug. Click "Accept All", "I Agree", "OK", "Reject All", or any dismiss button IMMEDIATELY before doing anything else. Do NOT report consent banners as bugs.
- LOGIN WALLS: If the page requires authentication and shows a login form, try any visible demo credentials. If no demo credentials exist, note "login required" and evaluate only what's publicly visible — do NOT give a 0 buy signal just because you can't log in.
- CAPTCHA/VERIFICATION: If you encounter a CAPTCHA, reCAPTCHA, or "verify you're human" screen, you cannot solve it. Note this as an environment limitation and evaluate only what you CAN see.
- BLANK/EMPTY PAGES: If the page appears completely empty or shows only a consent banner, try scrolling down, clicking "Accept" buttons, or waiting. Only if nothing works after multiple attempts should you note "environment access restricted."
- CRITICAL: If you cannot access the actual product content due to any of the above, your buySignal, verdict, and feedback should explicitly state "Unable to fully evaluate due to [consent wall / login wall / CAPTCHA]. Rating reflects only publicly visible content." Do NOT give a misleading 0% buy signal as if the product is bad — make it clear the limitation is environmental.

YOUR TESTING APPROACH:
1. FIRST dismiss any consent/cookie/privacy banners by clicking accept/reject buttons.
2. If you see a login form with demo credentials on the page, LOG IN (use fieldType='password' for password fields).
3. After clearing obstacles, visit EVERY page in the navigation. Click EVERY button you see.
4. After each action, call give_feedback with your honest, critical reaction.
5. Try real workflows end-to-end: create a customer, create an invoice, use any AI features.
6. Look for floating buttons (bottom-right corner), modals, AI assistants — test them!
7. If something doesn't work or is confusing, report it immediately via give_feedback.
8. Think: "Would I actually use this daily? Would I pay for this? What's frustrating?"
9. Be SPECIFIC: don't say "it's nice" — say exactly what works or doesn't and WHY.

IMPORTANT:
- You are NOT impressed by default. You have used many tools before and have HIGH standards.
- Compare to tools you currently use. Be honest about whether this is better or worse.
- Try to break things: enter weird data, click things in wrong order, test edge cases.
- You stay on the same domain: ${allowedOrigin}
- After thoroughly testing all features, call finish_testing with your complete assessment.
- You have max ${MAX_STEPS} actions — use them all to test as much as possible.

INTERACTION PRECISION — Distinguish CTA from descriptive text:
- Web pages contain two types of text: (1) INTERACTIVE elements — buttons, links, CTAs with short action verbs like "Download now", "Learn more", "Get started", "Sign up" — and (2) DESCRIPTIVE text — headings, labels, paragraphs, promotional copy.
- ONLY click interactive elements. A heading like "CSRD for Dummies" or a description like "Download your go-to resource for effortless implementation" is NOT a button — the actual CTA is the "Download now" button nearby.
- If you see a card/banner with a long title and a short action button, ALWAYS click the action button text, NEVER the title.

SELF-CORRECTION PROTOCOL — Before reporting any bug:
1. If a click "did nothing", STOP. Ask yourself: "Did I click a heading, label, or description instead of the actual button/link?" If YES, find the real CTA nearby and try THAT first.
2. If click_element tells you "the page did NOT change", that almost always means you clicked decorative text. Retry with the actual button text before reporting anything.
3. Only report category="bug" if you clicked a clearly interactive element (a styled button, an underlined link, a navigation menu item) AND it failed. Use rootCauseType="system_bug" for these.
4. If the issue is that you couldn't FIND the right button or the UI made it unclear WHERE to click, report category="ux_issue" with rootCauseType="ux_friction".
5. NEVER report "clicking [long descriptive sentence] did nothing" as a bug — that is ALWAYS your own click target error, not a website bug.

FEEDBACK QUALITY:
- When reporting issues, name the EXACT element: link text, button label, section heading, page URL.
- BAD: "some links are broken" — GOOD: "The 'Pricing' link in the main navigation leads to a 404 page at /pricing"
- BAD: "the layout is weird" — GOOD: "On the 'Features' page, the three-column card grid collapses into overlapping elements below 1024px"
- Always note which page you're on and what specific element you're referring to.
- When using give_feedback, always set the rootCauseType field:
  • "system_bug" — a real functional failure (button click leads to error, 404 from a real link, form submission fails)
  • "ux_friction" — the feature works but is hard to find or use (confusing layout, unclear labels, poor discoverability)
  • "semantic_confusion" — you misunderstood what was clickable or what a UI element does (your mistake, not the website's)

NAVIGATION RULES:
- NEVER construct or guess URLs. Use click_element to click visible links/buttons.
- If navigate_to returns a 404/error, it means YOU used a wrong URL — do NOT report it as a bug.`,
      },
      {
        role: "user",
        content: `You've just opened ${targetUrl}. Page title: "${initialContent.title}". Headings: ${initialContent.headings.join(", ")}. Content: ${initialContent.paragraphs.join(" | ")}${pageBlocked ? "\n\n⚠️ WARNING: The page appears to be partially blocked by a consent/cookie overlay or login wall. Try clicking any visible 'Accept', 'Agree', 'OK', or 'Continue' button first before proceeding with your test. If you still cannot access the content after trying, note it as an environment limitation." : ""}. Start your beta test — explore, click things, try features, and give honest feedback.`,
      },
    ];

    let summaryResult: Record<string, unknown> | null = null;

    let bonusSteps = 0;
    for (let step = 0; step < MAX_STEPS + bonusSteps; step++) {
      if (step > 0) {
        await new Promise((r) => setTimeout(r, 5000));
      }

      onEvent?.(`${persona.name} thinking... (step ${step + 1}/${MAX_STEPS + bonusSteps})`);

      let response;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          response = await getGemini().chat.completions.create({
            model: MODEL,
            messages,
            tools: TOOLS,
            tool_choice:
              step >= MAX_STEPS + bonusSteps - 1
                ? { type: "function", function: { name: "finish_testing" } }
                : "auto",
            max_tokens: 1500,
          });
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          log.warn(`${persona.name} LLM call failed (attempt ${attempt + 1}/5): ${msg}`);
          const isRetryable = msg.includes("429") || msg.includes("Rate limit") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
          if (isRetryable && attempt < 4) {
            await new Promise((r) => setTimeout(r, Math.min(5000 * Math.pow(2, attempt), 120000)));
            continue;
          }
          throw err;
        }
      }
      if (!response) throw new Error("LLM call failed after retries");

      const msg = response.choices[0].message;
      messages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          if (tc.type !== "function") continue;
          const fn = (tc as { type: "function"; id: string; function: { name: string; arguments: string } });
          const name = fn.function.name;
          const args = JSON.parse(fn.function.arguments || "{}");

          log.debug(`${persona.name} tool: ${name}`, args);

          if (name === "finish_testing") {
            onEvent?.(`${persona.name} finishing test...`);
            summaryResult = args;
            messages.push({ role: "tool", tool_call_id: fn.id, content: "Testing complete." });
            break;
          }

          if (name === "give_feedback") {
            const currentUrl = page.url();
            const severity = (args.severity as string) || "info";
            const category = (args.category as string) || "";
            const rootCause = (args.rootCauseType as string) || "system_bug";
            feedbackItems.push({
              feedback: args.feedback as string,
              category,
              severity,
              pageUrl: currentUrl,
              rootCauseType: rootCause,
            });
            actionLog.push({ action: `[${category}/${severity}/${rootCause}] on ${currentUrl}`, feedback: args.feedback as string });
            const causeLabel = rootCause === "semantic_confusion" ? "🔍" : rootCause === "ux_friction" ? "⚡" : "🐛";
            onEvent?.(`${causeLabel} [${severity}] ${persona.name}: "${(args.feedback as string).substring(0, 120)}"`);

            let ack = "Feedback recorded. Continue testing.";
            if (rootCause === "semantic_confusion") {
              ack = "Feedback recorded. NOTE: You marked this as semantic_confusion — good self-awareness. This will be classified as a UX observation, not a bug. Continue testing.";
            }
            messages.push({ role: "tool", tool_call_id: fn.id, content: ack });
            continue;
          }

          // Browser actions
          let resultText = "";
          let screenshot: string | undefined;

          try {
            switch (name) {
              case "navigate_to": {
                onEvent?.(`→ ${persona.name} navigating to ${args.url}`);
                const dest = new URL(args.url as string);
                if (dest.origin !== allowedOrigin) {
                  resultText = `Blocked: ${args.url} is outside the allowed domain.`;
                  break;
                }
                const navResp = await page.goto(args.url, { waitUntil: "networkidle", timeout: 15000 });
                const navStatus = navResp?.status() ?? 0;
                if (navStatus >= 400) {
                  log.warn(`Navigation returned HTTP ${navStatus}: ${args.url}`);
                  resultText = `HTTP ${navStatus} — this URL does not exist. This is NOT a website bug — you navigated to a wrong URL. Use get_page_links or click_element to find the correct links on the site. Do NOT report this as a bug.`;
                  break;
                }
                await page.waitForTimeout(1000);
                await dismissConsentBanners(page);
                screenshot = await captureScreenshot(page, dedup) || undefined;
                resultText = `Navigated to ${args.url}. Title: "${await page.title()}".${screenshot ? " Screenshot attached." : " (Page unchanged)"}`;
                break;
              }
              case "click_element": {
                const clickText = args.text as string;
                onEvent?.(`→ ${persona.name} clicking "${clickText}"`);
                const urlBeforeClick = page.url();
                try {
                  let clicked = false;
                  for (const selector of ['a', 'button', '[role="button"]', '[role="link"]']) {
                    const el = page.locator(`${selector}:has-text("${clickText.replace(/"/g, '\\"')}")`).first();
                    if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
                      await el.click();
                      clicked = true;
                      break;
                    }
                  }
                  if (!clicked) {
                    await page.getByText(clickText, { exact: false }).first().click();
                  }
                  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
                  await page.waitForTimeout(800);
                  await dismissConsentBanners(page);
                  screenshot = await captureScreenshot(page, dedup) || undefined;
                  const samePage = page.url() === urlBeforeClick;
                  resultText = `Clicked "${clickText}". Now on: ${page.url()}.`;
                  if (samePage) {
                    resultText += " NOTE: The page did NOT change — you may have clicked a non-interactive element (heading or label). Look for the actual button or link nearby (e.g. 'Download now', 'Learn more') and click THAT instead. Do NOT report this as a bug unless you also tried the actual button.";
                  }
                  if (screenshot) resultText += " Screenshot attached.";
                } catch {
                  screenshot = await captureScreenshot(page, dedup) || undefined;
                  resultText = `Could not click "${clickText}" — element not found or not clickable.${screenshot ? " Screenshot attached." : ""}`;
                }
                break;
              }
              case "fill_input": {
                onEvent?.(`→ ${persona.name} filling input "${args.placeholder || args.fieldType || "field"}"`);
                let filled = false;
                const fType = args.fieldType as string | undefined;
                const ph = args.placeholder as string | undefined;
                const val = args.value as string;
                // 1. By fieldType (e.g. input[type="password"])
                if (fType && !filled) try {
                  const byType = page.locator(`input[type="${fType}"]`).first();
                  if (await byType.isVisible({ timeout: 1000 })) { await byType.fill(val); filled = true; }
                } catch { /* next */ }
                // 2. By label
                if (ph && !filled) try {
                  const byLabel = page.getByLabel(ph, { exact: false }).first();
                  if (await byLabel.isVisible({ timeout: 1000 })) { await byLabel.fill(val); filled = true; }
                } catch { /* next */ }
                // 3. By placeholder
                if (ph && !filled) try {
                  const byPh = page.getByPlaceholder(ph, { exact: false }).first();
                  if (await byPh.isVisible({ timeout: 1000 })) { await byPh.fill(val); filled = true; }
                } catch { /* next */ }
                // 4. By role
                if (ph && !filled) try {
                  const byRole = page.getByRole("textbox", { name: ph }).first();
                  if (await byRole.isVisible({ timeout: 1000 })) { await byRole.fill(val); filled = true; }
                } catch { /* next */ }
                // 5. FALLBACK: guess by field type from context
                if (!filled) try {
                  const isPassword = fType === "password" || /passwor|kennwor/i.test(ph || "");
                  const selector = isPassword ? 'input[type="password"]' : 'input[type="text"]';
                  const fallback = page.locator(selector).first();
                  if (await fallback.isVisible({ timeout: 1000 })) { await fallback.fill(val); filled = true; }
                } catch { /* give up */ }
                if (filled) {
                  screenshot = await captureScreenshot(page, dedup) || undefined;
                  resultText = `Filled "${ph || fType || "input"}" with "${val}". Screenshot attached.`;
                } else {
                  resultText = `Could not find input "${ph || fType}". This might be a bug.`;
                }
                break;
              }
              case "scroll_down": {
                onEvent?.(`→ ${persona.name} scrolling down`);
                await page.evaluate(() => window.scrollBy(0, 800));
                await page.waitForTimeout(500);
                screenshot = await captureScreenshot(page, dedup) || undefined;
                resultText = `Scrolled down.${screenshot ? " Screenshot attached." : " (View unchanged)"}`;
                break;
              }
              case "extract_page_content": {
                onEvent?.(`→ ${persona.name} reading page content`);

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

          messages.push({ role: "tool", tool_call_id: fn.id, content: resultText });
        }
        const wasConsentStep = msg.tool_calls?.some((tc) => {
          if (tc.type !== "function") return false;
          try {
            const fn = tc as { type: "function"; function: { name: string; arguments: string } };
            return isConsentRelatedAction(fn.function.name, JSON.parse(fn.function.arguments || "{}"));
          } catch { return false; }
        });
        if (wasConsentStep && bonusSteps < 10) {
          bonusSteps++;
          log.debug(`Consent step by ${persona.name}, bonus step (${bonusSteps})`);
        }

        if (summaryResult) break;
      } else if (msg.content) {
        onEvent?.(`${persona.name}: ${msg.content.substring(0, 100)}`);
      }
    }

    await browser.close();
    browser = null;

    const s = summaryResult || {};

    // Build detailed findings from feedback items
    const detailedFindings = feedbackItems
      .filter((f) => f.severity !== "positive")
      .map((f) => ({
        category: f.category,
        severity: f.severity as "critical" | "major" | "minor",
        title: f.feedback.length > 80 ? f.feedback.substring(0, 77) + "..." : f.feedback,
        description: f.feedback,
        pageUrl: f.pageUrl,
        evidence: f.feedback,
        rootCauseType: (f.rootCauseType || "system_bug") as "system_bug" | "ux_friction" | "semantic_confusion",
      }));

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
        detailedFindings,
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
