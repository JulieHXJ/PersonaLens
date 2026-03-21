import { NextRequest, NextResponse } from "next/server";
import { runPersonaTest, DeviceMode } from "@/lib/persona-tester";
import { Persona, WebsiteAnalysis } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:interview");

export async function POST(req: NextRequest) {
  try {
    const { persona, analysis, device } = (await req.json()) as {
      persona: Persona;
      analysis: WebsiteAnalysis;
      device?: DeviceMode;
    };

    if (!persona || !analysis) {
      return NextResponse.json(
        { error: "persona and analysis are required" },
        { status: 400 }
      );
    }

    const deviceMode = device || "desktop";
    log.info(`Interview request: ${persona.name} testing ${analysis.productName} on ${deviceMode}`);

    const result = await runPersonaTest(persona, analysis, undefined, deviceMode);

    // Map to the format the progress/report pages expect
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
        // Extra fields from beta testing
        bugs: result.summary.bugs,
        uxIssues: result.summary.uxIssues,
        missingFeatures: result.summary.missingFeatures,
        confusingElements: result.summary.confusingElements,
        topLikes: result.summary.topLikes,
        topDislikes: result.summary.topDislikes,
        overallVerdict: result.summary.overallVerdict,
        wouldRecommend: result.summary.wouldRecommend,
      },
    };

    log.info(`Interview complete: ${persona.name}`, {
      buySignal: result.summary.buySignal,
      bugs: result.summary.bugs.length,
    });

    return NextResponse.json(mapped);
  } catch (error) {
    log.error("Interview failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Interview failed" },
      { status: 500 }
    );
  }
}
