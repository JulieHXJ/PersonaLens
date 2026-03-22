"use client";

import { useState } from "react";
import { CandidatePersona } from "@/types/pipeline";
import { CheckCircle2 } from "lucide-react";

interface SyntheticUserSelectionProps {
  users: CandidatePersona[];
  onStartSimulation: (selectedIds: string[]) => void;
}

export function SyntheticUserSelection({ users, onStartSimulation }: SyntheticUserSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(users.map(u => u.id)));

  const toggleUser = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleStart = () => {
    if (selectedIds.size > 0) {
      onStartSimulation(Array.from(selectedIds));
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Select Synthetic Users</h2>
        <p className="text-slate-400">
          We generated {users.length} candidate personas based on the extracted evidence from your site.
          Select the users you want to simulate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {users.map((user) => {
          const isSelected = selectedIds.has(user.id);
          return (
            <div 
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className={`
                relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-lg
                ${isSelected 
                  ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.15)]' 
                  : 'bg-[#030712] border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={user.avatar_url} 
                    alt={user.identity_label} 
                    className="w-10 h-10 rounded-full bg-slate-800 object-cover"
                  />
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{user.identity_label}</div>
                    <div className="text-xs text-blue-400">{user.archetype}</div>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                {user.short_bio}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center pt-8 border-t border-slate-800/50 mt-8">
        <div className="text-sm text-slate-400 mb-4">
          <span className="text-blue-400 font-bold">{selectedIds.size}</span> users selected for testing
        </div>
        <button
          onClick={handleStart}
          disabled={selectedIds.size === 0}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          Start Synthetic Testing
        </button>
      </div>
    </div>
  );
}
