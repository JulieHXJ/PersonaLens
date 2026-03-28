"use client";

import { useState, useEffect, useRef } from "react";
import { UrlInputForm } from "@/components/forms/UrlInputForm";
import { TerminalTrace } from "@/components/ui/TerminalTrace";
import { SyntheticUserSelection } from "@/components/dashboard/SyntheticUserSelection";
import { SimulationResults } from "@/components/dashboard/SimulationResults";
import { SimplifiedInsightDashboard } from "@/components/dashboard/SimplifiedInsightDashboard";
import { DocumentLibrary } from "@/components/dashboard/DocumentLibrary";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  TraceEvent,
  AppStage,
  AppView,
  SavedReport,
  AnalysisSession,
  CandidatePersona,
  PipelineResult,
  SimulationResult,
  DashboardInsight,
} from "@/types/pipeline";
import { Persona, WebsiteAnalysis } from "@/lib/types";
import { permanentExampleReport } from "@/lib/pipeline-mock";

const SESSION_REPORTS_KEY = "marketMirror_session_reports";
const LEGACY_REPORTS_KEY = "marketMirror_reports";

function normalizeSavedReport(
  report: unknown,
  fallback: { isExample: boolean; isTemporary: boolean }
): SavedReport | null {
  if (!report || typeof report !== "object") return null;
  const raw = report as Partial<SavedReport> & { isExample?: unknown; isTemporary?: unknown };
  if (typeof raw.id !== "string" || typeof raw.url !== "string" || typeof raw.site_title !== "string") {
    return null;
  }

  return {
    ...raw,
    isExample: typeof raw.isExample === "boolean" ? raw.isExample : fallback.isExample,
    isTemporary: typeof raw.isTemporary === "boolean" ? raw.isTemporary : fallback.isTemporary,
  } as SavedReport;
}

