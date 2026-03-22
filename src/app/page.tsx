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

export default function Home() {
  const [stage, setStage] = useState<AppStage>("idle");
  const [view, setView] = useState<AppView>("workspace");
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentAnalysis, setCurrentAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
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

  const toTraceEvent = (event: Record<string, unknown>, index: number): TraceEvent => {
    const eventType = typeof event.type === "string" ? event.type : "unknown";
    const status: TraceEvent["status"] =
      eventType === "error"
        ? "error"
        : eventType === "done" || eventType === "result"
          ? "done"
          : "running";

    const traceEvent: TraceEvent = {
      id: `${typeof event.timestamp === "string" ? event.timestamp : Date.now()}-${index}`,
      message: typeof event.message === "string" ? event.message : "Processing",
      status,
      details: eventType,
    };

    if (eventType === "screenshot") {
      const screenshotUrl = typeof event.screenshot === "string" ? event.screenshot : "";
      if (screenshotUrl) {
        traceEvent.type = "screenshots";
        traceEvent.data = {
          screenshots: [{ device: "Desktop", url: screenshotUrl }],
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
      traceEvent.message = `Generated ${personaCount} customer personas from exploration. Select personas to start synthetic user simulation.`;
      traceEvent.type = "generation";
      traceEvent.data = {
        generatedCount: personaCount,
      };
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
        segment: r.persona_id,
        score: r.tasks.length === 0 ? 50 : Math.round((r.tasks.filter((t) => t.status === "Success").length / r.tasks.length) * 100),
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
    const stored = localStorage.getItem("marketMirror_reports");
    if (stored) {
      try {
        setSavedReports(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved reports", e);
      }
    }
  }, []);

  const saveReportsToStorage = (reports: SavedReport[]) => {
    setSavedReports(reports);
    localStorage.setItem("marketMirror_reports", JSON.stringify(reports));
  };

  const handleNewAnalysis = () => {
    setView("workspace");
    setStage("idle");
    setCurrentUrl("");
    setCurrentAnalysis(null);
    setError(null);
    setTraceEvents([]);
    setSelectedUserIds([]);
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

    saveReportsToStorage([newReport, ...savedReports]);
    alert("Report saved to Document Library!");
  };

  const handleAudit = async (url: string) => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
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
        body: JSON.stringify({ url, maxSteps: 25 }),
      });

      if (!res.ok) {
        throw new Error("Exploration failed to start");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream available");

      const decoder = new TextDecoder();
      let buffer = "";
      let hasResultEvent = false;

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
              const event = toTraceEvent(rawEvent, Math.random());
              
              setTraceEvents((prev) => {
                const completedPrev = prev.map((item) =>
                  item.status === "running" ? { ...item, status: "done" as const } : item
                );
                const next = [...completedPrev, event];
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
      setError(err instanceof Error ? err.message : "Failed to fetch or analyze the website.");
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
          
          const res = await fetch("/api/interview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              persona,
              analysis,
              device: "desktop"
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
              } else if (eventType === "error") {
                console.error(`Interview API error for ${persona.name}:`, eventData);
              }
            }
          }

          if (result) {
            const mappedResult: SimulationResult = {
              persona_id: String(result.personaId || persona.id),
              browsing_summary: String(result.extractedData?.buySignal || "Session completed"),
              tasks: [
                { task_name: "Navigate key pages", status: "Success" },
                { task_name: "Evaluate value proposition", status: "Success" },
                { task_name: "Assess conversion readiness", status: "Partial" },
              ],
              main_friction: Array.isArray(result.extractedData?.topObjections)
                ? result.extractedData.topObjections
                : [],
            };

            simulationResults.push(mappedResult);
            console.log(`Added simulation result for ${persona.name}, total: ${simulationResults.length}`);
            // Update UI with completed results progressively
            setCurrentSession(s => s ? { 
              ...s, 
              simulationResults: [...simulationResults]
            } : null);
          } else {
            console.warn(`No result extracted for ${persona.name}`);
          }
        } catch (err) {
          console.error(`Interview failed for ${persona.name}:`, err);
          // Continue with next persona even if one fails
        }
      }

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
                  <UrlInputForm onSubmit={handleAudit} isLoading={stage === "tracing"} />
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
                    users={currentSession.pipelineData.personas} 
                    results={currentSession.simulationResults || []} 
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

