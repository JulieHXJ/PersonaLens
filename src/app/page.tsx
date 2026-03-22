"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Persona, WebsiteAnalysis } from "@/lib/types";
import { MOCK_ANALYSIS, MOCK_PERSONAS } from "@/lib/mock-personas";

type Step = "url" | "exploring" | "review";

const SCAN_TIERS = [
  {
    id: "quick",
    name: "Quick Scan",
    steps: 10,
    price: "Free",
    priceNote: "Basic exploration",
    icon: "bolt",
    desc: "Fast overview — 5–8 pages",
    features: ["Full-page screenshots", "Core page analysis", "~5 min"],
  },
  {
    id: "standard",
    name: "Standard",
    steps: 25,
    price: "$5",
    priceNote: "per scan",
    icon: "explore",
    popular: true,
    desc: "Thorough exploration — 12–18 pages",
    features: ["Full-page screenshots", "Deep analysis", "~12 min"],
  },
  {
    id: "deep",
    name: "Deep Dive",
    steps: 40,
    price: "$15",
    priceNote: "per scan",
    icon: "query_stats",
    desc: "Comprehensive audit — 20–30+ pages",
    features: ["Full-page screenshots", "Maximum coverage", "~20 min"],
  },
] as const;

interface AgentEvent {
  type: "action" | "observation" | "screenshot" | "thinking" | "done" | "error" | "result";
  message: string;
  data?: { analysis: WebsiteAnalysis; personas: Persona[]; explorationId?: string };
  screenshot?: string;
  timestamp: string;
}

