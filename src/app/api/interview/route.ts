import { NextRequest } from "next/server";
import { runPersonaTest, DeviceMode } from "@/lib/persona-tester";
import { Persona, WebsiteAnalysis } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:interview");

export async function POST(req: NextRequest) {
  try {
    const { persona, analysis, device, geminiApiKey } = (await req.json()) as {
      persona: Persona;
      analysis: WebsiteAnalysis;
      device?: DeviceMode;
      geminiApiKey?: string;
    };

    if (!persona || !analysis) {
      return new Response(JSON.stringify({ error: "persona and analysis are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!geminiApiKey || typeof geminiApiKey !== "string" || geminiApiKey.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Gemini API key is required. Configure it before simulation." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const deviceMode = device || "desktop";
    log.info(`Interview request (SSE): ${persona.name} testing ${analysis.productName} on ${deviceMode}`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch { /* client disconnected */ }
        }

        try {
          const result = await runPersonaTest(persona, analysis, (msg) => {
            send("activity", { message: msg, timestamp: new Date().toISOString() });
          }, deviceMode, geminiApiKey.trim());

          const mapped = {
            personaId: result.personaId,
            personaName: result.personaName,
            transcript: result.actionLog.map((a) => ({
              role: "persona" as const,
              content: a.feedback,
            })),
            extractedData: {
              buySignal: result.summary.buySignal,
              willingnessToPay: result.summary.willingnessToPay,
              topObjections: result.summary.topObjections,
              featureRanking: result.summary.featureRanking,
              discoveryChannel: result.summary.discoveryChannel,
              currentSolution: result.summary.currentSolution,
              killerQuote: result.summary.killerQuote,
              surpriseInsight: result.summary.surpriseInsight,
              overallSentiment: result.summary.overallSentiment,
              bugs: result.summary.bugs,
              uxIssues: result.summary.uxIssues,
              missingFeatures: result.summary.missingFeatures,
              confusingElements: result.summary.confusingElements,
              topLikes: result.summary.topLikes,
              topDislikes: result.summary.topDislikes,
              overallVerdict: result.summary.overallVerdict,
              wouldRecommend: result.summary.wouldRecommend,
              detailedFindings: result.summary.detailedFindings,
            },
          };

          log.info(`Interview complete: ${persona.name}`, {
            buySignal: result.summary.buySignal,
            bugs: result.summary.bugs.length,
          });

          send("complete", mapped);
        } catch (error) {
          log.error("Interview failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          send("error", { error: error instanceof Error ? error.message : "Interview failed" });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    log.error("Interview request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Interview request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
