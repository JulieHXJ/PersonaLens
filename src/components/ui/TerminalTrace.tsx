"use client";

import { useEffect, useRef, useState } from "react";
import { TraceEvent } from "@/types/pipeline";
import { CheckCircle2, ChevronRight, CircleDashed, Loader2, XCircle, ChevronDown, ImageIcon, Link, Search, FileJson, Layout, Map } from "lucide-react";

interface TerminalTraceProps {
  events: TraceEvent[];
}

export function TerminalTrace({ events = [] }: TerminalTraceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Ensure we only work with a valid array and filter out any undefined/null items
  const validEvents = (events || []).filter(Boolean);
  const lastEvent = validEvents[validEvents.length - 1];

  // Auto-expand events when they finish running
  useEffect(() => {
    validEvents.forEach(event => {
      if (event.status === "done" && !expandedEvents.has(event.id)) {
        setExpandedEvents(prev => new Set(prev).add(event.id));
      }
    });
  }, [validEvents]);

  // Add auto-scrolling to the bottom of the trace window
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [validEvents, expandedEvents]);

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderEventData = (event: TraceEvent) => {
    if (!event.data) return null;

    switch (event.type) {
      case "fetch":
        return (
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">URL</span>
              <span className="text-blue-400 font-mono">{event.data.url}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Status</span>
              <span className="text-emerald-400 font-mono">{event.data.statusCode} OK</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Page Title</span>
              <span className="text-slate-300">{event.data.pageTitle}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">HTML Size</span>
              <span className="text-slate-300 font-mono">{event.data.htmlSize}</span>
            </div>
          </div>
        );

      case "links":
        return (
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase tracking-wider block mb-2 text-[10px]">Detected Pages</span>
            <div className="flex flex-wrap gap-2">
              {event.data.discoveredLinks?.map((link, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-[#030712] border border-slate-700 rounded text-xs text-slate-300 font-mono">
                  <Link className="w-3 h-3 text-blue-500" />
                  {link}
                </div>
              ))}
            </div>
          </div>
        );

      case "screenshots":
        return (
          <div className="grid grid-cols-3 gap-4 pt-2">
            {event.data.screenshots?.map((shot, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> {shot.device}
                </div>
                <div className="relative group rounded-md overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center">
                  <img 
                    src={shot.url} 
                    alt={`${shot.device} preview`} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg backdrop-blur-sm">View</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case "extraction":
        const ev = event.data.extractedEvidence;
        if (!ev) return null;
        return (
          <div className="space-y-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            {ev.headings?.length > 0 && (
              <div>
                <span className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Primary Headings</span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {ev.headings.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}
            {ev.buttons?.length > 0 && (
              <div>
                <span className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Detected CTAs</span>
                <div className="flex flex-wrap gap-2">
                  {ev.buttons.map((b, i) => <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] uppercase font-semibold">{b}</span>)}
                </div>
              </div>
            )}
            {ev.featureBlocks?.length > 0 && (
              <div>
                <span className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Feature Blocks</span>
                <div className="flex flex-wrap gap-1.5">
                  {ev.featureBlocks.map((f, i) => <span key={i} className="px-2 py-0.5 bg-[#030712] text-slate-400 border border-slate-700 rounded text-xs">{f}</span>)}
                </div>
              </div>
            )}
          </div>
        );

      case "classification":
        return (
          <div className="space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            {event.data.classifiedPages?.map((page, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono truncate max-w-[200px]">{page.url}</span>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] uppercase font-semibold">
                    {page.pageType}
                  </span>
                  <span className="text-slate-600 font-mono text-[10px]">{page.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        );

      case "inference":
        return (
          <div className="flex gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-700/50 rounded bg-[#030712]">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Primary Category</span>
              <span className="text-emerald-400 font-bold text-sm">{event.data.primaryCategory}</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-700/50 rounded bg-[#030712]">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Secondary Category</span>
              <span className="text-slate-300 font-bold text-sm">{event.data.secondaryCategory}</span>
            </div>
          </div>
        );

      case "generation":
        return (
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/30">
              <span className="font-bold">{event.data.generatedCount}</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">Customer Personas Generated</div>
              <div className="text-xs text-slate-400">Review and select personas before starting synthetic user simulation.</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-xl bg-[#030712] border border-slate-800/60 shadow-2xl overflow-hidden font-mono text-sm">
      <div className="bg-[#0f172a] border-b border-slate-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-700 hover:bg-red-500 transition-colors cursor-pointer"></div>
            <div className="w-3 h-3 rounded-full bg-slate-700 hover:bg-yellow-500 transition-colors cursor-pointer"></div>
            <div className="w-3 h-3 rounded-full bg-slate-700 hover:bg-green-500 transition-colors cursor-pointer"></div>
          </div>
          <div className="ml-4 text-slate-500 text-xs tracking-wider flex items-center gap-2">
            <span className="text-blue-500 font-bold">~</span> MARKET_MIRROR_PIPELINE
          </div>
        </div>
        <div className="text-xs text-slate-600 px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900/50">
          v2.0.1
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="p-6 h-[450px] overflow-y-auto space-y-4"
      >
        {validEvents.length === 0 && (
          <div className="text-slate-500 flex items-center gap-2">
            <span className="animate-pulse">_</span> Waiting for target URL...
          </div>
        )}
        
        {validEvents.map((event, index) => {
          if (!event || typeof event !== 'object') return null;

          const status = event.status || "pending";
          const message = event.message || "Processing...";
          const isExpanded = expandedEvents.has(event.id);
          const hasExpandableContent = !!event.details || !!event.data;

          return (
            <div key={event.id || `event-${index}`} className="flex flex-col animate-in fade-in duration-300">
              <div 
                className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${hasExpandableContent ? 'hover:bg-slate-900/50 cursor-pointer' : ''}`}
                onClick={() => hasExpandableContent && toggleExpand(event.id)}
              >
                <div className="mt-0.5 shrink-0">
                  {status === "pending" && <CircleDashed className="w-4 h-4 text-slate-600" />}
                  {status === "running" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {status === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                  {!["pending", "running", "done", "error"].includes(status) && <CircleDashed className="w-4 h-4 text-slate-600" />}
                </div>
                
                <div className="flex-1 flex items-start justify-between gap-4">
                  <div className={`flex-1 ${status === "done" ? "text-slate-300" : status === "error" ? "text-red-400" : "text-blue-400"}`}>
                    {message}
                  </div>
                  
                  {hasExpandableContent && (
                    <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </div>
              
              {isExpanded && (
                <div className="ml-9 pl-4 border-l border-slate-800 py-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {event.details && !event.type && (
                    <div className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {typeof event.details === 'string' ? event.details : JSON.stringify(event.details, null, 2)}
                    </div>
                  )}

                  {renderEventData(event)}
                </div>
              )}
            </div>
          );
        })}
        
        {lastEvent && lastEvent.status !== "done" && lastEvent.status !== "error" && (
           <div className="flex items-center gap-2 text-slate-600 mt-4 pl-2">
             <span className="w-1.5 h-3 bg-blue-500 animate-pulse block"></span>
             <span className="text-xs text-slate-500">Processing next sequence...</span>
           </div>
        )}
      </div>
    </div>
  );
}
