import { NextRequest } from "next/server";
import { runBrowserAgent, AgentEvent } from "@/lib/browser-agent";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:explore");

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  log.info(`Explore request received`, { url });

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let eventCount = 0;
      const emit = (event: AgentEvent) => {
        eventCount++;
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const result = await runBrowserAgent(url, emit);
        log.info(`Explore complete`, {
          url,
          eventCount,
          personas: result.personas.length,
          product: result.analysis.productName,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "result",
              message: "Exploration complete",
              data: result,
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );
      } catch (error) {
        log.error(`Explore failed`, {
          url,
          eventCount,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message:
                error instanceof Error ? error.message : "Exploration failed",
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );
      } finally {
        controller.close();
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
