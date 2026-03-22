"use client";

import { AppStage, AppView } from "@/types/pipeline";
import { Plus, FolderOpen, LayoutDashboard, Search, Settings, ChevronRight } from "lucide-react";

interface SidebarProps {
  currentStage: AppStage;
  currentView?: AppView;
  currentUrl?: string;
  onNewAnalysis: () => void;
  onOpenDocuments: () => void;
  onReturnToWorkspace?: () => void;
  onCancelAnalysis?: () => void;
}

export function Sidebar({ currentStage, currentView = "workspace", currentUrl, onNewAnalysis, onOpenDocuments, onReturnToWorkspace, onCancelAnalysis }: SidebarProps) {
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
        
        <div 
          onClick={() => {
            if (currentUrl && onReturnToWorkspace) {
              onReturnToWorkspace();
            }
          }}
          className={`rounded-lg p-3 space-y-3 transition-all ${
            currentUrl 
              ? currentView === "workspace"
                ? "bg-blue-900/10 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.05)] cursor-default"
                : "bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 cursor-pointer group"
              : "bg-slate-900/30 border border-slate-800/50 cursor-default"
          }`}
        >
          {currentUrl ? (
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-slate-500 uppercase">Target URL</div>
                {currentView === "documents" && (
                  <div className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    Resume <ChevronRight className="w-3 h-3 ml-0.5" />
                  </div>
                )}
              </div>
              <div className="text-sm font-mono text-slate-300 truncate mt-1" title={currentUrl}>
                {currentUrl.replace(/^https?:\/\//, '')}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">No active session</div>
          )}

          <div className={`pt-2 border-t ${currentUrl && currentView === "workspace" ? "border-blue-500/20" : "border-slate-800/50"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Status</span>
              <span className={`text-xs font-semibold ${currentUrl && currentView === "workspace" ? "text-blue-400" : "text-slate-500"}`}>{getStageLabel()}</span>
            </div>
            {currentUrl && onCancelAnalysis && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelAnalysis();
                }}
                className="w-full mt-3 py-1.5 px-2 text-[10px] font-semibold border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors uppercase tracking-widest"
              >
                {currentStage === "dashboard" ? "Clear Workspace" : "Cancel Analysis"}
              </button>
            )}
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${currentView === "documents" ? "bg-blue-900/40 border border-blue-800/50 text-blue-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
        >
          <FolderOpen className="w-4 h-4" />
          Document Library
        </button>
      </div>

    </div>
  );
}