export default function Home() {
  const [stage, setStage] = useState<AppStage>("idle");
  const [view, setView] = useState<AppView>("workspace");
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentAnalysis, setCurrentAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentInterviewingName, setCurrentInterviewingName] = useState<string | null>(null);
  const [currentInterviewActivity, setCurrentInterviewActivity] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [isGeminiKeySaved, setIsGeminiKeySaved] = useState<boolean>(false);
  const [showGeminiConfig, setShowGeminiConfig] = useState<boolean>(true);
  
  // Persistent Storage State
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Current session data to allow replacing workspace state
  const [currentSession, setCurrentSession] = useState<AnalysisSession | null>(null);

  const STAGE_ORDER = ["idle", "tracing", "selection", "simulating", "dashboard"];
  const currentStageLevel = stage === "documents" ? -1 : STAGE_ORDER.indexOf(stage);

  // Refs for auto-scrolling
  const traceRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Refs for canceling analysis
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toCandidatePersona = (persona: Persona): CandidatePersona => ({
    id: persona.id,
    avatar_url: `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(persona.name)}`,
    identity_label: persona.name,
    archetype: persona.role,
    short_bio: persona.background,
    core_goal: persona.goals?.[0] || "Understand product value quickly",
    priorities_and_concerns: persona.goals || [],
    biggest_doubts: persona.painPoints || [],
    price_sensitivity: "Medium",
    ai_automation_acceptance: persona.techSavviness === "high" ? "Enthusiastic" : persona.techSavviness === "low" ? "Skeptical" : "Neutral",
    decision_maker_likelihood: "Medium",
    evidence: [],
    relevance_explanation: `${persona.name} represents ${persona.segment} users with ${persona.techSavviness} technical confidence.`,
  });

  const toPipelineResult = (analysis: WebsiteAnalysis, personas: Persona[]): PipelineResult => ({
    website_type: "Other",
    audience_space: {
      b2b_vs_b2c: "Both",
      technical_level: "Medium",
      industry_verticals: analysis.industry ? [analysis.industry] : [],
      company_size_hints: [],
    },
    personas: personas.map(toCandidatePersona),
    evidence_summary: {
      headings: [],
      copySnippets: [analysis.productDescription].filter(Boolean),
      buttons: [],
      forms: [],
      featureBlocks: analysis.keyFeatures || [],
      trustSignals: [],
      integrations: [],
    },
  });

  const toTraceEvent = (event: Record<string, unknown>, index: number): TraceEvent | null => {
    const eventType = typeof event.type === "string" ? event.type : "unknown";
    const eventMessage = typeof event.message === "string" ? event.message : "Processing";

    if (eventType === "action") {
      return null;
    }

    if (eventType === "thinking" && !eventMessage.toLowerCase().includes("generating customer personas")) {
      return null;
    }

    const status: TraceEvent["status"] =
      eventType === "error"
        ? "error"
        : eventType === "thinking"
          ? "running"
          : "done";

    const traceEvent: TraceEvent = {
      id: `${typeof event.timestamp === "string" ? event.timestamp : Date.now()}-${index}`,
      message: eventMessage,
      status,
      details: eventType,
    };

    if (eventType === "observation") {
      const observationData =
        event.data && typeof event.data === "object"
          ? (event.data as Record<string, unknown>)
          : {};
      const kind = typeof observationData.kind === "string" ? observationData.kind : "";

      if (kind === "fetch") {
        traceEvent.message = "Fetching homepage...";
        traceEvent.type = "fetch";
        traceEvent.data = {
          url: typeof observationData.url === "string" ? observationData.url : currentUrl,
          statusCode: typeof observationData.statusCode === "number" ? observationData.statusCode : 200,
          pageTitle: typeof observationData.pageTitle === "string" ? observationData.pageTitle : "",
          htmlSize: typeof observationData.htmlSize === "string" ? observationData.htmlSize : "",
        };
      }

      if (kind === "links") {
        const links = Array.isArray(observationData.links)
          ? observationData.links.filter((link): link is string => typeof link === "string")
          : [];
        traceEvent.message = "Discovering navigation links...";
        traceEvent.type = "links";
        traceEvent.data = {
          discoveredLinks: links.map((link) => {
            try {
              return new URL(link).pathname || "/";
            } catch {
              return link;
            }
          }),
        };
      }

      if (kind === "extraction") {
        const headings = Array.isArray(observationData.headings)
          ? observationData.headings.filter((item): item is string => typeof item === "string")
          : [];
        const buttons = Array.isArray(observationData.buttons)
          ? observationData.buttons.filter((item): item is string => typeof item === "string")
          : [];
        const featureBlocks = Array.isArray(observationData.featureBlocks)
          ? observationData.featureBlocks.filter((item): item is string => typeof item === "string")
          : [];
        traceEvent.message = "Extracting content blocks...";
        traceEvent.type = "extraction";
        traceEvent.data = {
          extractedEvidence: {
            headings,
            copySnippets: [],
            buttons,
            forms: [],
            featureBlocks,
            trustSignals: [],
            integrations: [],
          },
        };
      }

      if (kind === "classification") {
        const pages = Array.isArray(observationData.pages)
          ? observationData.pages
              .filter((page): page is Record<string, unknown> => !!page && typeof page === "object")
              .map((page) => ({
                url: typeof page.url === "string" ? page.url : "",
                pageType:
                  page.pageType === "home" ||
                  page.pageType === "homepage" ||
                  page.pageType === "pricing" ||
                  page.pageType === "about" ||
                  page.pageType === "features" ||
                  page.pageType === "blog" ||
                  page.pageType === "contact"
                    ? page.pageType === "home"
                      ? "homepage"
                      : page.pageType
                    : "other",
                confidence: typeof page.confidence === "number" ? page.confidence : 70,
              }))
          : [];
        traceEvent.message = "Classifying page types...";
        traceEvent.type = "classification";
        traceEvent.data = {
          classifiedPages: pages,
        };
      }

      if (kind === "inference") {
        traceEvent.message = "Inferring website category...";
        traceEvent.type = "inference";
        traceEvent.data = {
          primaryCategory:
            typeof observationData.primaryCategory === "string"
              ? observationData.primaryCategory
              : "Other",
          secondaryCategory:
            typeof observationData.secondaryCategory === "string"
              ? observationData.secondaryCategory
              : "General",
        };
      }
    }

    if (eventType === "screenshot") {
      const screenshotUrl = typeof event.screenshot === "string" ? event.screenshot : "";
      if (screenshotUrl) {
        traceEvent.type = "screenshots";
        traceEvent.message = "Capturing screenshots...";
        traceEvent.data = {
          screenshots: [{ device: String(event.message || "Snapshot"), url: screenshotUrl }],
        };
      }
    }

    if (eventType === "done") {
      const doneData = event.data as Partial<WebsiteAnalysis> | undefined;
      traceEvent.type = "extraction";
      traceEvent.data = {
        extractedEvidence: {
          headings: doneData?.productName ? [doneData.productName] : [],
          copySnippets: doneData?.productDescription ? [doneData.productDescription] : [],
          buttons: [],
          forms: [],
          featureBlocks: Array.isArray(doneData?.keyFeatures) ? doneData.keyFeatures : [],
          trustSignals: [],
          integrations: [],
        },
      };
    }

    if (eventType === "result") {
      const resultData = event.data as { analysis?: WebsiteAnalysis; personas?: Persona[] } | undefined;
      const personaCount = Array.isArray(resultData?.personas) ? resultData.personas.length : 0;
      traceEvent.message = `Generating constrained candidate personas...`;
      traceEvent.type = "generation";
      traceEvent.data = {
        generatedCount: personaCount,
      };
    }

    if (eventType === "thinking" && eventMessage.toLowerCase().includes("generating customer personas")) {
      traceEvent.message = "Generating constrained candidate personas...";
      traceEvent.type = "generation";
      traceEvent.status = "running";
    }

    if (!traceEvent.type && traceEvent.status !== "error") {
      return null;
    }

    return traceEvent;
  };

  const buildInsightFromResults = (results: SimulationResult[]): DashboardInsight => {
    const objectionPool = results.flatMap((r) => r.main_friction || []).filter(Boolean);
    const uniqueObjections = Array.from(new Set(objectionPool)).slice(0, 5);
    const buySignals = results.map((r) => r.browsing_summary).filter(Boolean).slice(0, 5);

    return {
      buy_signals: buySignals.length > 0 ? buySignals : ["Users identified clear value proposition on core pages."],
      objections: uniqueObjections.length > 0 ? uniqueObjections : ["No major objections captured in completed interviews."],
      feature_priority: ["Clarify pricing", "Improve trust proof", "Reduce onboarding friction"],
      segment_scores: results.map((r) => ({
        segment: r.persona_label || r.persona_id,
        score:
          typeof r.resonance_score === "number"
            ? Math.max(0, Math.min(100, Math.round(r.resonance_score)))
            : r.tasks.length === 0
              ? 50
              : Math.round((r.tasks.filter((t) => t.status === "Success").length / r.tasks.length) * 100),
      })),
    };
  };

  // Auto-scroll to new blocks
  useEffect(() => {
    const scrollToRef = (ref: React.RefObject<HTMLDivElement>) => {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };

    if (stage === "tracing") scrollToRef(traceRef);
    if (stage === "selection") scrollToRef(selectionRef);
    if (stage === "simulating") scrollToRef(simulationRef);
    if (stage === "dashboard") scrollToRef(dashboardRef);
  }, [stage]);

  useEffect(() => {
    const storedSessionReports = sessionStorage.getItem(SESSION_REPORTS_KEY);
    const storedGeminiApiKey = localStorage.getItem("marketMirror_geminiApiKey");

    if (storedSessionReports) {
      try {
        const parsed = JSON.parse(storedSessionReports);
        const sessionReports = Array.isArray(parsed)
          ? parsed
              .map((report) => normalizeSavedReport(report, { isExample: false, isTemporary: true }))
              .filter((report): report is SavedReport => !!report)
              .filter((report) => !report.isExample)
              .map((report) => ({ ...report, isExample: false, isTemporary: true }))
          : [];
        setSavedReports([permanentExampleReport, ...sessionReports]);
      } catch (e) {
        console.error("Failed to parse session reports", e);
        setSavedReports([permanentExampleReport]);
      }
    } else {
      setSavedReports([permanentExampleReport]);
    }

    // Cleanup old persistent report key so temporary reports don't survive app restarts.
    localStorage.removeItem(LEGACY_REPORTS_KEY);

    if (storedGeminiApiKey) {
      setGeminiApiKey(storedGeminiApiKey);
      setIsGeminiKeySaved(true);
      setShowGeminiConfig(false);
    }
  }, []);

  const saveReportsToStorage = (reports: SavedReport[]) => {
    const sessionReports = reports
      .filter((report) => report.isTemporary && !report.isExample)
      .map((report) => ({ ...report, isExample: false, isTemporary: true }));

    setSavedReports([permanentExampleReport, ...sessionReports]);
    sessionStorage.setItem(SESSION_REPORTS_KEY, JSON.stringify(sessionReports));
  };

  const handleNewAnalysis = () => {
    setView("workspace");
    setStage("idle");
    setCurrentUrl("");
    setCurrentAnalysis(null);
    setError(null);
    setTraceEvents([]);
    setSelectedUserIds([]);
    setCurrentInterviewingName(null);
    setCurrentInterviewActivity(null);
    setCurrentSession(null);
  };

  const handleOpenDocuments = () => {
    setView("documents");
  };

  const handleReturnToWorkspace = () => {
    setView("workspace");
  };

  const handleCancelAnalysis = () => {
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);
    
    setStage("idle");
    setView("workspace");
    setCurrentUrl("");
    setCurrentAnalysis(null);
    setError(null);
    setTraceEvents([]);
    setSelectedUserIds([]);
    setCurrentInterviewingName(null);
    setCurrentInterviewActivity(null);
    setCurrentSession(null);
  };

  const handleOpenReport = (report: SavedReport) => {
    const s = report.session_data;
    setView("workspace");
    setCurrentUrl(s.url);
    setTraceEvents(s.traceEvents);
    setSelectedUserIds(s.selectedUserIds);
    setCurrentSession(s);
    setStage(s.stage); // Usually "dashboard"
  };

  const handleSaveReport = () => {
    if (stage !== "dashboard" || !currentUrl || !currentSession?.pipelineData || !currentSession.dashboardInsight) return;

    const insight = currentSession.dashboardInsight;
    let keyInsight = "";
    if (insight.buy_signals.length > 0) {
      keyInsight = insight.buy_signals[0];
    } else if (insight.objections.length > 0) {
      keyInsight = insight.objections[0];
    } else {
      keyInsight = "No major insights discovered.";
    }

    const newReport: SavedReport = {
      id: crypto.randomUUID(),
      isExample: false,
      isTemporary: true,
      url: currentUrl,
      site_title: new URL(currentUrl).hostname,
      date_analyzed: new Date().toISOString(),
      website_category: currentSession.pipelineData.website_type,
      summary: `Simulated ${selectedUserIds.length} synthetic users to identify friction points and buy signals.`,
      key_insight: keyInsight,
      preview_screenshot: traceEvents.find(e => e.type === "screenshots")?.data?.screenshots?.[0]?.url,
      session_data: {
        url: currentUrl,
        stage: "dashboard",
        traceEvents,
        pipelineData: currentSession.pipelineData,
        selectedUserIds,
        simulationResults: currentSession.simulationResults,
        dashboardInsight: insight
      }
    };

    const currentSessionReports = savedReports.filter((report) => report.isTemporary && !report.isExample);
    saveReportsToStorage([newReport, ...currentSessionReports]);
    alert("Report saved to Document Library!");
  };

  const handleAudit = async (url: string) => {
    if (!isGeminiKeySaved || !geminiApiKey.trim()) {
      setError("Please save your Gemini API key before starting analysis.");
      setStage("idle");
      return;
    }

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    const typoTlds: Record<string, string> = {
      ".come": ".com",
      ".cim": ".com",
      ".con": ".com",
      ".cm": ".com",
      ".ogr": ".org",
    };
    const host = parsedUrl.hostname.toLowerCase();
    const matchedTypo = Object.keys(typoTlds).find((tld) => host.endsWith(tld));
    if (matchedTypo) {
      const suggestedHost = host.slice(0, -matchedTypo.length) + typoTlds[matchedTypo];
      setError(`Domain looks invalid: ${host}. Did you mean https://${suggestedHost}?`);
      return;
    }

    handleNewAnalysis();
    setStage("tracing");
    setCurrentUrl(url);
    setError(null);

    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, maxSteps: 25, geminiApiKey: geminiApiKey.trim() }),
      });

      if (!res.ok) {
        throw new Error("Exploration failed to start");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream available");

      const decoder = new TextDecoder();
      let buffer = "";
      let hasResultEvent = false;
      let eventSeq = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const rawEvent = JSON.parse(line.slice(6)) as Record<string, any>;
              const event = toTraceEvent(rawEvent, eventSeq++);
              if (!event) {
                continue;
              }
              
              setTraceEvents((prev) => {
                const completedPrev = prev.map((item) =>
                  item.status === "running" ? { ...item, status: "done" as const } : item
                );
                let next: TraceEvent[];

                if (event.type === "screenshots" && event.data?.screenshots?.length) {
                  const incomingShots = event.data.screenshots;
                  const existingIndex = completedPrev.findIndex((item) => item.type === "screenshots");

                  if (existingIndex >= 0) {
                    const existing = completedPrev[existingIndex];
                    const existingShots = existing.data?.screenshots || [];
                    const mergedShots = [...existingShots];
                    incomingShots.forEach((incoming) => {
                      if (!mergedShots.some((shot) => shot.url === incoming.url)) {
                        mergedShots.push(incoming);
                      }
                    });

                    const updated = {
                      ...existing,
                      status: "done" as const,
                      message: "Capturing screenshots...",
                      data: {
                        ...existing.data,
                        screenshots: mergedShots.slice(-30),
                      },
                    };

                    next = completedPrev.map((item, idx) => (idx === existingIndex ? updated : item));
                  } else {
                    next = [...completedPrev, event];
                  }
                } else if (event.type === "generation") {
                  const existingGenerationIndex = completedPrev.findIndex(
                    (item) => item.type === "generation"
                  );

                  if (existingGenerationIndex >= 0) {
                    const existingGeneration = completedPrev[existingGenerationIndex];
                    const mergedGeneration: TraceEvent = {
                      ...existingGeneration,
                      ...event,
                      id: existingGeneration.id,
                      status: event.status,
                      data: {
                        ...existingGeneration.data,
                        ...event.data,
                      },
                    };

                    next = completedPrev.map((item, idx) =>
                      idx === existingGenerationIndex ? mergedGeneration : item
                    );
                  } else {
                    next = [...completedPrev, event];
                  }
                } else {
                  next = [...completedPrev, event];
                }

                setCurrentSession((s) => {
                  if (!s) {
                    return {
                      url,
                      stage: "tracing",
                      traceEvents: next,
                      pipelineData: null,
                      selectedUserIds: [],
                      simulationResults: [],
                      dashboardInsight: null,
                    };
                  }

                  return {
                    ...s,
                    traceEvents: next,
                  };
                });
                return next;
              });

              if (rawEvent.type === "result" && rawEvent.data?.analysis && rawEvent.data?.personas) {
                hasResultEvent = true;
                const analysis = rawEvent.data.analysis as WebsiteAnalysis;
                const personas = rawEvent.data.personas as Persona[];
                const pipelineData = toPipelineResult(analysis, personas);
                setCurrentAnalysis(analysis);
                setStage("selection");
                setCurrentSession(s => ({
                  url,
                  stage: "selection",
                  traceEvents: s?.traceEvents || [],
                  pipelineData,
                  selectedUserIds: [],
                  simulationResults: [],
                  dashboardInsight: null
                }));
              }

              if (rawEvent.type === "error") {
                throw new Error(rawEvent.message || "Analysis failed");
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      setTraceEvents((prev) => prev.map((item) =>
        item.status === "running" ? { ...item, status: "done" as const } : item
      ));

      if (!hasResultEvent) {
        throw new Error("Persona generation did not return a completed result. Please retry.");
      }
    } catch (err) {
      console.error("Exploration failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|DNS/i.test(message)) {
        setError(`Domain cannot be resolved. Please check the URL spelling (e.g., use .com not .come).`);
      } else {
        setError(message || "Failed to fetch or analyze the website.");
      }
      setStage("idle");
    }
  };

  // Convert CandidatePersona back to Persona format for API
  const toPersona = (candidate: CandidatePersona): Persona => {
    // Reverse map techSavviness from ai_automation_acceptance
    let techSavviness: "low" | "medium" | "high" = "medium";
    if (candidate.ai_automation_acceptance === "Enthusiastic") techSavviness = "high";
    else if (candidate.ai_automation_acceptance === "Skeptical") techSavviness = "low";
    
    return {
      id: candidate.id,
      name: candidate.identity_label,
      age: 35, // Default value
      role: candidate.archetype,
      background: candidate.short_bio,
      segment: candidate.identity_label, // Use name as segment fallback
      icon: "user", // Default icon
      painPoints: candidate.biggest_doubts,
      goals: candidate.priorities_and_concerns,
      techSavviness,
      selected: true,
    };
  };

  const handleStartSimulation = async (selectedIds: string[]) => {
    if (!isGeminiKeySaved || !geminiApiKey.trim()) {
      setError("Please save your Gemini API key before simulation.");
      setStage("selection");
      return;
    }

    setSelectedUserIds(selectedIds);
    setStage("simulating");
    setCurrentSession(s => s ? { ...s, stage: "simulating", selectedUserIds: selectedIds } : null);
    
    try {
      if (!currentSession?.pipelineData || !currentUrl) {
        throw new Error("No analysis data available");
      }

      // Get the personas from pipelineData
      const personas = currentSession.pipelineData.personas || [];
      const selectedPersonas = personas.filter((p) => selectedIds.includes(p.id));

      if (selectedPersonas.length === 0) {
        throw new Error("No personas selected");
      }

      const analysis: WebsiteAnalysis = currentAnalysis || {
        url: currentUrl,
        productName: new URL(currentUrl).hostname,
        productDescription: currentSession.pipelineData.evidence_summary.copySnippets[0] || "",
        targetAudience: currentSession.pipelineData.audience_space.b2b_vs_b2c,
        keyFeatures: currentSession.pipelineData.evidence_summary.featureBlocks || [],
        industry:
          currentSession.pipelineData.audience_space.industry_verticals[0] ||
          currentSession.pipelineData.website_type,
      };

      const simulationResults: SimulationResult[] = [];

      // Run interviews for each selected persona sequentially
      for (const candidatePersona of selectedPersonas) {
        try {
          // Convert CandidatePersona back to Persona format for the API
          const persona = toPersona(candidatePersona);
          setCurrentInterviewingName(persona.name);
          setCurrentInterviewActivity("Starting interview...");
          
          const res = await fetch("/api/interview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              persona,
              analysis,
              device: "desktop",
              geminiApiKey: geminiApiKey.trim(),
            }),
          });

          if (!res.ok) {
            console.error(`Interview API failed for ${persona.name}:`, res.status);
            continue;
          }

          const reader = res.body?.getReader();
          if (!reader) continue;

          const decoder = new TextDecoder();
          let buffer = "";
          let result: Record<string, any> | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Process remaining buffer
              if (buffer.trim()) {
                const lines = buffer.split("\n");
                let eventType = "";
                let eventData = "";
                for (const line of lines) {
                  if (line.startsWith("event: ")) {
                    eventType = line.slice(7);
                  } else if (line.startsWith("data: ")) {
                    eventData = line.slice(6);
                  }
                }
                if (eventType === "complete" && eventData) {
                  try {
                    result = JSON.parse(eventData);
                  } catch (e) {
                    console.error("Failed to parse remaining buffer:", eventData, e);
                  }
                }
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const messages = buffer.split("\n\n");
            buffer = messages.pop() || "";

            for (const message of messages) {
              if (!message.trim()) continue;
              
              const lines = message.split("\n");
              let eventType = "";
              let eventData = "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("event: ")) {
                  eventType = trimmed.slice(7);
                } else if (trimmed.startsWith("data: ")) {
                  eventData = trimmed.slice(6);
                }
              }

              if (eventType === "complete" && eventData) {
                try {
                  result = JSON.parse(eventData);
                  console.log(`Interview result parsed for ${persona.name}:`, result);
                } catch (e) {
                  console.error("Failed to parse interview result:", eventData, e);
                }
              } else if (eventType === "activity" && eventData) {
                try {
                  const parsedActivity = JSON.parse(eventData) as { message?: string };
                  if (parsedActivity?.message) {
                    setCurrentInterviewActivity(parsedActivity.message);
                  }
                } catch {
                  setCurrentInterviewActivity(eventData);
                }
              } else if (eventType === "error") {
                console.error(`Interview API error for ${persona.name}:`, eventData);
              }
            }
          }

          if (result) {
            const extracted =
              result.extractedData && typeof result.extractedData === "object"
                ? (result.extractedData as Record<string, unknown>)
                : {};

            const buySignal =
              typeof extracted.buySignal === "number" ? extracted.buySignal : null;
            const overallVerdict =
              typeof extracted.overallVerdict === "string" ? extracted.overallVerdict : "";
            const overallSentiment =
              typeof extracted.overallSentiment === "string" ? extracted.overallSentiment : "";
            const wouldRecommend =
              typeof extracted.wouldRecommend === "boolean" ? extracted.wouldRecommend : false;
            const topObjections = Array.isArray(extracted.topObjections)
              ? extracted.topObjections.filter((item): item is string => typeof item === "string")
              : [];
            const topDislikes = Array.isArray(extracted.topDislikes)
              ? extracted.topDislikes.filter((item): item is string => typeof item === "string")
              : [];
            const uxIssues = Array.isArray(extracted.uxIssues)
              ? extracted.uxIssues.filter((item): item is string => typeof item === "string")
              : [];
            const bugs = Array.isArray(extracted.bugs)
              ? extracted.bugs.filter((item): item is string => typeof item === "string")
              : [];
            const confusingElements = Array.isArray(extracted.confusingElements)
              ? extracted.confusingElements.filter((item): item is string => typeof item === "string")
              : [];

            const frictionItems = Array.from(
              new Set([...topObjections, ...topDislikes, ...uxIssues, ...bugs, ...confusingElements])
            ).slice(0, 5);

            const blockers = uxIssues.length + bugs.length + confusingElements.length;
            const navigationStatus: "Success" | "Partial" | "Failed" =
              blockers === 0 ? "Success" : blockers <= 2 ? "Partial" : "Failed";
            const valueStatus: "Success" | "Partial" | "Failed" =
              buySignal === null ? "Partial" : buySignal >= 7 ? "Success" : buySignal >= 4 ? "Partial" : "Failed";
            const conversionStatus: "Success" | "Partial" | "Failed" =
              wouldRecommend && topObjections.length <= 1
                ? "Success"
                : topObjections.length <= 3
                  ? "Partial"
                  : "Failed";

            const summaryParts = [
              overallVerdict,
              overallSentiment ? `Sentiment: ${overallSentiment}` : "",
              buySignal !== null ? `Buy signal: ${buySignal}/10` : "",
            ].filter(Boolean);

            const mappedResult: SimulationResult = {
              persona_id: String(result.personaId || persona.id),
              persona_label: persona.name,
              browsing_summary:
                summaryParts.length > 0
                  ? summaryParts.join(" • ")
                  : "Session completed with limited structured feedback.",
              resonance_score:
                buySignal !== null
                  ? buySignal * 10
                  : wouldRecommend
                    ? 70
                    : 45,
              tasks: [
                { task_name: "Navigate key pages", status: navigationStatus },
                { task_name: "Evaluate value proposition", status: valueStatus },
                { task_name: "Assess conversion readiness", status: conversionStatus },
              ],
              main_friction: frictionItems,
            };

            simulationResults.push(mappedResult);
            console.log(`Added simulation result for ${persona.name}, total: ${simulationResults.length}`);
            // Update UI with completed results progressively
            setCurrentSession(s => s ? { 
              ...s, 
              simulationResults: [...simulationResults]
            } : null);
            setCurrentInterviewActivity(null);
          } else {
            console.warn(`No result extracted for ${persona.name}`);
          }
        } catch (err) {
          console.error(`Interview failed for ${persona.name}:`, err);
          setCurrentInterviewActivity(null);
          // Continue with next persona even if one fails
        }
      }

      setCurrentInterviewingName(null);
      setCurrentInterviewActivity(null);

      // Move to dashboard after all interviews complete
      if (simulationResults.length === 0) {
        throw new Error("No interview results returned from API");
      }

      const insight = buildInsightFromResults(simulationResults);
      setStage("dashboard");
      setCurrentSession(s => s ? { 
        ...s, 
        stage: "dashboard", 
        simulationResults,
        dashboardInsight: insight
      } : null);
    } catch (err) {
      console.error("Simulation error:", err);
      setCurrentInterviewingName(null);
      setCurrentInterviewActivity(null);
      setError(err instanceof Error ? err.message : "Simulation failed");
      setStage("selection");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden flex">
      <Sidebar 
        currentStage={stage}
        currentView={view}
        currentUrl={currentUrl} 
        onNewAnalysis={handleNewAnalysis} 
        onOpenDocuments={handleOpenDocuments} 
        onReturnToWorkspace={handleReturnToWorkspace}
        onCancelAnalysis={handleCancelAnalysis}
      />

      <div className="flex-1 ml-64 relative min-h-screen overflow-y-auto">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none fixed" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none fixed" />

        <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-20 pb-24 relative z-10">
          
          {/* Documents View */}
          {view === "documents" && (
            <DocumentLibrary reports={savedReports} onOpenReport={handleOpenReport} />
          )}

          {/* Analysis Workspace */}
          {view === "workspace" && (
            <>
          {/* Hero Section */}
          {currentStageLevel === 0 && (
            <div className="text-center max-w-4xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/20 border border-blue-800/50 text-blue-400 text-xs font-semibold tracking-wide uppercase mb-8 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Intelligence Engine v2.0
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.15]">
                Know who converts, <br className="hidden sm:block" />
                who drops, and <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">why.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                Simulate how different user types experience your website and uncover where trust breaks, friction appears, and conversions are lost.
              </p>
            </div>
          )}

              {/* Input Form (visible on idle or tracing) */}
              {currentStageLevel >= 0 && (
                <div className={`transition-all duration-500 ${currentStageLevel >= 1 ? 'mb-16' : 'mt-8'}`}>
                  {showGeminiConfig ? (
                    <div className="w-full max-w-2xl mx-auto mb-4 bg-[#030712] border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-xs uppercase tracking-widest text-slate-500">Gemini API Key (Required)</div>
                          <div className="text-sm text-slate-300">Configure your own key before running analysis.</div>
                        </div>
                        {isGeminiKeySaved ? (
                          <span className="text-xs px-2 py-1 bg-emerald-900/40 text-emerald-400 rounded-full">Saved</span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-amber-900/40 text-amber-400 rounded-full">Not Configured</span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type={showGeminiKey ? "text" : "password"}
                          value={geminiApiKey}
                          onChange={(e) => {
                            setGeminiApiKey(e.target.value);
                            setIsGeminiKeySaved(false);
                          }}
                          placeholder="AIza..."
                          className="flex-1 h-11 px-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey((prev) => !prev)}
                          className="h-11 px-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                          {showGeminiKey ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem("marketMirror_geminiApiKey", geminiApiKey.trim());
                            setIsGeminiKeySaved(true);
                            setShowGeminiConfig(false);
                            setError(null);
                          }}
                          disabled={!geminiApiKey.trim()}
                          className="h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold transition-colors"
                        >
                          Save Key
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">Saved locally in your browser via localStorage for this workspace.</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl mx-auto mb-4 bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="text-sm text-emerald-300">Gemini API key configured. You can start using MarketMirror now.</div>
                      <button
                        type="button"
                        onClick={() => setShowGeminiConfig(true)}
                        className="text-xs px-2 py-1 rounded border border-emerald-600/40 text-emerald-300 hover:bg-emerald-800/20"
                      >
                        Change Key
                      </button>
                    </div>
                  )}
                  <UrlInputForm
                    onSubmit={handleAudit}
                    isLoading={stage === "tracing"}
                    isBlocked={!isGeminiKeySaved || !geminiApiKey.trim()}
                    blockedMessage="Configure and save your Gemini API key first."
                  />
                </div>
              )}

              {/* Stage 1: Pipeline Trace */}
              {currentStageLevel >= 1 && (
                <div ref={traceRef} className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${currentStageLevel > 1 ? 'mb-16 pb-16 border-b border-slate-800/50' : 'mt-12'}`}>
                  <TerminalTrace events={traceEvents} />
                </div>
              )}

              {/* Stage 2: Selection */}
              {currentStageLevel >= 2 && currentSession?.pipelineData && (
                <div ref={selectionRef} className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${currentStageLevel > 2 ? 'mb-16 pb-16 border-b border-slate-800/50' : 'mt-12'}`}>
                  <SyntheticUserSelection 
                    users={currentSession.pipelineData.personas} 
                    onStartSimulation={handleStartSimulation} 
                  />
                </div>
              )}

              {/* Stage 3: Live Simulation */}
              {currentStageLevel >= 3 && currentSession?.pipelineData && (
                <div ref={simulationRef} className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${currentStageLevel > 3 ? 'mb-16 pb-16 border-b border-slate-800/50' : 'mt-12'}`}>
                  <SimulationResults 
                    users={currentSession.pipelineData.personas.filter((persona) =>
                      currentSession.selectedUserIds.includes(persona.id)
                    )} 
                    results={currentSession.simulationResults || []} 
                    currentInterviewingName={stage === "simulating" ? currentInterviewingName : null}
                    currentInterviewActivity={stage === "simulating" ? currentInterviewActivity : null}
                    onContinue={() => {
                      // Ensure dashboardInsight is set when moving to dashboard
                      if (!currentSession?.dashboardInsight && currentSession?.simulationResults) {
                        const insight = buildInsightFromResults(currentSession.simulationResults);
                        setCurrentSession((s) => s ? { ...s, dashboardInsight: insight } : null);
                      }
                      setStage("dashboard");
                    }}
                  />
                </div>
              )}

              {/* Stage 4: Aggregate Insight Dashboard */}
              {currentStageLevel >= 4 && currentSession?.pipelineData && (
                <div ref={dashboardRef} className="mt-12 mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SimplifiedInsightDashboard 
                    insight={currentSession?.dashboardInsight || buildInsightFromResults(currentSession?.simulationResults || [])} 
                    pipelineData={currentSession.pipelineData} 
                    simulationResults={currentSession.simulationResults || []}
                    onSaveReport={handleSaveReport}
                  />
                </div>
              )}
              
              {error && stage === "idle" && (
                <ErrorState error={error} onRetry={() => setError(null)} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

