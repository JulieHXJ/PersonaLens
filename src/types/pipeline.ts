export type PipelineStatus = "idle" | "running" | "success" | "error";

export type TraceEvent = {
  id: string;
  message: string;
  status: "pending" | "running" | "done" | "error";
  details?: string;
  // Specific structured data for rich rendering
  type?: "fetch" | "links" | "screenshots" | "extraction" | "classification" | "inference" | "generation";
  data?: {
    // For "fetch"
    url?: string;
    statusCode?: number;
    pageTitle?: string;
    htmlSize?: string;
    
    // For "links"
    discoveredLinks?: string[];
    
    // For "screenshots"
    screenshots?: ScreenshotPreview[];
    
    // For "extraction"
    extractedEvidence?: ExtractedEvidence;
    
    // For "classification"
    classifiedPages?: ClassifiedPage[];
    
    // For "inference"
    primaryCategory?: string;
    secondaryCategory?: string;
    
    // For "generation"
    audienceClues?: AudienceClues;
    generatedCount?: number;
  };
};

export interface ScreenshotPreview {
  device: "Desktop" | "Tablet" | "Mobile";
  url: string;
}

export interface ExtractedEvidence {
  headings: string[];
  copySnippets: string[];
  buttons: string[];
  pricing?: string[];
  forms: string[];
  featureBlocks: string[];
  trustSignals: string[];
  integrations: string[];
}

export interface CrawlResult {
  url: string;
  title: string;
  html: string;
  screenshotUrl?: string;
  links: string[];
}

export interface ClassifiedPage {
  url: string;
  pageType: "homepage" | "pricing" | "about" | "features" | "blog" | "contact" | "other";
  confidence: number;
}

export type InferredWebsiteType = 
  | "SaaS"
  | "Ecommerce"
  | "Education"
  | "Developer Tool"
  | "AI Product"
  | "B2B Service"
  | "Marketplace"
  | "Content Platform"
  | "Other";

export interface AudienceClues {
  b2b_vs_b2c: "B2B" | "B2C" | "Both";
  technical_level: "Low" | "Medium" | "High";
  industry_verticals: string[];
  company_size_hints: string[];
}

export interface PersonaEvidence {
  source_text: string;
  location: string;
  implication: string;
}

export interface CandidatePersona {
  id: string;
  avatar_url: string;
  identity_label: string;
  archetype: string;
  short_bio: string; // Used for UI selection
  core_goal: string;
  priorities_and_concerns: string[];
  biggest_doubts: string[];
  price_sensitivity: "Low" | "Medium" | "High";
  ai_automation_acceptance: "Skeptical" | "Neutral" | "Enthusiastic";
  decision_maker_likelihood: "Low" | "Medium" | "High";
  evidence: PersonaEvidence[];
  relevance_explanation: string;
}

export interface TaskResult {
  task_name: string;
  status: "Success" | "Partial" | "Failed";
}

export interface SimulationResult {
  persona_id: string;
  persona_label?: string;
  browsing_summary: string;
  resonance_score?: number;
  tasks: TaskResult[];
  main_friction: string[];
}

export interface DashboardInsight {
  buy_signals: string[];
  objections: string[];
  feature_priority: string[];
  segment_scores: { segment: string; score: number }[];
}

export interface PipelineResult {
  website_type: InferredWebsiteType;
  audience_space: AudienceClues;
  personas: CandidatePersona[];
  evidence_summary: ExtractedEvidence;
}

export type AppStage = "idle" | "tracing" | "selection" | "simulating" | "dashboard" | "documents";

export type AppView = "workspace" | "documents";

export interface AnalysisSession {
  url: string;
  stage: AppStage;
  traceEvents: TraceEvent[];
  pipelineData: PipelineResult | null;
  selectedUserIds: string[];
  simulationResults: SimulationResult[];
  dashboardInsight: DashboardInsight | null;
}

export interface SavedReport {
  id: string;
  isExample: boolean;
  isTemporary: boolean;
  url: string;
  site_title: string;
  date_analyzed: string; // ISO string
  website_category: InferredWebsiteType;
  summary: string;
  key_insight?: string;
  preview_screenshot?: string;
  session_data: AnalysisSession;
}
