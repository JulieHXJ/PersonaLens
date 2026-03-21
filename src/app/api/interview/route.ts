import { NextRequest, NextResponse } from "next/server";
import { runInterview } from "@/lib/ai";
import { Persona, WebsiteAnalysis } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { persona, analysis } = (await req.json()) as {
      persona: Persona;
      analysis: WebsiteAnalysis;
    };

    if (!persona || !analysis) {
      return NextResponse.json(
        { error: "persona and analysis are required" },
        { status: 400 }
      );
    }

    const result = await runInterview(persona, analysis);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview error:", error);
    const message =
      error instanceof Error ? error.message : "Interview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
