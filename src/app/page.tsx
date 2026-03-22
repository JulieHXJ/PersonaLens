"use client";

import { useState, useEffect } from "react";
import { UrlInputForm } from "@/components/forms/UrlInputForm";
import { TerminalTrace } from "@/components/ui/TerminalTrace";
import { SyntheticUserSelection } from "@/components/dashboard/SyntheticUserSelection";
import { SimulationResults } from "@/components/dashboard/SimulationResults";
import { SimplifiedInsightDashboard } from "@/components/dashboard/SimplifiedInsightDashboard";
import { DocumentLibrary } from "@/components/dashboard/DocumentLibrary";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorState } from "@/components/ui/ErrorState";
import { TraceEvent, AppStage, SavedReport, AnalysisSession } from "@/types/pipeline";
import { mockTraceEvents, mockPipelineResult, mockSimulationResults, mockDashboardInsight, mockSavedReports } from "@/lib/pipeline-mock";

export default function Home() {
  const [stage, setStage] = useState<AppStage>("idle");
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Persistent Storage State
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Current session data to allow replacing workspace state
  const [currentSession, setCurrentSession] = useState<AnalysisSession | null>(null);

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
    setStage("idle");
    setCurrentUrl("");
    setError(null);
    setTraceEvents([]);
    setSelectedUserIds([]);
    setCurrentSession(null);
  };

  const handleOpenDocuments = () => {
    setStage("documents");
  };

  const handleOpenReport = (report: SavedReport) => {
    const s = report.session_data;
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
    const interval = setInterval(() => {
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
        clearInterval(interval);
      }
    }, 1200);

    try {
      setTimeout(() => {
        clearInterval(interval);
        setStage("selection");
        setCurrentSession(s => s ? { ...s, stage: "selection", pipelineData: mockPipelineResult } : null);
      }, (customizedMockEvents.length * 1200) + 500);
    } catch {
      clearInterval(interval);
      setError("Failed to fetch or analyze the website.");
      setStage("idle");
    }
  };

  const handleStartSimulation = (selectedIds: string[]) => {
    setSelectedUserIds(selectedIds);
    setStage("simulating");
    setCurrentSession(s => s ? { ...s, stage: "simulating", selectedUserIds: selectedIds } : null);
    
    setTimeout(() => {
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
        currentUrl={currentUrl} 
        onNewAnalysis={handleNewAnalysis} 
        onOpenDocuments={handleOpenDocuments} 
      />

      <div className="flex-1 ml-64 relative min-h-screen overflow-y-auto">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none fixed" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none fixed" />

        <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-20 pb-24 relative z-10">
          
          {/* Documents View */}
          {stage === "documents" && (
            <DocumentLibrary reports={savedReports} onOpenReport={handleOpenReport} />
          )}

          {/* Analysis Workspace */}
          {stage !== "documents" && (
            <>
          {/* Hero Section */}
          {stage === "idle" && (
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
              {(stage === "idle" || stage === "tracing") && (
                <div className={`transition-all duration-500 ${stage === "tracing" ? 'mb-12' : 'mt-8'}`}>
                  <UrlInputForm onSubmit={handleAudit} isLoading={stage === "tracing"} />
                </div>
              )}

              {/* Stage 1: Pipeline Trace */}
              {stage === "tracing" && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <TerminalTrace events={traceEvents} />
                </div>
              )}

              {/* Stage 2: Selection */}
              {stage === "selection" && currentSession?.pipelineData && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SyntheticUserSelection 
                    users={currentSession.pipelineData.personas} 
                    onStartSimulation={handleStartSimulation} 
                  />
                </div>
              )}

              {/* Stage 3: Live Simulation */}
              {stage === "simulating" && currentSession?.pipelineData && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <SimulationResults 
                    users={currentSession.pipelineData.personas} 
                    results={mockSimulationResults} 
                    onContinue={() => setStage("dashboard")}
                  />
                </div>
              )}

              {/* Stage 4: Aggregate Insight Dashboard */}
              {stage === "dashboard" && currentSession?.pipelineData && currentSession?.dashboardInsight && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

