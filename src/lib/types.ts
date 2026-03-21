export interface Persona {
  id: string;
  name: string;
  age: number;
  role: string;
  background: string;
  segment: string;
  icon: string;
  painPoints: string[];
  goals: string[];
  techSavviness: "low" | "medium" | "high";
  selected: boolean;
}

export interface WebsiteAnalysis {
  url: string;
  productName: string;
  productDescription: string;
  targetAudience: string;
  keyFeatures: string[];
  industry: string;
  screenshotUrl?: string;
}

export type RunStatus = "configuring" | "running" | "completed" | "failed";

export interface RunConfig {
  websiteUrl: string;
  analysis: WebsiteAnalysis;
  personas: Persona[];
  selectedPersonaIds: string[];
}
