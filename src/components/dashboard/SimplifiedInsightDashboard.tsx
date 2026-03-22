"use client";

import { DashboardInsight, PipelineResult } from "@/types/pipeline";
import { AlertTriangle, Lightbulb, TrendingUp, Users, Save } from "lucide-react";

interface SimplifiedInsightDashboardProps {
  insight: DashboardInsight;
  pipelineData: PipelineResult;
  onSaveReport?: () => void;
}

export function SimplifiedInsightDashboard({ insight, pipelineData, onSaveReport }: SimplifiedInsightDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-[#030712] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="text-sm font-semibold text-blue-500 uppercase tracking-widest mb-1">
            Site Classification: {pipelineData.website_type}
          </div>
          <h2 className="text-3xl font-bold text-slate-100">Post-Simulation Intelligence</h2>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Based on the simulated sessions of your selected personas, here are the aggregated friction points and strongest value propositions.
          </p>
        </div>
        {onSaveReport && (
          <button 
            onClick={onSaveReport}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg transition-all shrink-0"
          >
            <Save className="w-4 h-4" />
            Save Report
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Buy Signals */}
        <div className="bg-[#030712] border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200">Strongest Buy Signals</h3>
          </div>
          <ul className="space-y-4 flex-1">
            {insight.buy_signals.map((signal, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <span className="text-emerald-500 font-bold">"</span>
                {signal}
                <span className="text-emerald-500 font-bold">"</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Objections */}
        <div className="bg-[#030712] border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200">Main Objections</h3>
          </div>
          <ul className="space-y-4 flex-1">
            {insight.objections.map((objection, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                {objection}
              </li>
            ))}
          </ul>
        </div>

        {/* Feature Priority & Segment Scores */}
        <div className="space-y-6 flex flex-col h-full">
          
          <div className="bg-[#030712] border border-slate-800 rounded-xl p-6 shadow-lg flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-200">Feature Requests</h3>
            </div>
            <div className="space-y-2">
              {insight.feature_priority.map((feature, i) => (
                <div key={i} className="text-xs text-slate-300 bg-slate-900 px-3 py-2 rounded border border-slate-800 flex items-center justify-between">
                  <span>{feature}</span>
                  <span className="text-slate-600 text-[10px]">P{i+1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#030712] border border-slate-800 rounded-xl p-6 shadow-lg flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-200">Segment Resonance</h3>
            </div>
            <div className="space-y-3">
              {insight.segment_scores.map((score, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{score.segment}</span>
                    <span className="text-slate-400">{score.score}/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${score.score > 70 ? 'bg-emerald-500' : score.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${score.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
