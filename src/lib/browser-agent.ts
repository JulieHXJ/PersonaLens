import { chromium, Browser, Page } from "playwright";
import OpenAI from "openai";
import { Persona, WebsiteAnalysis } from "./types";
import { createLogger } from "./logger";
import { getProvider } from "./llm";

const log = createLogger("agent:browser");

let _geminiClient: OpenAI | null = null;
function getGeminiClient() {
  if (!_geminiClient) {
    _geminiClient = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _geminiClient;
}

function getLLMClient(): { client: OpenAI; model: string } {
  const provider = getProvider();
  if (provider === "gemini-pro") {
    return { client: getGeminiClient(), model: "gemini-3.1-flash-lite-preview" };
  }
  return { client: getGeminiClient(), model: "gemini-3.1-flash-lite-preview" };
}

/**
 * Provider-aware LLM call. Returns OpenAI-compatible response format.
 * For Gemini, converts the response to match OpenAI's shape.
 */
async function agentLLMCall(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  toolChoice: "auto" | { type: "function"; function: { name: string } },
  maxTokens: number
) {
  const { client, model } = getLLMClient();
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      log.debug(`LLM call using ${model} (attempt ${attempt + 1})`);
      return await client.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: toolChoice,
        max_tokens: maxTokens,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`LLM call failed (attempt ${attempt + 1}/${maxRetries}): ${msg}`);
      const isRetryable = msg.includes("429") || msg.includes("Rate limit") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
      if (isRetryable && attempt < maxRetries - 1) {
        const wait = Math.min(5000 * Math.pow(2, attempt), 120000);
        log.warn(`Retryable error, waiting ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded for LLM call");
}

const MAX_STEPS = 25;

export interface AgentEvent {
  type: "action" | "observation" | "screenshot" | "thinking" | "done" | "error";
  message: string;
  data?: unknown;
  screenshot?: string; // base64
  timestamp: string;
}

export type AgentEventCallback = (event: AgentEvent) => void;

// Tools available to the agent — no take_screenshot since screenshots are automatic
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "navigate_to",
      description:
        "Navigate the browser to a URL on the SAME domain. You will automatically receive a screenshot of the new page. Only URLs on the target website's domain are allowed.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to navigate to (must be same domain)" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "click_element",
      description:
        "Click an element on the page by its visible text. You will automatically receive a screenshot after the click. Use for menus, buttons, and interactive elements.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The visible text of the element to click",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_page_content",
      description:
        "Extract all text content from the current page including headings, paragraphs, and lists. Use when you need detailed text that isn't visible in the screenshot.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "scroll_down",
      description:
        "Scroll down the page to reveal content below the fold. You will automatically receive a screenshot after scrolling.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_page_links",
      description:
        "Get all navigable links on the current page with their text and URLs. Use to discover what pages are available.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "fill_input",
      description:
        "Fill an input field by its label, placeholder, or type. For login forms: use label='Benutzername' for username and fieldType='password' for password fields.",
      parameters: {
        type: "object",
        properties: {
          placeholder: {
            type: "string",
            description: "The label text, placeholder text, or aria-label near the input field",
          },
          fieldType: {
            type: "string",
            description: "Optional: the HTML input type to target specifically (e.g. 'password', 'email'). Use this when placeholder/label matching fails.",
          },
          value: {
            type: "string",
            description: "The text to type into the field",
          },
        },
        required: ["placeholder", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_form",
      description:
        "Press Enter or click a submit/login button to submit the current form. Provide the button text if visible.",
      parameters: {
        type: "object",
        properties: {
          buttonText: {
            type: "string",
            description: "The visible text on the submit button (e.g. 'Login', 'Submit', 'Anmelden')",
          },
        },
        required: ["buttonText"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish_exploration",
      description:
        "Call this when you have explored enough pages to understand the product/service, target audience, and key features. Provide your complete analysis.",
      parameters: {
        type: "object",
        properties: {
          productName: {
            type: "string",
            description: "The name of the product or service",
          },
          productDescription: {
            type: "string",
            description:
              "A comprehensive 2-3 sentence description of what this product/service does",
          },
          targetAudience: {
            type: "string",
            description: "Who this product/service is for",
          },
          keyFeatures: {
            type: "array",
            items: { type: "string" },
            description: "4-8 key features or services offered",
          },
          industry: {
            type: "string",
            description: "The industry category",
          },
          siteStructure: {
            type: "string",
            description: "Brief description of the site's structure and navigation",
          },
          designImpression: {
            type: "string",
            description: "Your impression of the site's design, branding, and UX quality",
          },
          userFlows: {
            type: "array",
            items: { type: "string" },
            description: "Key user flows/journeys you identified on the site",
          },
        },
        required: [
          "productName",
          "productDescription",
          "targetAudience",
          "keyFeatures",
          "industry",
        ],
      },
    },
  },
];

/**
 * Dismiss cookie/consent banners by clicking the most minimal-consent option.
 * Tries multiple strategies covering Google, YouTube, GDPR/Datenschutz, and generic cookie popups.
 */
async function dismissConsentBanners(page: Page): Promise<boolean> {
  const rejectPatterns = [
    // English
    "Reject all", "Reject All", "Decline all", "Decline All",
    "Only necessary", "Necessary only", "Accept necessary",
    "Deny", "No thanks", "No, thanks",
    // German (Datenschutz)
    "Alle ablehnen", "Alles ablehnen", "Ablehnen",
    "Nur notwendige", "Nur erforderliche",
    // French
    "Tout refuser", "Refuser",
    // Generic fallbacks — accept if no reject option exists
    "Accept all", "Accept All", "Alle akzeptieren", "Ich stimme zu",
    "I agree", "Got it", "OK", "Agree", "Zustimmen",
    "Tout accepter", "Agree & close",
  ];

  for (const text of rejectPatterns) {
    try {
      const btn = page.getByRole("button", { name: text, exact: false });
      if (await btn.first().isVisible({ timeout: 500 })) {
        await btn.first().click();
        await page.waitForTimeout(1000);
        log.info(`Dismissed consent banner with: "${text}"`);
        return true;
      }
    } catch { /* try next */ }
  }

  // Try common CSS selectors for consent dialogs
  const selectorPatterns = [
    '[aria-label="Reject all"]', '[aria-label="Alle ablehnen"]',
    '#L2AGLb', // Google consent "I agree"
    'button[jsname="higCR"]', // Google "Reject all"
    'button[jsname="b3VHJd"]', // Google "Accept all" fallback
    '.fc-cta-do-not-consent', // Funding Choices reject
    '.fc-cta-consent', // Funding Choices accept (fallback)
    '[data-testid="cookie-policy-manage-dialog-btn-reject-all"]',
    '#onetrust-reject-all-handler',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
    '.cookie-banner__reject', '.js-cookie-reject',
    '#cookie-consent-reject', '[data-action="cookie-reject"]',
  ];

  for (const selector of selectorPatterns) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 300 })) {
        await el.click();
        await page.waitForTimeout(1000);
        log.info(`Dismissed consent banner with selector: ${selector}`);
        return true;
      }
    } catch { /* try next */ }
  }

  return false;
}

/**
 * Take a screenshot, emit it to the client, and return the base64 string.
 */
async function captureScreenshot(
  page: Page,
  emit: AgentEventCallback,
  label: string
): Promise<string> {
  const buffer = await page.screenshot({ type: "jpeg", quality: 70 });
  const base64 = buffer.toString("base64");
  emit({
    type: "screenshot",
    message: label,
    screenshot: base64,
    timestamp: new Date().toISOString(),
  });
  return base64;
}

/**
 * Build a tool response that includes both text and a screenshot image.
 */
function toolResponseWithScreenshot(
  toolCallId: string,
  text: string,
  screenshotBase64: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content: [
      { type: "text", text },
      {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${screenshotBase64}`,
          detail: "low",
        },
      },
    ] as unknown as string,
  };
}

