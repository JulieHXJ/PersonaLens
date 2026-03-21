"use server";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const responseSchema = z.object({
  reports: z.array(z.object({
    persona_type: z.enum(["Senior", "A11y", "Pro"]),
    score: z.number().describe("Score out of 100 for this persona. 100 means perfect usability/compliance."),
    findings: z.array(
      z.object({
        issue: z.string().describe("Detailed description of the UI flaw identified"),
        coordinates: z.object({
          x: z.number().describe("X coordinate in pixels"),
          y: z.number().describe("Y coordinate in pixels"),
          width: z.number().optional().describe("Width in pixels"),
          height: z.number().optional().describe("Height in pixels"),
        }),
        severity: z.enum(["low", "medium", "high"]).optional(),
      })
    ).describe("List of identified issues with their specific coordinates in the provided HTML context box properties."),
    summary_en: z.string().describe("A concise summary in English (Formal legal language for Legal Advisor, Simple plain English for Oma Schmidt, Modern Tech English for Digital Native)."),
  })).describe("The array of reports, one for each requested persona."),
});

export async function runAgentsAnalysis(
  auditId: Id<"website_audits">,
  screenshotBase64: string,
  simplifiedHtml: string
) {
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash", // Use the robust 2.5-flash model since it is confirmed available and has quota
    maxOutputTokens: 8192,
    temperature: 0.1,
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  });

  const structuredLlm = llm.withStructuredOutput(responseSchema, { name: "persona_reports" });

  await convex.mutation(api.audits.updateAuditStatus, {
    id: auditId,
    status: "analyzing",
  });

  const systemInstruction = `
You are an AI UX & Accessibility Audit platform.
You will evaluate the provided website screenshot and HTML context from the perspective of three specific personas:

1. 'Oma Schmidt' (Senior): Focus on font size readability, color contrast, and simple language. Identify areas that are hard to read, confusing, or lack clear contrast. Output summary in simple, plain English.
2. 'Legal Advisor' (A11y): Strictly enforce digital accessibility laws. Focus on compliance, mandatory legal pages availability, and data privacy (GDPR) requirements. Output your summary in formal English legal terms.
3. 'Digital Native' (Pro): UX expert focusing on loading speed indicators, clutter, and 'Dark Patterns' like hidden costs, fake urgency, or difficult opt-outs (e.g., cookie consent labyrinths). Output summary in modern tech English.

For EACH persona, you MUST generate a separate report in the output array.
Reference the HTML box coordinates (x, y, width, height) to pinpoint flaws on the screen.
Ensure ALL output, including summaries and issue descriptions, is in English.
  `;

  const messageContent = [
    {
      type: "text" as const,
      text: `Analyze the following website structure and screenshot for the three personas.\n\nHTML Context with Coordinates:\n${simplifiedHtml}`,
    },
    {
      type: "image_url" as const,
      image_url: `data:image/jpeg;base64,${screenshotBase64}`,
    },
  ];

  try {
    const messages = [
      {
        role: "system",
        content: systemInstruction,
      },
      {
        role: "user",
        content: messageContent,
      },
    ];

    // Single API call for all personas to heavily reduce rate limit consumption
    const result = await structuredLlm.invoke(messages);

    // Save each report to Convex
    for (const report of result.reports) {
      await convex.mutation(api.audits.addPersonaReport, {
        auditId,
        persona_type: report.persona_type,
        score: report.score,
        findings: report.findings.map(f => ({
          ...f,
          severity: f.severity || "medium"
        })),
        summary_en: report.summary_en,
      });
    }
    
    const overallScore = result.reports.length > 0
      ? Math.round(result.reports.reduce((acc, curr) => acc + curr.score, 0) / result.reports.length)
      : 0;

    await convex.mutation(api.audits.updateAuditStatus, {
      id: auditId,
      status: "completed",
      overall_score: overallScore,
    });

    return { success: true };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw error;
  }
}