interface HistoryItem {
  id: string;
  url: string;
  status: string;
  productName: string | null;
  eventCount: number;
  screenshotCount: number;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

export default function ConfigureRunPage() {
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [explorationId, setExplorationId] = useState<string>("");
  const [expandScreenshots, setExpandScreenshots] = useState(false);
  const [scanTier, setScanTier] = useState("standard");
  const logRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const screenshotSrc = (src: string) =>
    src.startsWith("/api/") || src.startsWith("http") ? src : `data:image/jpeg;base64,${src}`;

  useEffect(() => {
    fetch("/api/history?limit=10")
      .then((r) => r.json())
      .then((data) => {
        const explorations = data.explorations || [];
        setHistory(explorations);

        // Check for any running exploration and poll it
        const running = explorations.find((e: HistoryItem) => e.status === "running");
        if (running) {
          setStep("exploring");
          setUrl(running.url);
          setExplorationId(running.id);
          pollExploration(running.id);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll the log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const startExploration = async () => {
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

    setError("");
    setStep("exploring");
    setEvents([]);
    setScreenshots([]);

    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, maxSteps: SCAN_TIERS.find((t) => t.id === scanTier)?.steps || 25 }),
      });

      if (!res.ok) {
        throw new Error("Exploration failed to start");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));
              setEvents((prev) => [...prev, event]);

              if (event.screenshot) {
                setScreenshots((prev) => [...prev, event.screenshot!]);
              }

              if (event.type === "result" && event.data) {
                setAnalysis(event.data.analysis);
                setPersonas(event.data.personas);
                if (event.data.explorationId) setExplorationId(event.data.explorationId);
                setStep("review");
              }

              if (event.type === "error") {
                throw new Error(event.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (err) {
      console.error("Exploration failed, using mock data:", err);
      setAnalysis(MOCK_ANALYSIS);
      setPersonas(MOCK_PERSONAS);
      setStep("review");
    }
  };

  const togglePersona = (id: string) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectedCount = personas.filter((p) => p.selected).length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") startExploration();
  };

  const pollExploration = async (id: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/history?id=${id}`);
        const data = await res.json();

        // Update screenshots from DB
        if (data.screenshots?.length) {
          setScreenshots(data.screenshots.map((s: { url: string }) => s.url));
        }

        if (data.status === "completed" && data.analysis && data.personas) {
          setAnalysis(data.analysis);
          setPersonas(data.personas);
          setExplorationId(id);
          setStep("review");
          return; // done polling
        }

        if (data.status === "failed") {
          setError(data.errorMessage || "Exploration failed");
          setStep("url");
          return;
        }

        // Still running — poll again
        setTimeout(poll, 3000);
      } catch {
        setTimeout(poll, 5000);
      }
    };
    poll();
  };

  const loadFromHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/history?id=${id}`);
      const data = await res.json();
      if (data.analysis && data.personas) {
        setAnalysis(data.analysis);
        setPersonas(data.personas);
        setUrl(data.url);
        setExplorationId(id);
        if (data.screenshots?.length) {
          setScreenshots(data.screenshots.map((s: { url: string }) => s.url));
        }
        setStep("review");
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startRun = () => {
    if (!analysis || selectedCount === 0) return;
    const selected = personas.filter((p) => p.selected);
    localStorage.setItem(
      "nightshift-run",
      JSON.stringify({ analysis, personas: selected, startedAt: new Date().toISOString(), explorationId })
    );
    router.push("/progress");
  };

  return (
    <>
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-px w-8 bg-primary/30" />
          <span className="text-xs font-mono text-primary uppercase tracking-[0.2em]">
            Deployment Config
          </span>
        </div>
        <h1 className="text-4xl font-bold font-headline tracking-tighter text-on-surface mb-4">
          {step === "url" && "Analyze a Website"}
          {step === "exploring" && "Exploring Website..."}
          {step === "review" && "Review Personas"}
        </h1>
        <p className="text-on-surface-variant max-w-2xl leading-relaxed">
          {step === "url" &&
            "Paste a website URL. Our AI agent will autonomously browse and explore the site — taking screenshots, clicking through pages, and building a deep understanding to generate customer personas."}
          {step === "exploring" &&
            "The agent is browsing the website autonomously — exploring pages, analyzing content, and understanding the product..."}
          {step === "review" &&
            "Exploration complete. Review the generated personas and select which ones to include in the overnight evaluation."}
        </p>
      </header>

      <section className="max-w-5xl mx-auto px-6 space-y-10 pb-40">
        {/* Step 1: URL Input */}
        {step === "url" && (
          <div>
            <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
              01. Website URL
            </label>
            <div className="bg-surface-container-low rounded-xl p-1 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <div className="flex items-center bg-surface-container-lowest rounded-lg border-b border-outline-variant/30 focus-within:border-primary">
                <span className="material-symbols-outlined text-outline-variant pl-6 pr-2">
                  language
                </span>
                <input
                  type="url"
                  className="flex-1 bg-transparent border-0 focus:ring-0 text-on-surface placeholder:text-outline-variant/50 py-6 pr-6 font-mono text-lg"
                  placeholder="https://www.example.com"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <button
                  onClick={startExploration}
                  className="mr-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-lg text-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">
                    explore
                  </span>
                  Explore
                </button>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-xs text-error font-mono">{error}</p>
            )}

            {/* Scan Depth Selector */}
            <div className="mt-10">
              <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
                02. Scan Depth
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SCAN_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setScanTier(tier.id)}
                    className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                      scanTier === tier.id
                        ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(164,201,255,0.08)]"
                        : "border-outline-variant/15 bg-surface-container-low hover:border-outline-variant/30"
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2.5 right-4 px-3 py-0.5 bg-primary text-on-primary text-[9px] font-bold font-mono uppercase rounded-full tracking-wider">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`material-symbols-outlined text-lg ${scanTier === tier.id ? "text-primary" : "text-on-surface-variant"}`}>
                        {tier.icon}
                      </span>
                      <h3 className="text-sm font-bold text-on-surface">{tier.name}</h3>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mb-3">{tier.desc}</p>
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-2xl font-black text-primary font-mono">{tier.price}</span>
                      <span className="text-[10px] text-on-surface-variant/60 font-mono">{tier.priceNote}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                          <span className="material-symbols-outlined text-tertiary text-xs">check</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {scanTier === tier.id && (
                      <div className="absolute top-4 right-4">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="mt-10">
              <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
                How it works
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: "travel_explore",
                    title: "Agent Browses",
                    desc: "AI agent launches a real browser and autonomously navigates your website — clicking links, scrolling, exploring pages.",
                  },
                  {
                    icon: "screenshot_monitor",
                    title: "Full-Page Screenshots",
                    desc: "The agent captures full-length screenshots of every page, giving you a complete view of each page's design and content.",
                  },
                  {
                    icon: "group_add",
                    title: "Persona Generation",
                    desc: "Based on deep understanding of the site, the agent generates realistic customer personas for overnight evaluation.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10"
                  >
                    <span className="material-symbols-outlined text-primary text-2xl mb-3">
                      {item.icon}
                    </span>
                    <h3 className="text-sm font-bold text-on-surface mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Explorations */}
            {history.length > 0 && (
              <div className="mt-12">
                <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
                  Past Explorations
                </label>
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => item.status === "completed" && loadFromHistory(item.id)}
                      disabled={item.status !== "completed" || loadingHistory}
                      className={`w-full text-left bg-surface-container-low rounded-xl p-4 border transition-all flex items-center gap-4 ${
                        item.status === "completed"
                          ? "border-outline-variant/10 hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
                          : "border-outline-variant/10 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        item.status === "completed" ? "bg-tertiary" : item.status === "failed" ? "bg-error" : "bg-amber-500 animate-pulse"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-on-surface truncate">
                            {item.productName || new URL(item.url).hostname}
                          </span>
                          <span className="text-[10px] font-mono text-on-surface-variant shrink-0">
                            {item.durationMs ? `${(item.durationMs / 1000).toFixed(0)}s` : ""}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-on-surface-variant/60 truncate block">
                          {item.url}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-mono text-on-surface-variant/60">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] font-mono text-on-surface-variant/40">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      {item.status === "completed" && (
                        <span className="material-symbols-outlined text-primary/40 text-lg">
                          chevron_right
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Live Exploration */}
        {step === "exploring" && (
          <div className="space-y-6">
            {/* Screenshot gallery */}
            {screenshots.length > 0 && (
              <div>
                <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
                  Screenshots captured ({screenshots.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {screenshots.map((src, i) => (
                    <div
                      key={i}
                      className="aspect-video bg-surface-container rounded-lg border border-outline-variant/10 overflow-hidden"
                    >
                      <img
                        src={screenshotSrc(src)}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent log */}
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/10 overflow-hidden shadow-2xl">
              <div className="bg-surface-container-high px-4 py-2 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-error/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-tertiary/40" />
                  </div>
                  <span className="ml-4 text-[11px] font-mono text-on-surface-variant/60 uppercase">
                    nightshift-agent://explore
                  </span>
                </div>
                <span className="text-[11px] font-mono text-tertiary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  EXPLORING
                </span>
              </div>
              <div
                ref={logRef}
                className="p-6 font-mono text-[13px] leading-relaxed h-[400px] overflow-y-auto terminal-scroll bg-[#0E0E11]"
              >
                <div className="space-y-2">
                  {events.map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-on-surface-variant/40 text-[11px] shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`${
                          event.type === "action"
                            ? "text-primary"
                            : event.type === "screenshot"
                              ? "text-tertiary"
                              : event.type === "thinking"
                                ? "text-on-surface-variant/60"
                                : event.type === "error"
                                  ? "text-error"
                                  : "text-on-surface-variant"
                        }`}
                      >
                        {event.type === "action" && "→ "}
                        {event.type === "screenshot" && "📸 "}
                        {event.type === "thinking" && "💭 "}
                        {event.type === "observation" && "👁 "}
                        {event.type === "error" && "⚠ "}
                        {event.message}
                      </span>
                    </div>
                  ))}
                  {step === "exploring" && (
                    <div className="flex items-center gap-2 animate-pulse">
                      <span className="w-2 h-4 bg-primary inline-block" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && analysis && (
          <>
            {/* Website Analysis Card */}
            <div>
              <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
                01. Website Analysis
              </label>
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-primary">
                        language
                      </span>
                      <h3 className="text-lg font-bold text-on-surface">
                        {analysis.productName}
                      </h3>
                      <span className="px-2 py-0.5 bg-surface-container-highest text-[10px] font-mono rounded text-on-surface-variant uppercase">
                        {analysis.industry}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                      {analysis.productDescription}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
                      <span className="material-symbols-outlined text-sm">
                        group
                      </span>
                      <span className="font-mono">
                        {analysis.targetAudience}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keyFeatures.map((f) => (
                        <span
                          key={f}
                          className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStep("url");
                      setAnalysis(null);
                      setPersonas([]);
                      setEvents([]);
                      setScreenshots([]);
                    }}
                    className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      edit
                    </span>
                    Change URL
                  </button>
                </div>

                {/* Screenshots from exploration */}
                {screenshots.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-mono text-on-surface-variant/60 uppercase">
                        Pages explored ({screenshots.length})
                      </p>
                      <button
                        onClick={() => setExpandScreenshots(!expandScreenshots)}
                        className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">
                          {expandScreenshots ? "grid_view" : "view_cozy"}
                        </span>
                        {expandScreenshots ? "Collapse" : "View All"}
                      </button>
                    </div>
                    {expandScreenshots ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {screenshots.map((src, i) => (
                          <div
                            key={i}
                            className="aspect-video bg-surface-container rounded-lg border border-outline-variant/10 overflow-hidden"
                          >
                            <img
                              src={screenshotSrc(src)}
                              alt={`Page ${i + 1}`}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {screenshots.slice(0, 8).map((src, i) => (
                          <div
                            key={i}
                            className="w-36 h-20 shrink-0 bg-surface-container rounded border border-outline-variant/10 overflow-hidden"
                          >
                            <img
                              src={screenshotSrc(src)}
                              alt={`Page ${i + 1}`}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        ))}
                        {screenshots.length > 8 && (
                          <button
                            onClick={() => setExpandScreenshots(true)}
                            className="w-36 h-20 shrink-0 bg-surface-container rounded border border-outline-variant/10 flex items-center justify-center text-xs font-mono text-on-surface-variant hover:text-primary transition-colors"
                          >
                            +{screenshots.length - 8} more
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[10px] font-mono text-on-surface-variant/50 mt-4">
                  {analysis.url}
                </div>
              </div>
            </div>

            {/* Persona Cards */}
            <div>
              <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
                02. Recommended Personas ({selectedCount} selected)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => togglePersona(persona.id)}
                    className={`group relative bg-surface-container-low p-5 rounded-xl border cursor-pointer transition-all ${
                      persona.selected
                        ? "border-primary/30 bg-primary/5"
                        : "border-outline-variant/10 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="absolute top-4 right-4">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          persona.selected
                            ? "bg-primary border-primary"
                            : "border-outline-variant"
                        }`}
                      >
                        {persona.selected && (
                          <span className="material-symbols-outlined text-on-primary text-[14px]">
                            check
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-xl">
                          {persona.icon || "person"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-baseline gap-2 mb-1">
                          <h4 className="text-sm font-bold text-on-surface">
                            {persona.name}
                          </h4>
                          <span className="text-[10px] font-mono text-on-surface-variant">
                            {persona.age}
                          </span>
                        </div>
                        <p className="text-xs text-primary font-mono mb-2">
                          {persona.role}
                        </p>
                        <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                          {persona.background}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 bg-surface-container-highest text-[10px] font-mono rounded">
                            {persona.segment}
                          </span>
                          <span className="px-2 py-0.5 bg-surface-container-highest text-[10px] font-mono rounded">
                            Tech: {persona.techSavviness}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Floating Footer */}
      {step === "review" && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-6 bg-gradient-to-t from-surface via-surface to-transparent z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-6 p-4 bg-surface-container-highest/80 backdrop-blur-xl border border-outline-variant/10 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-4 ml-2">
              <div className="flex -space-x-2">
                {personas
                  .filter((p) => p.selected)
                  .slice(0, 3)
                  .map((p, i) => (
                    <div
                      key={p.id}
                      className="w-8 h-8 rounded-full border-2 border-surface-container-highest bg-primary/20 flex items-center justify-center"
                      style={{ zIndex: 3 - i }}
                    >
                      <span className="material-symbols-outlined text-primary text-sm">
                        {p.icon || "person"}
                      </span>
                    </div>
                  ))}
                {selectedCount > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest bg-surface-container-high flex items-center justify-center text-[10px] font-mono text-on-surface-variant">
                    +{selectedCount - 3}
                  </div>
                )}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-on-surface">
                  {selectedCount} Persona{selectedCount !== 1 ? "s" : ""}{" "}
                  Selected
                </div>
                <div className="text-[10px] text-tertiary font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  READY FOR EVALUATION
                </div>
              </div>
            </div>
            <button
              onClick={startRun}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold rounded-xl shadow-[0_0_20px_rgba(164,201,255,0.3)] hover:shadow-[0_0_30px_rgba(164,201,255,0.4)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Run Overnight</span>
              <span className="material-symbols-filled text-sm">bedtime</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
