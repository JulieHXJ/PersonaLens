"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Persona, WebsiteAnalysis } from "@/lib/types";

interface InterviewResult {
  personaId: string;
  personaName: string;
  status: "pending" | "running" | "completed" | "failed";
  transcript?: { role: string; content: string }[];
  extractedData?: Record<string, unknown>;
  error?: string;
}

interface LogEntry {
  time: string;
  text: string;
  type: "info" | "active" | "complete" | "error";
}

interface PastRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  config: { analysis: WebsiteAnalysis; personas: Persona[] };
  hasResults: boolean;
}

interface ActiveRunState {
  runId: string;
  explorationId: string;
  analysis: WebsiteAnalysis;
  personas: Persona[];
  results: InterviewResult[];
  logs: LogEntry[];
  running: boolean;
  startTime: number;
}

function getActiveRun(): ActiveRunState | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __nightshift_active_run?: ActiveRunState }).__nightshift_active_run;
}

function setActiveRun(run: ActiveRunState | undefined) {
  if (typeof window === "undefined") return;
  (window as unknown as { __nightshift_active_run?: ActiveRunState }).__nightshift_active_run = run;
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span></div>}>
      <ProgressContent />
    </Suspense>
  );
}

function ProgressContent() {
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startedAt, setStartedAt] = useState<string>("");
  const [elapsed, setElapsed] = useState("00:00:00");
  const [running, setRunning] = useState(false);
  const [pastRuns, setPastRuns] = useState<PastRun[]>([]);
  const [viewingPast, setViewingPast] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const runIdRef = useRef<string>("");
  const explorationIdRef = useRef<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const diff = Date.now() - startTimeRef.current;
      const s = Math.floor(diff / 1000) % 60;
      const m = Math.floor(diff / 60000) % 60;
      const h = Math.floor(diff / 3600000);
      setElapsed(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const addLog = useCallback((type: LogEntry["type"], text: string) => {
    const now = new Date();
    const time = now.toTimeString().split(" ")[0];
    const entry = { time, text, type };
    setLogs((prev) => [...prev, entry]);
    const active = getActiveRun();
    if (active) active.logs = [...active.logs, entry];
  }, []);

  // Load past run from URL param, reconnect to active run, or start new
  useEffect(() => {
    const runId = searchParams.get("run");
    if (runId) {
      loadPastRun(runId);
      return;
    }

    // Reconnect to an active run that survived client-side navigation
    const active = getActiveRun();
    if (active?.running) {
      setAnalysis(active.analysis);
      setPersonas(active.personas);
      setResults([...active.results]);
      setLogs([...active.logs]);
      setRunning(true);
      startTimeRef.current = active.startTime;
      runIdRef.current = active.runId;
      explorationIdRef.current = active.explorationId;

      const interval = setInterval(() => {
        const a = getActiveRun();
        if (!a) { clearInterval(interval); return; }
        setResults([...a.results]);
        setLogs([...a.logs]);
        if (!a.running) {
          setRunning(false);
          clearInterval(interval);
        }
      }, 2000);
      return () => clearInterval(interval);
    }

    // Show results from a just-completed background run
    if (active && !active.running) {
      setAnalysis(active.analysis);
      setPersonas(active.personas);
      setResults([...active.results]);
      setLogs([...active.logs]);
      runIdRef.current = active.runId;
      setActiveRun(undefined);
      return;
    }

    // Load from localStorage (new run)
    const raw = localStorage.getItem("nightshift-run");
    if (!raw) {
      loadPastRunsList();
      return;
    }

    const run = JSON.parse(raw);
    setAnalysis(run.analysis);
    setPersonas(run.personas);
    setStartedAt(run.startedAt);
    explorationIdRef.current = run.explorationId || "";

    const initial: InterviewResult[] = run.personas.map((p: Persona) => ({
      personaId: p.id,
      personaName: p.name,
      status: "pending" as const,
    }));
    setResults(initial);

    startTimeRef.current = Date.now();
    setRunning(true);

    addLog("info", "System boot successful. Loading run configuration...");
    addLog("info", `Target: ${run.analysis.productName} (${run.analysis.url})`);
    addLog("info", `${run.personas.length} personas loaded. Starting interviews...`);

    // Create run in DB, then start interviews
    createDbRun(run.explorationId, run.analysis, run.personas).then((dbRunId) => {
      runIdRef.current = dbRunId;
      setActiveRun({
        runId: dbRunId,
        explorationId: run.explorationId || "",
        analysis: run.analysis,
        personas: run.personas,
        results: initial,
        logs: [],
        running: true,
        startTime: startTimeRef.current,
      });
      runInterviews(run.analysis, run.personas, initial, dbRunId);
    });

    localStorage.removeItem("nightshift-run");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDbRun(explorationId: string, analysis: WebsiteAnalysis, personas: Persona[]): Promise<string> {
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", explorationId, config: { analysis, personas } }),
      });
      const data = await res.json();
      return data.id || "";
    } catch {
      return "";
    }
  }

  async function loadPastRun(runId: string) {
    try {
      const res = await fetch(`/api/runs?id=${runId}`);
      const data = await res.json();
      if (data.config) {
        setAnalysis(data.config.analysis);
        setPersonas(data.config.personas);
        setViewingPast(true);
        if (data.results) {
          setResults(data.results);
          addLog("info", `Loaded past run from ${new Date(data.startedAt).toLocaleString()}`);
          addLog("info", `Target: ${data.config.analysis.productName}`);
          const completed = data.results.filter((r: InterviewResult) => r.status === "completed").length;
          addLog("complete", `${completed}/${data.results.length} interviews completed`);
        }
      }
    } catch {
      addLog("error", "Failed to load past run");
    }
  }

  async function loadPastRunsList() {
    try {
      const res = await fetch("/api/runs?limit=10");
      const data = await res.json();
      setPastRuns(data.runs || []);
    } catch { /* ignore */ }
  }

  async function runSingleInterview(
    persona: Persona,
    analysis: WebsiteAnalysis,
    device: string,
    index: number,
    total: number
  ): Promise<{ transcript?: { role: string; content: string }[]; extractedData?: Record<string, unknown> }> {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona, analysis, device }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: { transcript?: { role: string; content: string }[]; extractedData?: Record<string, unknown> } | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ") && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === "activity" && data.message) {
              addLog("info", `  ${data.message}`);
            } else if (eventType === "complete") {
              result = { transcript: data.transcript, extractedData: data.extractedData };
            } else if (eventType === "error") {
              throw new Error(data.error || "Interview failed");
            }
          } catch (e) {
            if (e instanceof SyntaxError) { /* skip malformed JSON */ }
            else throw e;
          }
          eventType = "";
        }
      }
    }

    if (!result) throw new Error("No result received");
    return result;
  }

  async function runInterviews(
    analysis: WebsiteAnalysis,
    personas: Persona[],
    initial: InterviewResult[],
    dbRunId: string
  ) {
    const updated = [...initial];

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];

      updated[i] = { ...updated[i], status: "running" };
      setResults([...updated]);
      const ar1 = getActiveRun();
      if (ar1) ar1.results = [...updated];
      const device = i % 3 === 2 ? "mobile" : "desktop";
      addLog(
        "active",
        `Interview ${i + 1}/${personas.length}: ${persona.name}, ${persona.age}, ${persona.role} — STARTED (${device})`
      );

      try {
        const data = await runSingleInterview(persona, analysis, device, i, personas.length);
        updated[i] = {
          ...updated[i],
          status: "completed",
          transcript: data.transcript,
          extractedData: data.extractedData,
        };
        setResults([...updated]);
        const ar2 = getActiveRun();
        if (ar2) ar2.results = [...updated];
        addLog(
          "complete",
          `Interview ${i + 1}/${personas.length}: ${persona.name} — COMPLETED (buy signal: ${data.extractedData?.buySignal ?? "N/A"})`
        );
      } catch (err) {
        updated[i] = {
          ...updated[i],
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        };
        setResults([...updated]);
        const ar3 = getActiveRun();
        if (ar3) ar3.results = [...updated];
        addLog(
          "error",
          `Interview ${i + 1}/${personas.length}: ${persona.name} — FAILED: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    addLog("info", "All interviews completed.");

    if (dbRunId) {
      try {
        await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", runId: dbRunId, results: updated }),
        });
        addLog("complete", "Results saved to database.");
      } catch {
        addLog("error", "Failed to save results to database.");
      }
    }

    localStorage.setItem(
      "nightshift-results",
      JSON.stringify({ analysis, personas, results: updated, runId: dbRunId })
    );

    addLog("complete", "REPORT READY. Navigate to Morning Report to view results.");
    setRunning(false);
    const arFinal = getActiveRun();
    if (arFinal) arFinal.running = false;
  }

  const completedCount = results.filter((r) => r.status === "completed").length;
  const totalCount = results.length || personas.length || 1;
  const progress = Math.round((completedCount / totalCount) * 100);
  const runningInterview = results.find((r) => r.status === "running");

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 py-6 border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-primary uppercase tracking-tighter">
                {viewingPast
                  ? `Past Run: ${analysis?.productName || ""}`
                  : analysis
                    ? `Run: ${analysis.productName}`
                    : "No active run"}
              </span>
              <span className="text-xs font-mono text-on-surface-variant uppercase">
                {progress}% COMPLETE
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-tertiary shadow-[0_0_10px_rgba(164,201,255,0.4)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            {!viewingPast && (
              <div className="text-right">
                <div className="text-on-surface-variant opacity-60">ELAPSED</div>
                <div className="text-on-surface font-bold">{elapsed}</div>
              </div>
            )}
            <div className="w-px h-8 bg-outline-variant/20" />
            <div className="text-right">
              <div className="text-on-surface-variant opacity-60">INTERVIEWS</div>
              <div className="text-tertiary font-bold">
                {completedCount}/{totalCount}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Metrics Grid */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-low p-4 rounded border border-outline-variant/5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mb-1">
                Total Personas
              </p>
              <p className="text-2xl font-mono text-primary">{totalCount}</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded border border-outline-variant/5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mb-1">
                Completed
              </p>
              <p className="text-2xl font-mono text-on-surface">{completedCount}</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded border border-outline-variant/5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mb-1">
                Running
              </p>
              <p className="text-2xl font-mono text-tertiary">
                {results.filter((r) => r.status === "running").length}
              </p>
            </div>
            <div className="bg-surface-container-low p-4 rounded border border-outline-variant/5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mb-1">
                Failed
              </p>
              <p className="text-2xl font-mono text-error">
                {results.filter((r) => r.status === "failed").length}
              </p>
            </div>
          </div>
        )}

        {/* Terminal Log */}
        {logs.length > 0 && (
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/10 overflow-hidden shadow-2xl">
            <div className="bg-surface-container-high px-4 py-2 flex items-center justify-between border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary/40" />
                </div>
                <span className="ml-4 text-[11px] font-mono text-on-surface-variant/60 uppercase">
                  nightshift://interviews
                </span>
              </div>
              <span
                className={`text-[11px] font-mono flex items-center gap-1 ${running ? "text-tertiary" : "text-on-surface-variant"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${running ? "bg-tertiary animate-pulse" : "bg-on-surface-variant"}`}
                />
                {running ? "LIVE" : viewingPast ? "HISTORY" : "DONE"}
              </span>
            </div>

            <div
              ref={logRef}
              className="p-6 font-mono text-[13px] leading-relaxed h-[500px] overflow-y-auto terminal-scroll bg-[#0E0E11]"
            >
              <div className="space-y-1">
                {logs.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-on-surface-variant/40 shrink-0">
                      [{entry.time}]
                    </span>
                    <span
                      className={
                        entry.type === "active"
                          ? "text-primary font-semibold"
                          : entry.type === "complete"
                            ? "text-tertiary"
                            : entry.type === "error"
                              ? "text-error"
                              : "text-on-surface-variant opacity-60"
                      }
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
                {running && (
                  <div className="flex items-center gap-2 animate-pulse mt-2">
                    <span className="w-2 h-4 bg-primary inline-block" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Interview */}
        {runningInterview && (
          <div className="bg-surface-container-low border border-outline-variant/15 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-tertiary">
              <span className="material-symbols-outlined text-sm animate-spin">
                progress_activity
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold">
                Currently Interviewing
              </span>
            </div>
            <h4 className="text-xl font-headline font-bold text-on-surface">
              {runningInterview.personaName}
            </h4>
          </div>
        )}

        {/* No run — show past runs */}
        {!analysis && !running && (
          <div className="space-y-8">
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">
                bedtime
              </span>
              <p className="text-lg font-mono">No active run</p>
              <p className="text-sm mt-2">
                Go to Configure Run to analyze a website and start interviews.
              </p>
            </div>

            {pastRuns.length > 0 && (
              <div>
                <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
                  Past Runs
                </label>
                <div className="space-y-2">
                  {pastRuns.map((run) => (
                    <button
                      key={run.id}
                      onClick={() => router.push(`/progress?run=${run.id}`)}
                      className="w-full text-left bg-surface-container-low rounded-xl p-4 border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center gap-4 cursor-pointer"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        run.status === "completed" ? "bg-tertiary" : run.status === "failed" ? "bg-error" : "bg-amber-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-on-surface">
                          {run.config?.analysis?.productName || "Unknown"}
                        </span>
                        <span className="text-[11px] font-mono text-on-surface-variant/60 ml-2">
                          {run.config?.personas?.length || 0} personas
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-on-surface-variant/60">
                        {new Date(run.startedAt).toLocaleString()}
                      </div>
                      <span className="material-symbols-outlined text-primary/40 text-lg">
                        chevron_right
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Report button for past/completed runs */}
        {!running && results.length > 0 && completedCount > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (runIdRef.current) {
                  router.push(`/report?run=${runIdRef.current}`);
                } else {
                  router.push("/report");
                }
              }}
              className="px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">summarize</span>
              View Morning Report
            </button>
          </div>
        )}
      </section>
    </>
  );
}
