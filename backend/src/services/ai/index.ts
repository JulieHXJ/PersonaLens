import OpenAI from 'openai';
import { env } from '../../config/env';
import { ExtractedEvidence, AiReasoningOutput } from '../../types/analysis';
import { logger } from '../../utils/logger';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function runReasoning(evidence: ExtractedEvidence): Promise<AiReasoningOutput> {
  const prompt = `
You are analyzing a website only from structured evidence extracted by a program.
You did not browse the site yourself.
Do not claim to have seen anything outside the provided evidence.
Do not invent missing facts.
Return valid JSON only matching the exact schema required.

EVIDENCE:
${JSON.stringify(evidence, null, 2)}
`;

  try {
    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert UX and business analyst. Output JSON strictly matching this TypeScript type:
type AiReasoningOutput = {
  pageType: string;
  websiteCategory: string;
  confidence: number; // 0-100
  syntheticUsers: Array<{
    label: string;
    description: string;
    goals: string[];
    frustrations: string[];
  }>;
  evaluation: {
    valuePropositionClarity: number; // 0-100
    trustSignals: number; // 0-100
    ctaClarity: number; // 0-100
    informationHierarchy: number; // 0-100
    frictionPoints: string[];
    unansweredQuestions: string[];
    strengths: string[];
    improvements: string[];
  };
  summary: string;
}`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return JSON.parse(response.choices[0].message.content || '{}') as AiReasoningOutput;
  } catch (err: any) {
    logger.error('AI Reasoning failed:', err.message);
    throw new Error('AI output parsing failed');
  }
}
