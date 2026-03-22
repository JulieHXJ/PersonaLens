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
import { TraceEvent, AppStage, AppView, SavedReport, AnalysisSession } from "@/types/pipeline";
import { mockTraceEvents, mockPipelineResult, mockSimulationResults, mockDashboardInsight, mockSavedReports } from "@/lib/pipeline-mock";

export default function Home() {
  const [stage, setStage] = useState<AppStage>("idle");
  const [view, setView] = useState<AppView>("workspace");
  const [currentUrl, setCurrentUrl] = useState<string>("");
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
    } else {
      // Preload with mock documents if empty to show the feature off
      setSavedReports(mockSavedReports);
      localStorage.setItem("marketMirror_reports", JSON.stringify(mockSavedReports));
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
    if (stage !== "dashboard" || !currentUrl) return;

    const insight = currentSession?.dashboardInsight || mockDashboardInsight;
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
      website_category: currentSession?.pipelineData?.website_type || mockPipelineResult.website_type,
      summary: `Simulated ${selectedUserIds.length} synthetic users to identify friction points and buy signals.`,
      key_insight: keyInsight,
      preview_screenshot: traceEvents.find(e => e.type === "screenshots")?.data?.screenshots?.[0]?.url,
      session_data: {
        url: currentUrl,
        stage: "dashboard",
        traceEvents,
        pipelineData: currentSession?.pipelineData || mockPipelineResult,
        selectedUserIds,
        simulationResults: currentSession?.simulationResults || mockSimulationResults,
        dashboardInsight: insight
      }
    };

    saveReportsToStorage([newReport, ...savedReports]);
    alert("Report saved to Document Library!");
  };

  const handleAudit = async (url: string) => {
    handleNewAnalysis();
    setStage("tracing");
    setCurrentUrl(url);

    // Dynamically customize the mock events with the user's input URL
    const customizedMockEvents = mockTraceEvents.map(event => {
      const newEvent = JSON.parse(JSON.stringify(event)) as TraceEvent;
      if (newEvent.type === "fetch" && newEvent.data) {
        newEvent.data.url = url;
        newEvent.data.pageTitle = new URL(url).hostname;
      }
      if (newEvent.type === "classification" && newEvent.data?.classifiedPages) {
        newEvent.data.classifiedPages[0].url = url;
        newEvent.data.classifiedPages[1].url = `${url}/about`;
        newEvent.data.classifiedPages[2].url = `${url}/login`;
      }
      return newEvent;
    });

    let eventIndex = 0;
    analysisIntervalRef.current = setInterval(() => {
      if (eventIndex < customizedMockEvents.length) {
        setTraceEvents((prev) => {
          const next = [...prev, customizedMockEvents[eventIndex]];
          // Save trace state into current session
          setCurrentSession(s => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _s = s;
          return {
            url, stage: "tracing", traceEvents: next, pipelineData: null, selectedUserIds: [], simulationResults: [], dashboardInsight: null
          };
        });
          return next;
        });
        eventIndex++;
      } else {
        if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      }
    }, 1200);

    try {
      analysisTimeoutRef.current = setTimeout(() => {
        if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
        setStage("selection");
        setCurrentSession(s => s ? { ...s, stage: "selection", pipelineData: mockPipelineResult } : null);
      }, (customizedMockEvents.length * 1200) + 500);
    } catch {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      setError("Failed to fetch or analyze the website.");
      setStage("idle");
    }
  };

  const handleStartSimulation = (selectedIds: string[]) => {
    setSelectedUserIds(selectedIds);
    setStage("simulating");
    setCurrentSession(s => s ? { ...s, stage: "simulating", selectedUserIds: selectedIds } : null);
    
    simulationTimeoutRef.current = setTimeout(() => {
      setStage("dashboard");
      setCurrentSession(s => s ? { 
        ...s, 
        stage: "dashboard", 
        simulationResults: mockSimulationResults, 
        dashboardInsight: mockDashboardInsight 
      } : null);
    }, 5000);
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
                    results={currentSession.simulationResults?.length > 0 ? currentSession.simulationResults : mockSimulationResults} 
                    onContinue={() => setStage("dashboard")}
                  />
                </div>
              )}

              {/* Stage 4: Aggregate Insight Dashboard */}
              {currentStageLevel >= 4 && currentSession?.pipelineData && currentSession?.dashboardInsight && (
                <div ref={dashboardRef} className="mt-12 mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SimplifiedInsightDashboard 
                    insight={currentSession.dashboardInsight} 
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

