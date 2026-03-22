export interface ExtractedWebsiteData {
  url: string;
  title: string;
  description?: string;
  headings: { level: number; text: string }[];
  paragraphs: string[];
  buttonsAndLinks: { text: string; href?: string }[];
  forms: { action?: string; inputs: string[] }[];
  images: { alt: string }[];
}

export function buildSystemPrompt(): string {
  return `You are an expert Product Manager, UX Researcher, and Growth Hacker.
Your goal is to evaluate a website based on its extracted content and structure.
You don't just analyze how the website looks—you analyze whether it works for the business.

Evaluate the website across these 5 dimensions (Score 0-10):
1. Design Quality: Visual hierarchy, spacing, brand consistency, readability.
2. UX Clarity: Cognitive load, navigation logic, friction points.
3. Conversion Funnel: CTA visibility, value proposition clarity, user journey.
4. Business Logic: Alignment with business model, missing trust signals, missing essential elements.
5. Growth Potential: Retention hooks, viral loops, account creation incentives, lead capture.

You must infer:
- The Website Type (SaaS, Ecommerce, Marketplace, Booking, Portfolio, Content site, App landing page, Other)
- The expected User Journey
- Conversion blockers and Missing Business Elements
- Growth opportunities

Provide a strict, valid JSON response that matches the required schema perfectly. Be critical but constructive.
`;
}

export function buildUserPrompt(data: ExtractedWebsiteData): string {
  // We limit the amount of text to avoid blowing up context window unnecessarily
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const truncate = (arr: any[], limit: number) => arr.slice(0, limit);

  return `
Here is the extracted data from the target website:
URL: ${data.url}
Title: ${data.title}
Meta Description: ${data.description || "N/A"}

--- HEADINGS ---
${truncate(data.headings, 20).map(h => `H${h.level}: ${h.text}`).join('\n')}

--- BUTTONS & CALLS TO ACTION ---
${truncate(data.buttonsAndLinks, 30).map(b => `- ${b.text} (Link: ${b.href || "none"})`).join('\n')}

--- TEXT CONTENT (Samples) ---
${truncate(data.paragraphs, 15).map(p => `- ${p}`).join('\n')}

--- FORMS ---
${data.forms.length === 0 ? "No forms detected." : truncate(data.forms, 5).map(f => `- Form: [${f.inputs.join(', ')}]`).join('\n')}

--- IMAGES (Alt Text) ---
${truncate(data.images, 10).map(i => `- ${i.alt}`).join('\n')}

Based on this structural data, perform a deep product and UX analysis.
If information is sparse, make reasonable inferences based on standard patterns for the detected website type.
`;
}
