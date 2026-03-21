"use client";

import { useState, useEffect, useRef } from "react";
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

export default function ProgressPage() {
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startedAt, setStartedAt] = useState<string>("");
  const [elapsed, setElapsed] = useState("00:00:00");
  const [running, setRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Timer
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

  // Load run config and start interviews
  useEffect(() => {
    const raw = localStorage.getItem("nightshift-run");
    if (!raw) return;

    const run = JSON.parse(raw);
    setAnalysis(run.analysis);
    setPersonas(run.personas);
    setStartedAt(run.startedAt);

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

    runInterviews(run.analysis, run.personas, initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLog(type: LogEntry["type"], text: string) {
    const now = new Date();
    const time = now.toTimeString().split(" ")[0];
    setLogs((prev) => [...prev, { time, text, type }]);
  }

  async function runInterviews(
    analysis: WebsiteAnalysis,
    personas: Persona[],
    initial: InterviewResult[]
  ) {
    const updated = [...initial];

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];

      // Mark as running
      updated[i] = { ...updated[i], status: "running" };
      setResults([...updated]);
      addLog(
        "active",
        `Interview ${i + 1}/${personas.length}: ${persona.name}, ${persona.age}, ${persona.role} — STARTED`
      );

      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persona, analysis }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        updated[i] = {
          ...updated[i],
          status: "completed",
          transcript: data.transcript,
          extractedData: data.extractedData,
        };
        setResults([...updated]);
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
        addLog(
          "error",
          `Interview ${i + 1}/${personas.length}: ${persona.name} — FAILED: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    addLog("info", "All interviews completed.");
    addLog("info", "Generating report...");

    // Store results for the report page
    localStorage.setItem(
      "nightshift-results",
      JSON.stringify({ analysis, personas, results: updated })
    );

    addLog("complete", "REPORT READY. Navigate to Morning Report to view results.");
    setRunning(false);
  }

  const completedCount = results.filter((r) => r.status === "completed").length;
  const totalCount = results.length || personas.length || 1;
  const progress = Math.round((completedCount / totalCount) * 100);
  const runningInterview = results.find((r) => r.status === "running");

  return (
    <>
      {/* Sticky Progress Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 py-6 border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-primary uppercase tracking-tighter">
                {analysis
                  ? `Run: ${analysis.productName}`
                  : "No active run — configure one first"}
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
            <div className="text-right">
              <div className="text-on-surface-variant opacity-60">ELAPSED</div>
              <div className="text-on-surface font-bold">{elapsed}</div>
            </div>
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

        {/* Terminal Log */}
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
              {running ? "LIVE" : "DONE"}
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

        {/* No run state */}
        {!analysis && (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-4 block opacity-30">
              bedtime
            </span>
            <p className="text-lg font-mono">No active run</p>
            <p className="text-sm mt-2">
              Go to Configure Run to analyze a website and start interviews.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
