"use client";

import { CandidatePersona, SimulationResult } from "@/types/pipeline";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface SimulationResultsProps {
  users: CandidatePersona[];
  results: SimulationResult[];
  onContinue: () => void;
}

export function SimulationResults({ users, results, onContinue }: SimulationResultsProps) {
  const progressPercent = users.length > 0 ? (results.length / users.length) * 100 : 0;
  const isComplete = results.length === users.length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Live Simulation Output</h2>
        <p className="text-slate-400 mb-4">
          Watching synthetic users interact with your landing page.
        </p>
        
        {/* Progress Section */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">
              Progress: <span className="text-blue-400">{results.length} of {users.length} personas</span>
            </span>
            {isComplete && <span className="text-xs px-2 py-1 bg-emerald-900/40 text-emerald-400 rounded-full">Complete</span>}
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {results.map((result) => {
          const user = users.find(u => u.id === result.persona_id);
          if (!user) return null;

          return (
            <div key={result.persona_id} className="bg-[#030712] border border-slate-800 rounded-xl p-6 flex flex-col gap-4 shadow-lg">
              {/* Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-800/60">
                <img 
                  src={user.avatar_url} 
                  alt={user.identity_label} 
                  className="w-12 h-12 rounded-full bg-slate-800 object-cover"
                />
                <div>
                  <div className="font-bold text-slate-200">{user.identity_label}</div>
                  <div className="text-xs text-blue-400">{user.archetype}</div>
                </div>
              </div>

              {/* Browsing Summary */}
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Browsing Impression</div>
                <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-slate-700 pl-3">
                  "{result.browsing_summary}"
                </p>
              </div>

              {/* Tasks Matrix */}
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Task Evaluation</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {result.tasks.map((task, i) => (
                    <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-md p-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">{task.task_name}</span>
                      {task.status === "Success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {task.status === "Partial" && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                      {task.status === "Failed" && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Friction */}
              {result.main_friction.length > 0 && (
                <div className="mt-auto pt-4 bg-red-950/10 rounded-lg p-3 border border-red-900/20">
                  <div className="text-xs uppercase tracking-wider text-red-400 font-semibold mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Main Friction
                  </div>
                  <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside pl-1">
                    {result.main_friction.map((friction, i) => (
                      <li key={i}>{friction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-8">
        <button
          type="button"
          onClick={onContinue}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all cursor-pointer active:scale-95"
        >
          View Aggregate Insights
        </button>
      </div>
    </div>
  );
}
