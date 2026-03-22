"use client";

import { AppStage } from "@/types/pipeline";
import { Plus, FolderOpen, LayoutDashboard, Search, Settings } from "lucide-react";

interface SidebarProps {
  currentStage: AppStage;
  currentUrl?: string;
  onNewAnalysis: () => void;
  onOpenDocuments: () => void;
}

export function Sidebar({ currentStage, currentUrl, onNewAnalysis, onOpenDocuments }: SidebarProps) {
  const getStageLabel = () => {
    switch (currentStage) {
      case "idle": return "Ready";
      case "tracing": return "Reconnaissance";
      case "selection": return "User Selection";
      case "simulating": return "Live Simulation";
      case "dashboard": return "Insight Dashboard";
      case "documents": return "Document Library";
      default: return "";
    }
  };

  return (
    <div className="w-64 h-screen fixed left-0 top-0 bg-[#020617] border-r border-slate-800/60 flex flex-col z-50">
      
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600/10 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-500 font-bold shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22H22L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
            MarketMirror
          </span>
        </div>
      </div>

      {/* Workspace Status */}
      <div className="p-4 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
          Current Workspace
        </div>
        
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 space-y-3">
          {currentUrl ? (
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Target URL</div>
              <div className="text-sm font-mono text-slate-300 truncate" title={currentUrl}>
                {currentUrl.replace(/^https?:\/\//, '')}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">No active session</div>
          )}

          <div className="pt-2 border-t border-slate-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Status</span>
              <span className="text-xs text-blue-400 font-semibold">{getStageLabel()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="p-4 space-y-2 border-t border-slate-800/60">
        <button 
          onClick={onNewAnalysis}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${currentStage === "idle" ? "bg-blue-600 text-white shadow-lg" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </button>

        <button 
          onClick={onOpenDocuments}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${currentStage === "documents" ? "bg-blue-900/40 border border-blue-800/50 text-blue-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
        >
          <FolderOpen className="w-4 h-4" />
          Document Library
        </button>
      </div>

    </div>
  );
}
