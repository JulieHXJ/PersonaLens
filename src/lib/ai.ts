import OpenAI from "openai";
import { Persona, WebsiteAnalysis } from "./types";
import { ScrapedWebsite } from "./scraper";

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

export async function generateAnalysis(
  scraped: ScrapedWebsite
): Promise<WebsiteAnalysis> {
  const prompt = `Analyze this website and extract structured information.

Website URL: ${scraped.url}
Title: ${scraped.title}
Meta Description: ${scraped.metaDescription}
Navigation: ${scraped.navigation.join(", ")}
Headings: ${scraped.headings.map((h) => `[${h.level}] ${h.text}`).join("\n")}
Content excerpts:
${scraped.paragraphs.slice(0, 10).join("\n---\n")}
Features/List items: ${scraped.features.slice(0, 15).join(", ")}

Respond with ONLY valid JSON matching this schema:
{
  "productName": "string - the product/service name",
  "productDescription": "string - 2-3 sentence description of what this product/service does",
  "targetAudience": "string - who this product/service is for",
  "keyFeatures": ["string array - 4-6 key features or services offered"],
  "industry": "string - the industry category"
}`;

  const response = await getGemini().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a market research analyst. Analyze websites and extract structured product/service information. Respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const text = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(text.replace(/```json\n?|```/g, "").trim());

  return {
    url: scraped.url,
    productName: parsed.productName || scraped.title,
    productDescription: parsed.productDescription || scraped.metaDescription,
    targetAudience: parsed.targetAudience || "",
    keyFeatures: parsed.keyFeatures || [],
    industry: parsed.industry || "",
  };
}

export async function generatePersonas(
  analysis: WebsiteAnalysis,
  count: number = 10
): Promise<Persona[]> {
  const prompt = `You are generating synthetic customer personas for user research on this product/service:

Product: ${analysis.productName}
Description: ${analysis.productDescription}
Target Audience: ${analysis.targetAudience}
Key Features: ${analysis.keyFeatures.join(", ")}
Industry: ${analysis.industry}

Generate ${count} diverse, realistic personas who would be potential customers or users of this product/service. Each persona should represent a different segment, motivation, or demographic.

Ensure diversity across:
- Age (20s to 60s)
- Background and life situation
- Tech savviness (low, medium, high)
- Pain point severity
- Different reasons for needing the product

Respond with ONLY valid JSON — an array of objects matching this schema:
[{
  "id": "p1",
  "name": "string - realistic German name if German market, otherwise contextually appropriate",
  "age": number,
  "role": "string - short role description (e.g., 'First-time expectant mother')",
  "background": "string - 2 sentences about their life situation relevant to this product",
  "segment": "string - customer segment label (e.g., 'Budget-conscious', 'Premium')",
  "icon": "string - a Material Symbols icon name that fits this persona (e.g., 'person', 'school', 'apartment')",
  "painPoints": ["string array - 3 specific pain points related to this product"],
  "goals": ["string array - 3 goals they want to achieve with this product"],
  "techSavviness": "low" | "medium" | "high",
  "selected": true
}]

Make the first 8 personas selected:true and the last ${count - 8 > 0 ? count - 8 : 0} selected:false.`;

  const response = await getGemini().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a customer research expert who creates realistic, diverse synthetic personas for product validation. Respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const text = response.choices[0]?.message?.content || "[]";
  return JSON.parse(text.replace(/```json\n?|```/g, "").trim());
}

export interface InterviewResult {
  personaId: string;
  personaName: string;
  transcript: { role: "interviewer" | "persona"; content: string }[];
  extractedData: {
    buySignal: number;
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
    killerQuote: string;
    surpriseInsight: string;
    overallSentiment: string;
  };
}

export async function runInterview(
  persona: Persona,
  analysis: WebsiteAnalysis
): Promise<InterviewResult> {
  const prompt = `Simulate a customer discovery interview. You play BOTH the interviewer and the persona.

PRODUCT/SERVICE:
Name: ${analysis.productName}
Description: ${analysis.productDescription}
Features: ${analysis.keyFeatures.join(", ")}

PERSONA TO SIMULATE:
Name: ${persona.name}, Age: ${persona.age}
Role: ${persona.role}
Background: ${persona.background}
Pain Points: ${persona.painPoints.join("; ")}
Goals: ${persona.goals.join("; ")}
Tech Savviness: ${persona.techSavviness}

INTERVIEW STRUCTURE:
1. Problem exploration — ask about their experience with the problem domain
2. Current solution deep-dive — how they handle it today
3. Product concept reaction — present the product, get reaction
4. Feature prioritization — which features matter most
5. Willingness to pay (Van Westendorp) — at what prices would this be too cheap, a bargain, getting expensive, too expensive
6. Objection surfacing — what would stop them from using this
7. Discovery channel — where they'd expect to find this

The persona must respond AUTHENTICALLY based on their profile — including skepticism and real-world constraints.

Respond with ONLY valid JSON:
{
  "transcript": [
    {"role": "interviewer", "content": "..."},
    {"role": "persona", "content": "..."}
  ],
  "extractedData": {
    "buySignal": 0.0-1.0,
    "willingnessToPay": {
      "tooCheap": number_in_euros_monthly,
      "bargain": number,
      "gettingExpensive": number,
      "tooExpensive": number
    },
    "topObjections": ["string", "string"],
    "featureRanking": ["most important feature", "second", "third"],
    "discoveryChannel": "string",
    "currentSolution": "string",
    "killerQuote": "string - the most memorable thing the persona said",
    "surpriseInsight": "string - something unexpected that came up",
    "overallSentiment": "string - one phrase summary"
  }
}`;

  const response = await getGemini().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are simulating a customer discovery interview. Play both interviewer and persona authentically. The persona responds based on their real profile, including skepticism and constraints. Respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 3000,
  });

  const text = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(text.replace(/```json\n?|```/g, "").trim());

  return {
    personaId: persona.id,
    personaName: persona.name,
    ...parsed,
  };
}
