import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { createLogger } from "./logger";

const log = createLogger("llm");

export type LLMProvider = "gemini" | "gemini-pro";

interface LLMConfig {
  provider: LLMProvider;
}

const CONFIG_PATH = path.join(process.env.LOG_DIR || "./logs", "llm-config.json");

function loadConfig(): LLMConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { provider: "gemini" };
  }
}

function saveConfig(config: LLMConfig) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
  } catch (e) {
    log.error("Failed to save LLM config", e);
  }
}

export function getProvider(): LLMProvider {
  return loadConfig().provider;
}

export function setProvider(provider: LLMProvider) {
  saveConfig({ provider });
  log.info(`LLM provider switched to: ${provider}`);
}

let _gemini: GoogleGenerativeAI | null = null;
function getGemini() {
  if (!_gemini) {
    _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return _gemini;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | unknown[];
  tool_call_id?: string;
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls: { id: string; name: string; arguments: string }[] | null;
  usage?: { totalTokens: number };
}

/**
 * Unified chat completion using Gemini.
 */
export async function chatCompletion(opts: {
  messages: ChatMessage[];
  tools?: ToolDef[];
  toolChoice?: "auto" | { type: "function"; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResponse> {
  return geminiCompletion(opts);
}

async function geminiCompletion(opts: {
  messages: ChatMessage[];
  tools?: ToolDef[];
  toolChoice?: "auto" | { type: "function"; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const gemini = getGemini();
  const provider = getProvider();
  const modelName = provider === "gemini-pro" ? "gemini-3.1-flash-lite-preview" : "gemini-3.1-flash-lite-preview";
  const model = gemini.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 1500,
    },
  });

  const geminiTools = opts.tools?.length
    ? ([
        {
          functionDeclarations: opts.tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
        },
      ] as unknown as import("@google/generative-ai").Tool[])
    : undefined;

  const systemInstruction = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n");

  const history = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      if (m.role === "tool") {
        return {
          role: "function" as const,
          parts: [
            {
              functionResponse: {
                name: m.tool_call_id || "unknown",
                response: { result: typeof m.content === "string" ? m.content : JSON.stringify(m.content) },
              },
            },
          ],
        };
      }
      const role = m.role === "assistant" ? "model" : "user";
      const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return { role: role as "user" | "model", parts: [{ text }] };
    });

  const toolConfig = (opts.toolChoice && typeof opts.toolChoice === "object"
    ? {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [opts.toolChoice.function.name],
        },
      }
    : opts.tools?.length
      ? { functionCallingConfig: { mode: "AUTO" } }
      : undefined) as import("@google/generative-ai").ToolConfig | undefined;

  const chat = model.startChat({
    history: history.slice(0, -1),
    systemInstruction: systemInstruction ? { role: "user" as const, parts: [{ text: systemInstruction }] } : undefined,
    tools: geminiTools,
    toolConfig,
  });

  const lastMsg = history[history.length - 1];
  const result = await chat.sendMessage(lastMsg?.parts || [{ text: "" }]);
  const response = result.response;

  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    return {
      content: null,
      toolCalls: functionCalls.map((fc, i) => ({
        id: `gemini-${Date.now()}-${i}`,
        name: fc.name,
        arguments: JSON.stringify(fc.args),
      })),
      usage: response.usageMetadata
        ? { totalTokens: response.usageMetadata.totalTokenCount || 0 }
        : undefined,
    };
  }

  return {
    content: response.text() || null,
    toolCalls: null,
    usage: response.usageMetadata
      ? { totalTokens: response.usageMetadata.totalTokenCount || 0 }
      : undefined,
  };
}
