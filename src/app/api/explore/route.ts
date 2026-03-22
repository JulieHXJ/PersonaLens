import { NextRequest } from "next/server";
import { runBrowserAgent, AgentEvent } from "@/lib/browser-agent";
import { createLogger } from "@/lib/logger";
import {
  createExploration, completeExploration, failExploration,
  updateExplorationProgress, saveScreenshot, saveExplorationEvents,
} from "@/lib/db";

const log = createLogger("api:explore");

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { url, maxSteps, geminiApiKey } = await req.json();
  log.info(`Explore request received`, { url, maxSteps, hasGeminiApiKey: Boolean(geminiApiKey) });

  if (!url || typeof url !== "string") {
    log.warn("Missing URL in request");
    return new Response(JSON.stringify({ error: "URL is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    new URL(url);
  } catch {
    log.warn(`Invalid URL rejected: ${url}`);
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!geminiApiKey || typeof geminiApiKey !== "string" || geminiApiKey.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Gemini API key is required. Configure it before running analysis." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const explorationId = createExploration(url);
  const startTime = Date.now();

  const encoder = new TextEncoder();
  let streamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let eventCount = 0;
      let screenshotCount = 0;
      const allEvents: AgentEvent[] = [];

      function trySend(data: string) {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          streamClosed = true;
          log.info(`SSE stream disconnected (client navigated away), exploration continues in background`);
        }
      }

      const emit = (event: AgentEvent) => {
        eventCount++;
        allEvents.push(event);

        let sseEvent: Record<string, unknown> = { ...event };

        if (event.type === "screenshot" && event.screenshot) {
          screenshotCount++;
          const filename = saveScreenshot(explorationId, event.screenshot, event.message, screenshotCount);
          sseEvent = { ...event, screenshot: `/api/screenshots?file=${filename}` };
        }

        if (eventCount % 5 === 0) {
          updateExplorationProgress(explorationId, eventCount, screenshotCount);
        }

        trySend(JSON.stringify(sseEvent));
      };

      try {
        const result = await runBrowserAgent(url, emit, {
          maxSteps: maxSteps || undefined,
          geminiApiKey: geminiApiKey.trim(),
        });
        const durationMs = Date.now() - startTime;

        saveExplorationEvents(explorationId, allEvents);
        updateExplorationProgress(explorationId, eventCount, screenshotCount);
        completeExploration(explorationId, result.analysis, result.personas, durationMs);

        log.info(`Explore complete`, {
          url,
          explorationId,
          eventCount,
          screenshotCount,
          personas: result.personas.length,
          product: result.analysis.productName,
          durationMs,
        });

        trySend(JSON.stringify({
          type: "result",
          message: "Exploration complete",
          data: { ...result, explorationId },
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);

        saveExplorationEvents(explorationId, allEvents);
        failExploration(explorationId, errorMsg, durationMs);

        log.error(`Explore failed`, {
          url,
          explorationId,
          eventCount,
          error: errorMsg,
          stack: error instanceof Error ? error.stack : undefined,
        });

        trySend(JSON.stringify({
          type: "error",
          message: errorMsg,
          timestamp: new Date().toISOString(),
        }));
      } finally {
        if (!streamClosed) {
          try { controller.close(); } catch { /* already closed */ }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