async function executeTool(
  page: Page,
  toolName: string,
  args: Record<string, unknown>,
  emit: AgentEventCallback,
  allowedOrigin: string,
  targetPath: string,
  hasPathScope: boolean
): Promise<{ text: string; screenshot?: string }> {
  const toolStart = Date.now();
  log.debug(`Tool call: ${toolName}`, args);

  switch (toolName) {
    case "navigate_to": {
      const url = args.url as string;

      // URL scoping: reject navigation outside the allowed scope
      try {
        const dest = new URL(url);
        if (dest.origin !== allowedOrigin) {
          log.warn(`Blocked off-domain navigation: ${url} (allowed: ${allowedOrigin})`);
          return {
            text: `Blocked: ${url} is outside the target domain (${allowedOrigin}). Stay on the same website.`,
          };
        }
        if (hasPathScope && !dest.pathname.startsWith(targetPath)) {
          log.warn(`Blocked off-path navigation: ${url} (allowed path: ${targetPath}*)`);
          return {
            text: `Blocked: ${url} is outside the target section (${targetPath}). Stay within the target URL path — do not navigate to the homepage or other sections.`,
          };
        }
      } catch {
        log.warn(`Invalid URL rejected: ${url}`);
        return { text: `Invalid URL: ${url}` };
      }

      emit({
        type: "action",
        message: `Navigating to ${url}`,
        timestamp: new Date().toISOString(),
      });
      await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(1000);
      await dismissConsentBanners(page);
      const title = await page.title();
      const screenshot = await captureScreenshot(page, emit, `Page: ${title}`);
      return {
        text: `Navigated to ${url}. Page title: "${title}". A screenshot is attached.`,
        screenshot,
      };
    }

    case "click_element": {
      const text = args.text as string;
      emit({
        type: "action",
        message: `Clicking "${text}"`,
        timestamp: new Date().toISOString(),
      });
      try {
        await page.getByText(text, { exact: false }).first().click();
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        await page.waitForTimeout(800);
        const newUrl = page.url();
        const title = await page.title();
        const screenshot = await captureScreenshot(page, emit, `After clicking "${text}"`);
        return {
          text: `Clicked "${text}". Now on: ${newUrl} (title: "${title}"). A screenshot is attached.`,
          screenshot,
        };
      } catch {
        const failScreenshot = await captureScreenshot(page, emit, `Failed to click "${text}"`);
        return {
          text: `Could not find or click element with text "${text}". Try a different text or use navigate_to.`,
          screenshot: failScreenshot,
        };
      }
    }

    case "extract_page_content": {
      emit({
        type: "action",
        message: "Extracting page content",
        timestamp: new Date().toISOString(),
      });
      const content = await page.evaluate(() => {
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
        const lists: string[] = [];
        document.querySelectorAll("li").forEach((li) => {
          const t = (li as HTMLElement).innerText?.trim();
          if (t && t.length > 5) lists.push(`• ${t.substring(0, 150)}`);
        });
        // Also extract form fields so the agent can interact with them
        const formFields: string[] = [];
        document.querySelectorAll("input, textarea, select").forEach((el) => {
          const input = el as HTMLInputElement;
          const label = input.labels?.[0]?.innerText?.trim() || "";
          const ph = input.placeholder || "";
          const type = input.type || el.tagName.toLowerCase();
          formFields.push(`[${type}] label="${label}" placeholder="${ph}"`);
        });
        const buttons: string[] = [];
        document.querySelectorAll("button, [role='button'], input[type='submit']").forEach((b) => {
          const t = (b as HTMLElement).innerText?.trim();
          if (t) buttons.push(t.substring(0, 80));
        });
        return {
          title: document.title,
          url: window.location.href,
          headings: headings.slice(0, 15),
          paragraphs: paragraphs.slice(0, 10),
          lists: lists.slice(0, 15),
          formFields: formFields.slice(0, 10),
          buttons: buttons.slice(0, 10),
        };
      });
      const screenshot = await captureScreenshot(page, emit, `Content extracted from ${content.url}`);
      return { text: JSON.stringify(content, null, 2), screenshot };
    }

    case "scroll_down": {
      emit({
        type: "action",
        message: "Scrolling down",
        timestamp: new Date().toISOString(),
      });
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(500);
      const screenshot = await captureScreenshot(page, emit, `Scrolled down on ${page.url()}`);
      return {
        text: "Scrolled down 800px. A screenshot of the new viewport is attached.",
        screenshot,
      };
    }

    case "get_page_links": {
      emit({
        type: "action",
        message: "Getting page links",
        timestamp: new Date().toISOString(),
      });
      const links = await page.evaluate(() => {
        const results: { text: string; href: string }[] = [];
        document.querySelectorAll("a[href]").forEach((a) => {
          const text = (a as HTMLElement).innerText?.trim();
          const href = (a as HTMLAnchorElement).href;
          if (text && href && !href.startsWith("javascript:")) {
            results.push({ text: text.substring(0, 80), href });
          }
        });
        return results
          .filter((v, i, a) => a.findIndex((x) => x.href === v.href) === i)
          .slice(0, 25);
      });
      const linksScreenshot = await captureScreenshot(page, emit, `Links on ${page.url()}`);
      return { text: JSON.stringify(links, null, 2), screenshot: linksScreenshot };
    }

    case "fill_input": {
      const placeholder = args.placeholder as string;
      const value = args.value as string;
      const fieldType = args.fieldType as string | undefined;
      emit({
        type: "action",
        message: `Filling "${placeholder || fieldType}" with "${value}"`,
        timestamp: new Date().toISOString(),
      });
      try {
        let filled = false;
        // If fieldType is specified, target by CSS selector directly (e.g. input[type="password"])
        if (fieldType && !filled) {
          try {
            const byType = page.locator(`input[type="${fieldType}"]`).first();
            if (await byType.isVisible({ timeout: 1000 })) {
              await byType.fill(value);
              filled = true;
            }
          } catch { /* try next */ }
        }
        // Try by label
        if (placeholder && !filled) {
          try {
            const byLabel = page.getByLabel(placeholder, { exact: false }).first();
            if (await byLabel.isVisible({ timeout: 1000 })) {
              await byLabel.fill(value);
              filled = true;
            }
          } catch { /* try next */ }
        }
        // Then by placeholder
        if (placeholder && !filled) {
          try {
            const byPlaceholder = page.getByPlaceholder(placeholder, { exact: false }).first();
            if (await byPlaceholder.isVisible({ timeout: 1000 })) {
              await byPlaceholder.fill(value);
              filled = true;
            }
          } catch { /* try next */ }
        }
        // Then by role with name
        if (placeholder && !filled) {
          try {
            const byRole = page.getByRole("textbox", { name: placeholder }).first();
            if (await byRole.isVisible({ timeout: 1000 })) {
              await byRole.fill(value);
              filled = true;
            }
          } catch { /* try next */ }
        }
        // FALLBACK: guess by context — password-like values go to password field, else first text field
        if (!filled) {
          try {
            const isPassword = fieldType === "password" || /passwor|kennwor/i.test(placeholder || "");
            const selector = isPassword ? 'input[type="password"]' : 'input[type="text"]';
            const fallback = page.locator(selector).first();
            if (await fallback.isVisible({ timeout: 1000 })) {
              await fallback.fill(value);
              filled = true;
            }
          } catch { /* give up */ }
        }
        if (!filled) {
          return {
            text: `Could not find input "${placeholder || fieldType}". Try extract_page_content to see available form fields.`,
          };
        }
        const screenshot = await captureScreenshot(page, emit, `Filled "${placeholder}"`);
        return {
          text: `Filled input "${placeholder}" with "${value}". Screenshot attached.`,
          screenshot,
        };
      } catch {
        return {
          text: `Could not find input with placeholder/label "${placeholder}". Try extract_page_content to see available form fields.`,
        };
      }
    }

    case "submit_form": {
      const buttonText = args.buttonText as string;
      emit({
        type: "action",
        message: `Submitting form via "${buttonText}"`,
        timestamp: new Date().toISOString(),
      });
      try {
        await page.getByRole("button", { name: buttonText }).first().click();
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        await page.waitForTimeout(1000);
        const newUrl = page.url();
        const title = await page.title();
        const screenshot = await captureScreenshot(page, emit, `After submitting "${buttonText}"`);
        return {
          text: `Clicked "${buttonText}". Now on: ${newUrl} (title: "${title}"). Screenshot attached.`,
          screenshot,
        };
      } catch {
        return {
          text: `Could not find or click button "${buttonText}". Try click_element instead.`,
        };
      }
    }

    case "finish_exploration": {
      emit({
        type: "done",
        message: "Exploration complete",
        data: args,
        timestamp: new Date().toISOString(),
      });
      return { text: "Exploration finished. Analysis recorded." };
    }

    default:
      return { text: `Unknown tool: ${toolName}` };
  }
}

