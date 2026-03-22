"use client";

import { SavedReport } from "@/types/pipeline";
import { formatDistanceToNow } from "date-fns";
import { FolderOpen, ExternalLink, Calendar, Search } from "lucide-react";

interface DocumentLibraryProps {
  reports: SavedReport[];
  onOpenReport: (report: SavedReport) => void;
}

export function DocumentLibrary({ reports, onOpenReport }: DocumentLibraryProps) {
  if (reports.length === 0) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-700">
        <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-semibold text-slate-400 mb-2">No Saved Reports</h2>
        <p className="text-sm">Your saved analysis sessions will appear here.</p>
      </div>
    );
  }

  // Sort by newest first
  const sortedReports = [...reports].sort((a, b) => 
    new Date(b.date_analyzed).getTime() - new Date(a.date_analyzed).getTime()
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Document Library</h2>
          <p className="text-slate-400 mt-1">Access your previous synthetic user analysis reports.</p>
        </div>
        <div className="bg-[#030712] border border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2 text-slate-400">
          <Search className="w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search reports..." 
            className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-slate-600 focus:text-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedReports.map(report => (
          <div 
            key={report.id}
            onClick={() => onOpenReport(report)}
            className="group bg-[#030712] border border-slate-800 rounded-xl overflow-hidden shadow-lg cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] transition-all flex flex-col"
          >
            {report.preview_screenshot ? (
              <div className="h-32 w-full bg-slate-900 border-b border-slate-800 overflow-hidden relative">
                <img src={report.preview_screenshot} alt={report.site_title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] to-transparent opacity-80" />
              </div>
            ) : (
              <div className="h-24 w-full bg-slate-900/50 border-b border-slate-800 flex items-center justify-center text-slate-700">
                <Search className="w-8 h-8 opacity-50" />
              </div>
            )}
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {report.website_category}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDistanceToNow(new Date(report.date_analyzed), { addSuffix: true })}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-200 mb-1 line-clamp-1">{report.site_title}</h3>
              <div className="text-xs font-mono text-slate-500 mb-4 truncate">{report.url.replace(/^https?:\/\//, '')}</div>
              
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                {report.summary}
              </p>

              {report.key_insight && (
                <div className="mb-4 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-semibold mb-1">Key Insight</div>
                  <div className="text-sm text-slate-300 italic border-l-2 border-emerald-500/30 pl-2">
                    "{report.key_insight}"
                  </div>
                </div>
              )}
              
              <div className={`pt-4 border-t border-slate-800/60 flex items-center justify-between text-blue-500 group-hover:text-blue-400 transition-colors ${!report.key_insight ? 'mt-auto' : ''}`}>
                <span className="text-sm font-semibold">Open Workspace</span>
                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
