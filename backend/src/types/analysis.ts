export type CrawledPage = {
  url: string;
  finalUrl: string;
  status: number | null;
  html: string;
  fetchedAt: string;
  discoveredLinks: string[];
};

export type ScreenshotSet = {
  desktop: string | null;
  tablet: string | null;
  mobile: string | null;
};

export type ExtractedEvidence = {
  pageUrl: string;
  title: string | null;
  metaDescription: string | null;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  ctas: string[];
  forms: Array<{
    action: string | null;
    method: string | null;
    inputs: string[];
    inferredPurpose: "signup" | "login" | "contact" | "search" | "subscribe" | "unknown";
  }>;
  pricingMentions: string[];
  links: {
    internal: string[];
    external: string[];
  };
  featureSections: Array<{
    heading: string | null;
    description: string | null;
  }>;
};

export type AiReasoningOutput = {
  pageType: string;
  websiteCategory: string;
  confidence: number;
  syntheticUsers: Array<{
    label: string;
    description: string;
    goals: string[];
    frustrations: string[];
  }>;
  evaluation: {
    valuePropositionClarity: number;
    trustSignals: number;
    ctaClarity: number;
    informationHierarchy: number;
    frictionPoints: string[];
    unansweredQuestions: string[];
    strengths: string[];
    improvements: string[];
  };
  summary: string;
};

export type AnalyzeResponse = {
  success: boolean;
  inputUrl: string;
  normalizedUrl: string;
  pages: Array<{
    url: string;
    finalUrl?: string;
    status: number | null;
  }>;
  screenshots: ScreenshotSet;
  evidence: ExtractedEvidence;
  ai: AiReasoningOutput | null;
  dashboardCards: Array<{
    id: string;
    title: string;
    score?: number;
    summary: string;
    details: string[];
  }>;
};