export async function runBrowserAgent(
  targetUrl: string,
  emit: AgentEventCallback
): Promise<{ analysis: WebsiteAnalysis; personas: Persona[] }> {
  const runStart = Date.now();
  let browser: Browser | null = null;
  const parsedTarget = new URL(targetUrl);
  const allowedOrigin = parsedTarget.origin;
  // Use the target path as scope — e.g. "/hebammen" means only URLs starting with "/hebammen" are allowed
  // If the path is just "/" or empty, allow the full domain
  const targetPath = parsedTarget.pathname.replace(/\/$/, "");
  const hasPathScope = targetPath.length > 0 && targetPath !== "/";

  const { model: activeModel } = getLLMClient();
  log.info(`Starting browser agent`, { targetUrl, allowedOrigin, maxSteps: MAX_STEPS, model: activeModel });

  try {
    emit({
      type: "action",
      message: "Launching browser...",
      timestamp: new Date().toISOString(),
    });

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // Navigate to the target URL
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1500);

    // Dismiss cookie/consent banners before taking the initial screenshot
    await dismissConsentBanners(page);

    // Take initial screenshot
    const initialBase64 = await captureScreenshot(page, emit, `Initial view of ${targetUrl}`);

    // Extract initial content
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

    // Build conversation
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a website exploration agent with a real browser. Your job is to visually explore a specific section of a website and understand it the way a real visitor would.

TARGET: ${targetUrl}
${hasPathScope ? `SCOPE: You may ONLY visit URLs that start with ${allowedOrigin}${targetPath}. Do NOT navigate to the homepage, root URL, or other sections of the site. If the page has links to other areas, IGNORE them.` : `SCOPE: Stay on ${allowedOrigin}. Do not navigate to external sites.`}

RULES:
- After every navigate_to, click_element, and scroll_down you automatically receive a screenshot — use it to visually understand the page.
- Do NOT navigate to the homepage or root URL. Focus only on the target page and its subpages.
- Explore the target page thoroughly: scroll down, extract content, visit linked subpages within the same section.
- You have a maximum of ${MAX_STEPS} actions — be efficient.
- When you have enough understanding, call finish_exploration with your analysis.

STRATEGY:
1. Study the initial page carefully. If you see a login form with demo/test credentials on the page, LOG IN FIRST using fill_input (use fieldType='password' for password fields) and submit_form.
2. After logging in, systematically visit EVERY page in the navigation menu.
3. On each page, scroll down to see all content. Click buttons to discover features.
4. Look for special features like AI assistants, floating action buttons (bottom-right corner), modals, or interactive elements — TEST THEM.
5. Try actual workflows: create something, edit something, navigate flows end-to-end.
6. Use extract_page_content when you need to read detailed text, form fields, or button labels.
7. Your analysis must cover the FULL product behind the login, not just the login page.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `I've opened ${targetUrl}. Here's the initial page content:\n\nTitle: ${initialContent.title}\nHeadings: ${initialContent.headings.join(", ")}\nContent: ${initialContent.paragraphs.join("\n")}\n\nA screenshot is attached. Explore this website thoroughly.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${initialBase64}`,
              detail: "low",
            },
          },
        ],
      },
    ];

    let analysisResult: Record<string, unknown> | null = null;

    // Agent loop
    for (let step = 0; step < MAX_STEPS; step++) {
      if (step > 0) {
        await new Promise((r) => setTimeout(r, 5000));
      }

      emit({
        type: "thinking",
        message: `Agent thinking... (step ${step + 1}/${MAX_STEPS})`,
        timestamp: new Date().toISOString(),
      });

      const response = await agentLLMCall(
        messages,
        TOOLS,
        step >= MAX_STEPS - 1
          ? { type: "function", function: { name: "finish_exploration" } }
          : "auto",
        1000
      );

      const assistantMessage = response.choices[0].message;
      const tokensUsed = response.usage;
      log.debug(`LLM response (step ${step + 1})`, {
        toolCalls: assistantMessage.tool_calls?.map((t) =>
          t.type === "function" ? t.function.name : t.type
        ),
        tokensUsed,
      });
      messages.push(assistantMessage);

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type !== "function") continue;
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

          const toolStart = Date.now();
          const result = await executeTool(page, toolName, toolArgs, emit, allowedOrigin, targetPath, hasPathScope);
          log.timed(`Tool ${toolName} completed`, Date.now() - toolStart, {
            hasScreenshot: !!result.screenshot,
            resultLength: result.text.length,
          });

          // If the tool returned a screenshot, include it as vision input (OpenAI only — Gemini doesn't support images in tool responses)
          const isGemini = getProvider().startsWith("gemini");
          if (result.screenshot && !isGemini) {
            messages.push(
              toolResponseWithScreenshot(toolCall.id, result.text, result.screenshot)
            );
          } else {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result.text,
            });
          }

          if (toolName === "finish_exploration") {
            analysisResult = toolArgs;
            break;
          }
        }

        if (analysisResult) break;
      } else if (assistantMessage.content) {
        emit({
          type: "observation",
          message: assistantMessage.content,
          timestamp: new Date().toISOString(),
        });
      }
    }

    await browser.close();
    browser = null;
    log.timed(`Browser exploration completed`, Date.now() - runStart);

    const analysis: WebsiteAnalysis = {
      url: targetUrl,
      productName: (analysisResult?.productName as string) || "Unknown Product",
      productDescription: (analysisResult?.productDescription as string) || "",
      targetAudience: (analysisResult?.targetAudience as string) || "",
      keyFeatures: (analysisResult?.keyFeatures as string[]) || [],
      industry: (analysisResult?.industry as string) || "",
    };

    log.info(`Website analysis complete`, analysis);

    emit({
      type: "thinking",
      message: "Generating customer personas based on exploration...",
      timestamp: new Date().toISOString(),
    });

    const personaStart = Date.now();
    const personas = await generatePersonasFromAnalysis(analysis);
    log.timed(`Generated ${personas.length} personas`, Date.now() - personaStart);
    log.timed(`Full agent run complete`, Date.now() - runStart, {
      url: targetUrl,
      personasGenerated: personas.length,
      productName: analysis.productName,
    });

    return { analysis, personas };
  } catch (error) {
    if (browser) await browser.close();
    log.error(`Agent failed for ${targetUrl}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: Date.now() - runStart,
    });
    emit({
      type: "error",
      message: error instanceof Error ? error.message : "Agent failed",
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

async function generatePersonasFromAnalysis(
  analysis: WebsiteAnalysis
): Promise<Persona[]> {
  const prompt = `Based on this website analysis, generate 10 diverse customer personas:

Product: ${analysis.productName}
Description: ${analysis.productDescription}
Target Audience: ${analysis.targetAudience}
Features: ${analysis.keyFeatures.join(", ")}
Industry: ${analysis.industry}

Generate realistic personas who would visit this website. Ensure diversity in age, background, tech savviness, and motivation.

Respond with ONLY valid JSON array:
[{
  "id": "p1",
  "name": "string",
  "age": number,
  "role": "string - short role description",
  "background": "string - 2 sentences about their situation",
  "segment": "string - customer segment label",
  "icon": "string - Material Symbols icon name (person, school, apartment, work, etc.)",
  "painPoints": ["3 specific pain points"],
  "goals": ["3 goals"],
  "techSavviness": "low" | "medium" | "high",
  "selected": boolean (first 8 true, rest false)
}]`;

  const { client, model } = getLLMClient();
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You create realistic customer personas for product research. Respond only with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      });

      const text = response.choices[0]?.message?.content || "[]";
      return JSON.parse(text.replace(/```json\n?|```/g, "").trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`Persona gen failed (attempt ${attempt + 1}/${maxRetries}): ${msg}`);
      const isRetryable = msg.includes("429") || msg.includes("Rate limit") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("JSON") || err instanceof SyntaxError;
      if (isRetryable && attempt < maxRetries - 1) {
        const wait = Math.min(5000 * Math.pow(2, attempt), 120000);
        log.warn(`Retryable error, waiting ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded for persona generation");
}
