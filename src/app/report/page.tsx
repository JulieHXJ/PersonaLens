"use client";

import { useState, useEffect } from "react";
import { Persona, WebsiteAnalysis } from "@/lib/types";

interface ExtractedData {
  buySignal: number;
  willingnessToPay: {
    tooCheap: number;
    bargain: number;
    gettingExpensive: number;
    tooExpensive: number;
  };
  topObjections: string[];
  featureRanking: string[];
  discoveryChannel: string;
  currentSolution: string;
  killerQuote: string;
  surpriseInsight: string;
  overallSentiment: string;
}

interface StoredResult {
  personaId: string;
  personaName: string;
  status: string;
  extractedData?: ExtractedData;
}

interface RunData {
  analysis: WebsiteAnalysis;
  personas: Persona[];
  results: StoredResult[];
}

export default function ReportPage() {
  const [data, setData] = useState<RunData | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("nightshift-results");
    if (raw) {
      setData(JSON.parse(raw));
    }
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-4">
            analytics
          </span>
          <h2 className="text-xl font-bold text-on-surface mb-2">
            No Report Available
          </h2>
          <p className="text-sm text-on-surface-variant">
            Run an analysis first — configure a website, select personas, and
            click &quot;Run Overnight&quot;.
          </p>
        </div>
      </div>
    );
  }

  const { analysis, personas, results } = data;
  const completed = results.filter(
    (r) => r.status === "completed" && r.extractedData
  );
  const extracted = completed.map((r) => r.extractedData!);

  // --- Aggregations ---
  const avgBuySignal =
    extracted.length > 0
      ? extracted.reduce((sum, e) => sum + (e.buySignal || 0), 0) /
        extracted.length
      : 0;
  const demandPercent = Math.round(avgBuySignal * 100);
  const strongSignals = extracted.filter((e) => e.buySignal >= 0.6).length;

  // WTP aggregation
  const avgWTP =
    extracted.length > 0
      ? {
          tooCheap: Math.round(
            extracted.reduce(
              (s, e) => s + (e.willingnessToPay?.tooCheap || 0),
              0
            ) / extracted.length
          ),
          bargain: Math.round(
            extracted.reduce(
              (s, e) => s + (e.willingnessToPay?.bargain || 0),
              0
            ) / extracted.length
          ),
          gettingExpensive: Math.round(
            extracted.reduce(
              (s, e) => s + (e.willingnessToPay?.gettingExpensive || 0),
              0
            ) / extracted.length
          ),
          tooExpensive: Math.round(
            extracted.reduce(
              (s, e) => s + (e.willingnessToPay?.tooExpensive || 0),
              0
            ) / extracted.length
          ),
        }
      : null;

  // Objection aggregation
  const objectionCounts: Record<string, number> = {};
  extracted.forEach((e) => {
    (e.topObjections || []).forEach((obj) => {
      const key = obj.toLowerCase().trim();
      objectionCounts[key] = (objectionCounts[key] || 0) + 1;
    });
  });
  const topObjections = Object.entries(objectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Feature ranking aggregation
  const featureCounts: Record<string, number> = {};
  extracted.forEach((e) => {
    (e.featureRanking || []).forEach((feat, idx) => {
      const key = feat.trim();
      featureCounts[key] = (featureCounts[key] || 0) + (3 - Math.min(idx, 2)); // weight by rank
    });
  });
  const topFeatures = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxFeatureScore = topFeatures[0]?.[1] || 1;

  // Discovery channels
  const channelCounts: Record<string, number> = {};
  extracted.forEach((e) => {
    if (e.discoveryChannel) {
      const key = e.discoveryChannel.trim();
      channelCounts[key] = (channelCounts[key] || 0) + 1;
    }
  });
  const topChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Killer quotes (buy signals with high buy signal)
  const buyQuotes = completed
    .filter((r) => r.extractedData && r.extractedData.buySignal >= 0.6)
    .map((r) => ({
      quote: r.extractedData!.killerQuote,
      persona: r.personaName,
    }))
    .filter((q) => q.quote)
    .slice(0, 3);

  // Surprise insights
  const surprises = completed
    .map((r) => ({
      text: r.extractedData?.surpriseInsight,
      persona: r.personaName,
    }))
    .filter((s) => s.text)
    .slice(0, 3);

  // Sentiment breakdown
  const sentiments: Record<string, number> = {};
  extracted.forEach((e) => {
    if (e.overallSentiment) {
      const key = e.overallSentiment.trim();
      sentiments[key] = (sentiments[key] || 0) + 1;
    }
  });

  // Current solutions
  const solutionCounts: Record<string, number> = {};
  extracted.forEach((e) => {
    if (e.currentSolution) {
      const key = e.currentSolution.trim();
      solutionCounts[key] = (solutionCounts[key] || 0) + 1;
    }
  });
  const topSolutions = Object.entries(solutionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const signalLabel =
    demandPercent >= 70
      ? "Strong Signal"
      : demandPercent >= 40
        ? "Moderate Signal"
        : "Weak Signal";

  return (
    <>
      {/* Header with Demand Gauge */}
      <section className="p-6 lg:p-10 bg-surface-container-low border-b border-outline-variant/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_#a7d641]" />
                <span className="text-xs font-mono text-tertiary tracking-widest uppercase">
                  Analysis Complete
                </span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tighter text-on-surface mb-2">
                Morning Report
              </h2>
              <p className="text-sm text-on-surface-variant mb-4">
                {analysis.productName} — {analysis.industry}
              </p>
              <div className="flex gap-4">
                <div className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-mono text-on-surface-variant border border-outline-variant/20 uppercase">
                  {completed.length}/{results.length} Interviews
                </div>
                <div className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-mono text-on-surface-variant border border-outline-variant/20 uppercase">
                  {personas.length} Personas
                </div>
              </div>
            </div>

            {/* Gauge */}
            <div className="relative w-64 h-40 flex items-end justify-center overflow-hidden">
              <div className="absolute inset-0 rounded-t-full border-[16px] border-surface-container-highest" />
              <div
                className="absolute inset-0 rounded-t-full border-[16px] border-primary shadow-[0_0_40px_rgba(164,201,255,0.2)]"
                style={{
                  clipPath: `polygon(0 100%, 0 0, ${demandPercent}% 0, ${demandPercent}% 100%)`,
                }}
              />
              <div className="z-10 text-center pb-2">
                <div className="text-5xl font-black text-on-surface tracking-tighter">
                  {demandPercent}%
                </div>
                <div className="text-[10px] font-mono text-primary font-bold tracking-[0.2em] uppercase">
                  {signalLabel}
                </div>
              </div>
            </div>

            {/* Intent card */}
            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/10 w-full md:w-72">
              <div className="text-[10px] font-mono text-on-surface-variant uppercase mb-2">
                Buy Signals
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-on-surface tracking-tighter">
                  {strongSignals}
                </span>
                <span className="text-lg text-on-surface-variant">
                  / {completed.length}
                </span>
              </div>
              <div className="mt-4 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${completed.length > 0 ? (strongSignals / completed.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-[10px] text-on-surface-variant">
                Personas with buy signal &ge; 0.6
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-12">
        {/* Willingness to Pay */}
        {avgWTP && (
          <section>
            <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
              Willingness to Pay (Avg. Van Westendorp)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Too Cheap", value: avgWTP.tooCheap, color: "text-on-surface-variant" },
                { label: "Bargain", value: avgWTP.bargain, color: "text-tertiary" },
                { label: "Getting Expensive", value: avgWTP.gettingExpensive, color: "text-primary" },
                { label: "Too Expensive", value: avgWTP.tooExpensive, color: "text-error" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 text-center"
                >
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase mb-2">
                    {item.label}
                  </p>
                  <p className={`text-3xl font-bold ${item.color}`}>
                    €{item.value}
                  </p>
                </div>
              ))}
            </div>
            {avgWTP.bargain > 0 && avgWTP.gettingExpensive > 0 && (
              <div className="mt-4 bg-tertiary-container text-on-tertiary-container px-4 py-2 rounded-lg inline-block text-sm font-bold">
                Sweet Spot: €{avgWTP.bargain} — €{avgWTP.gettingExpensive}
              </div>
            )}
          </section>
        )}

        {/* Killer Quotes */}
        {buyQuotes.length > 0 && (
          <section>
            <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
              Killer Quotes (High Buy Signal)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {buyQuotes.map((q, i) => (
                <div
                  key={i}
                  className="bg-surface-container p-6 rounded-xl border-l-4 border-tertiary"
                >
                  <p className="text-sm italic text-on-surface leading-relaxed mb-4">
                    &ldquo;{q.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-[10px]">
                        person
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      {q.persona}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Surprise Insights */}
        {surprises.length > 0 && (
          <section>
            <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
              Surprise Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {surprises.map((s, i) => (
                <div
                  key={i}
                  className="bg-surface-container p-6 rounded-xl border-l-4 border-primary"
                >
                  <p className="text-sm text-on-surface leading-relaxed mb-4">
                    {s.text}
                  </p>
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    {s.persona}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Objections */}
        {topObjections.length > 0 && (
          <section>
            <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
              Top Objections
            </h3>
            <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-5">
              {topObjections.map(([objection, count]) => {
                const pct = Math.round(
                  (count / completed.length) * 100
                );
                return (
                  <div key={objection}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-on-surface capitalize">
                        {objection}
                      </span>
                      <span className="text-[10px] font-mono text-on-surface-variant">
                        {count}x ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 60 ? "bg-error" : pct >= 30 ? "bg-tertiary-container" : "bg-outline-variant"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Feature Priorities */}
        {topFeatures.length > 0 && (
          <section>
            <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
              Feature Priorities (weighted by ranking)
            </h3>
            <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-4">
              {topFeatures.map(([feature, score]) => (
                <div key={feature} className="flex items-center gap-4">
                  <span className="w-48 text-xs font-mono text-on-surface-variant truncate shrink-0">
                    {feature}
                  </span>
                  <div className="flex-1 h-6 bg-surface-container-high rounded-r relative">
                    <div
                      className="h-full bg-primary rounded-r"
                      style={{
                        width: `${(score / maxFeatureScore) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-on-surface-variant w-8 text-right">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Discovery Channels + Current Solutions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {topChannels.length > 0 && (
            <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
              <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
                Discovery Channels
              </h3>
              <div className="space-y-3">
                {topChannels.map(([channel, count]) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between bg-surface-container p-3 rounded-lg"
                  >
                    <span className="text-xs text-on-surface">{channel}</span>
                    <span className="text-[10px] font-mono text-primary">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {topSolutions.length > 0 && (
            <section className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
              <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
                Current Solutions (Competitors)
              </h3>
              <div className="space-y-3">
                {topSolutions.map(([solution, count]) => (
                  <div
                    key={solution}
                    className="flex items-center justify-between bg-surface-container p-3 rounded-lg"
                  >
                    <span className="text-xs text-on-surface">{solution}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sentiment Overview */}
        {Object.keys(sentiments).length > 0 && (
          <section>
            <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
              Overall Sentiment
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(sentiments)
                .sort((a, b) => b[1] - a[1])
                .map(([sentiment, count]) => (
                  <div
                    key={sentiment}
                    className="bg-surface-container px-4 py-2 rounded-lg border border-outline-variant/10"
                  >
                    <span className="text-xs text-on-surface">{sentiment}</span>
                    <span className="ml-2 text-[10px] font-mono text-primary">
                      {count}x
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Persona Breakdown */}
        <section>
          <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
            Per-Persona Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map((r) => {
              const persona = personas.find((p) => p.id === r.personaId);
              const e = r.extractedData!;
              return (
                <div
                  key={r.personaId}
                  className="bg-surface-container p-5 rounded-xl border border-outline-variant/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-lg">
                        {persona?.icon || "person"}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">
                        {r.personaName}
                      </h4>
                      <p className="text-[10px] font-mono text-on-surface-variant">
                        {persona?.role}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Buy Signal</span>
                      <span
                        className={`font-mono font-bold ${e.buySignal >= 0.6 ? "text-tertiary" : e.buySignal >= 0.3 ? "text-primary" : "text-error"}`}
                      >
                        {(e.buySignal * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Sentiment</span>
                      <span className="font-mono text-on-surface">
                        {e.overallSentiment}
                      </span>
                    </div>
                    {e.killerQuote && (
                      <p className="text-on-surface-variant italic text-[11px] mt-2 border-t border-outline-variant/10 pt-2">
                        &ldquo;{e.killerQuote}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
