"use client";

import { useState } from "react";
import { startAudit } from "./actions/orchestrator";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, UserCircle, Scale, MonitorSmartphone } from "lucide-react";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [auditId, setAuditId] = useState<Id<"website_audits"> | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    try {
      setIsSubmitting(true);
      let targetUrl = url;
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      
      console.log(`Calling startAudit with ${targetUrl}`);
      // Don't await the full audit here so UI updates immediately
      const id = await startAudit(targetUrl);
      console.log(`Returned audit id: ${id}`);
      setAuditId(id);
    } catch (err) {
      console.error(err);
      alert("Failed to start audit.");
      setIsSubmitting(false);
    }
  };

  if (!auditId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -z-10 mix-blend-multiply"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl -z-10 mix-blend-multiply"></div>
        
        <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="pb-8 pt-10 text-center relative">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg">
              <MonitorSmartphone className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-4xl font-black tracking-tight text-gray-900 mt-4">Nutzer-Brille</CardTitle>
            <p className="text-center text-sm font-medium text-gray-500 mt-2 uppercase tracking-widest">
              AI-powered UX & Accessibility Audit
            </p>
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <form onSubmit={handleStart} className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Enter website URL (e.g. example.de)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 pl-12 py-6 text-lg rounded-xl shadow-inner border-gray-200 bg-gray-50 focus-visible:ring-blue-500 focus-visible:bg-white transition-all"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting || !url} 
                className="w-full py-6 text-lg font-bold rounded-xl shadow-md bg-gray-900 hover:bg-gray-800 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Starting Audit...
                  </>
                ) : (
                  "Run Audit"
                )}
              </Button>
            </form>
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center gap-6 text-gray-400">
              <div className="flex flex-col items-center gap-1">
                <UserCircle className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Usability</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Scale className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Compliance</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <MonitorSmartphone className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tech UX</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AuditView auditId={auditId} />;
}

function AuditView({ auditId }: { auditId: Id<"website_audits"> }) {
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "improvements">("overview");
  const [viewMode, setViewMode] = useState<"highlights" | "iframe">("highlights");
  const [hoveredFinding, setHoveredFinding] = useState<number | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<"All" | "Senior" | "A11y" | "Pro">("All");
  const audit = useQuery(api.audits.getAudit, { id: auditId });
  const reports = useQuery(api.audits.getPersonaReports, { auditId });
  const screenshotUrl = useQuery(
    api.files.getFileUrl, 
    audit?.screenshotId ? { storageId: audit.screenshotId } : "skip"
  );

  console.log("Screenshot URL from Convex:", screenshotUrl);

  if (!audit) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const allFindings = reports?.flatMap(r => 
    r.findings.map(f => ({ ...f, persona: r.persona_type }))
  ) || [];

  const displayedFindings = selectedPersona === "All" 
    ? allFindings 
    : allFindings.filter(f => f.persona === selectedPersona);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b px-8 py-5 flex justify-between items-center shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Nutzer-Brille</h1>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Auditing: <span className="text-blue-600">{audit.url}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border ${
            audit.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
            audit.status === 'analyzing' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
            audit.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
            {audit.status}
          </span>
          {audit.overall_score !== undefined && (
            <span className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-sm font-bold shadow-sm flex items-center gap-1">
              <span className="text-gray-300 text-xs mr-1">SCORE:</span> {audit.overall_score}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs Navigation */}
        <div className="bg-white/80 backdrop-blur-md border-b px-8 flex gap-8 z-10 relative shadow-[0_4px_20px_-15px_rgba(0,0,0,0.1)]">
          <button 
            className={`py-4 font-bold text-sm border-b-2 transition-all duration-200 relative ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
            {activeTab === 'overview' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 shadow-[0_-2px_10px_rgba(37,99,235,0.5)]"></div>}
          </button>
          <button 
            className={`py-4 font-bold text-sm border-b-2 transition-all duration-200 relative ${activeTab === 'analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'} ${audit.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => audit.status === 'completed' && setActiveTab('analysis')}
          >
            Analysis (Live View)
            {activeTab === 'analysis' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 shadow-[0_-2px_10px_rgba(37,99,235,0.5)]"></div>}
          </button>
          <button 
            className={`py-4 font-bold text-sm border-b-2 transition-all duration-200 relative ${activeTab === 'improvements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'} ${audit.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => audit.status === 'completed' && setActiveTab('improvements')}
          >
            Actionable Improvements
            {activeTab === 'improvements' && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 shadow-[0_-2px_10px_rgba(37,99,235,0.5)]"></div>}
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-auto bg-gray-50/50">
            {activeTab === 'overview' && (
              <div className="space-y-8 max-w-5xl mx-auto py-4">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Audit Overview</h2>
                  <p className="text-gray-500 mt-2 font-medium">Comprehensive UX & Accessibility Analysis</p>
                </div>
                
                {audit.status === "analyzing" && (
                  <div className="bg-white rounded-2xl shadow-sm border p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                      <div className="relative bg-white rounded-full p-4 shadow-sm border border-gray-100">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Experts are analyzing the page</h3>
                    <p className="text-gray-500 text-lg leading-relaxed">Generating comprehensive reports across 3 different personas. This may take a moment...</p>
                  </div>
                )}

                {audit.status === "completed" && (
                  <div className="space-y-8">
                    {/* Overall Score */}
                    <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-3xl shadow-sm border border-gray-200 p-10 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-2xl opacity-60"></div>
                      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-gradient-to-tr from-green-50 to-orange-50 rounded-full blur-2xl opacity-60"></div>
                      
                      <div className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-widest relative z-10">Overall Score</div>
                      <div className={`text-7xl font-black relative z-10 tracking-tight drop-shadow-sm ${audit.overall_score !== undefined && audit.overall_score >= 80 ? 'text-green-600' : audit.overall_score !== undefined && audit.overall_score >= 60 ? 'text-orange-500' : 'text-red-600'}`}>
                        {audit.overall_score !== undefined ? audit.overall_score : '-'}
                        <span className="text-4xl text-gray-400 font-bold ml-1">/100</span>
                      </div>
                    </div>

                    {/* Score Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {reports?.map(report => {
                        let title, color, bg, icon, hoverBg;
                        if (report.persona_type === "Senior") { 
                          title = "Oma Schmidt"; color = "text-orange-600"; bg = "bg-orange-500"; hoverBg = "hover:border-orange-200 hover:ring-orange-100"; icon = <UserCircle className="w-7 h-7"/>; 
                        }
                        else if (report.persona_type === "A11y") { 
                          title = "Legal Advisor"; color = "text-purple-600"; bg = "bg-purple-500"; hoverBg = "hover:border-purple-200 hover:ring-purple-100"; icon = <Scale className="w-7 h-7"/>; 
                        }
                        else { 
                          title = "Digital Native"; color = "text-blue-600"; bg = "bg-blue-500"; hoverBg = "hover:border-blue-200 hover:ring-blue-100"; icon = <MonitorSmartphone className="w-7 h-7"/>; 
                        }

                        return (
                          <div 
                            key={report._id} 
                            onClick={() => {
                              setSelectedPersona(report.persona_type);
                              setActiveTab('analysis');
                            }}
                            className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:ring-4 ring-opacity-50 ${hoverBg}`}
                          >
                            <div className={`flex items-center gap-3 mb-6 ${color}`}>
                              <div className="p-2.5 bg-gray-50 rounded-xl shadow-inner border border-gray-100">
                                {icon}
                              </div>
                              <h3 className="font-extrabold text-gray-900 text-xl tracking-tight">{title}</h3>
                            </div>
                            <div className="flex items-baseline gap-1 mb-4">
                              <span className="text-5xl font-black text-gray-800 tracking-tight">{report.score}</span>
                              <span className="text-gray-400 font-bold text-lg mb-1">/ 100</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-8 shadow-inner overflow-hidden">
                              <div className={`h-full rounded-full ${bg} transition-all duration-1000 ease-out`} style={{ width: `${report.score}%` }}></div>
                            </div>
                            <div className="mt-auto flex flex-wrap gap-2">
                              {report.keywords?.map((kw, i) => (
                                <span key={i} className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 font-semibold shadow-sm">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="max-w-7xl mx-auto py-4">
              {/* Header with toggle for View Mode when completed */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Live View Analysis</h2>
                {audit.status === "completed" && (
                  <div className="flex items-center gap-1.5 bg-gray-100/80 backdrop-blur p-1.5 rounded-xl shadow-inner border border-gray-200">
                    <button 
                      onClick={() => setViewMode("highlights")}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${viewMode === "highlights" ? "bg-white shadow-sm text-blue-600 ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"}`}
                    >
                      AI Highlights
                    </button>
                    <button 
                      onClick={() => setViewMode("iframe")}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${viewMode === "iframe" ? "bg-white shadow-sm text-blue-600 ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"}`}
                    >
                      Live Website
                    </button>
                  </div>
                )}
              </div>

              {/* Persona Summary Details - Displayed when a specific persona is selected */}
              {selectedPersona !== "All" && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                  {reports?.filter(r => r.persona_type === selectedPersona).map((report) => {
                    let icon;
                    let title;
                    let color, bgClass, borderClass, textClass;
                    
                    if (report.persona_type === "Senior") {
                      icon = <UserCircle className="w-8 h-8 text-orange-600" />;
                      title = "Oma Schmidt (Senior)";
                      bgClass = "bg-orange-50";
                      borderClass = "border-orange-200";
                      textClass = "text-orange-900";
                    } else if (report.persona_type === "A11y") {
                      icon = <Scale className="w-8 h-8 text-purple-600" />;
                      title = "Legal Advisor (A11y)";
                      bgClass = "bg-purple-50";
                      borderClass = "border-purple-200";
                      textClass = "text-purple-900";
                    } else {
                      icon = <MonitorSmartphone className="w-8 h-8 text-blue-600" />;
                      title = "Digital Native (Pro)";
                      bgClass = "bg-blue-50";
                      borderClass = "border-blue-200";
                      textClass = "text-blue-900";
                    }

                    return (
                      <div key={report._id} className={`bg-white rounded-2xl shadow-md border ${borderClass} overflow-hidden`}>
                        <div className={`p-6 border-b ${borderClass} flex items-center justify-between ${bgClass}`}>
                          <div className="flex items-center gap-4">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm">
                              {icon}
                            </div>
                            <h3 className={`text-2xl font-extrabold tracking-tight ${textClass}`}>{title}</h3>
                          </div>
                          <div className="flex items-baseline gap-1 bg-white px-4 py-2 rounded-xl shadow-sm border border-white/50">
                            <span className={`text-3xl font-black ${textClass}`}>{report.score}</span>
                            <span className="text-gray-400 font-bold text-sm">/ 100</span>
                          </div>
                        </div>
                        <div className="p-6 bg-white prose prose-gray max-w-none">
                          <p className="text-gray-700 text-lg leading-relaxed font-medium">{report.summary_en || report.summary_de}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {audit.status === "failed" && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 border border-red-200">
                    <p className="font-semibold">Audit failed</p>
                    <p className="text-sm mt-1">There was an error while trying to run the audit.</p>
                    {audit.error_message && (
                      <p className="text-xs mt-2 font-mono bg-red-100 p-2 rounded">{audit.error_message}</p>
                    )}
                  </div>
                )}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 relative overflow-hidden flex flex-col" style={{ minHeight: '800px' }}>
            <div className="w-full flex-1 overflow-auto relative bg-gray-100">
              {/* Always keep the iframe around for "Live Website" mode or when loading */}
              <div className={`absolute inset-0 z-10 bg-white pointer-events-auto ${audit.status === "completed" && viewMode === "highlights" ? 'hidden' : 'block'}`}>
                  <iframe 
                    src={audit.url.startsWith('http') ? audit.url : `https://${audit.url}`} 
                    className="w-full h-full border-0"
                    title="Website Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                  
                  {/* Loading Overlays - Only show when NOT completed */}
                  {audit.status !== "completed" && audit.status !== "failed" && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-800 bg-white/60 backdrop-blur-md pointer-events-none z-20">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-white rounded-full p-4 shadow-sm border border-gray-100">
                          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3 drop-shadow-sm">
                        {audit.status === "analyzing" ? "AI experts are analyzing..." : "Capturing visual DOM tree..."}
                      </h3>
                      <p className="text-gray-600 text-lg font-medium drop-shadow-sm">
                        {audit.status === "analyzing" 
                          ? "Reading the extracted DOM and generating reports" 
                          : "Please wait while the AI experts analyze the page"}
                      </p>
                    </div>
                  )}
                </div>
                  
                  {audit.simplifiedHtml && audit.status === "completed" && viewMode === "highlights" && (
                      <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur p-4 rounded-md shadow-lg border border-gray-200 text-sm max-h-64 overflow-auto z-10 hidden">
                          <div className="flex justify-between items-center mb-2 sticky top-0 bg-white/95 pb-2 border-b">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                  <MonitorSmartphone className="w-4 h-4" />
                                  Extracted DOM Tree for AI (Visual Sensor)
                              </h3>
                          </div>
                          <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                              {audit.simplifiedHtml}
                          </pre>
                      </div>
                  )}
                  
            {screenshotUrl && audit.status === "completed" && viewMode === "highlights" && (
              <div className="relative mx-auto w-[1280px] min-h-[800px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={screenshotUrl} 
                  alt="Website screenshot" 
                  className="w-full h-auto block shadow-md border bg-gray-50"
                  onLoad={() => console.log("Image loaded successfully")}
                  onError={(e) => console.error("Error loading image", e)}
                />
                
                {/* Overlay SVGs for flaws */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {displayedFindings.map((finding, idx) => {
                    // Default to some size if width/height is missing, though they shouldn't be
                    const width = finding.coordinates.width || 40;
                    const height = finding.coordinates.height || 40;
                    const x = finding.coordinates.x;
                    const y = finding.coordinates.y;

                    let colorHex = "#ef4444";
                    let bgColorHex = "rgba(239, 68, 68, 0.2)";
                    
                    if (finding.persona === "Senior") { colorHex = "#f97316"; bgColorHex = "rgba(249, 115, 22, 0.2)"; }
                    if (finding.persona === "A11y") { colorHex = "#a855f7"; bgColorHex = "rgba(168, 85, 247, 0.2)"; }
                    if (finding.persona === "Pro") { colorHex = "#3b82f6"; bgColorHex = "rgba(59, 130, 246, 0.2)"; }

                    const isHovered = hoveredFinding === idx;

                    return (
                      <div 
                        key={idx}
                        className="absolute cursor-pointer transition-all duration-200 ease-in-out pointer-events-auto"
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                          border: `3px solid ${colorHex}`,
                          backgroundColor: isHovered ? bgColorHex : 'transparent',
                          zIndex: isHovered ? 50 : 10,
                          borderRadius: '4px',
                          boxShadow: isHovered ? `0 0 15px ${colorHex}` : 'none'
                        }}
                        onMouseEnter={() => setHoveredFinding(idx)}
                        onMouseLeave={() => setHoveredFinding(null)}
                      >
                        {/* Number Badge */}
                        <div 
                          className="absolute -top-3 -left-3 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"
                          style={{ backgroundColor: colorHex }}
                        >
                          {idx + 1}
                        </div>

                        {/* Tooltip */}
                        {isHovered && (
                          <div 
                            className="absolute bg-white text-gray-900 p-4 rounded-lg shadow-2xl border border-gray-200 w-80 pointer-events-none"
                            style={{
                              top: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              marginTop: '8px'
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: bgColorHex, color: colorHex }}>
                                {finding.persona}
                              </span>
                              {finding.severity && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase tracking-wider font-semibold">
                                  {finding.severity}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed font-medium">
                              {finding.issue}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Floating Role Filters */}
            {audit.status === "completed" && activeTab === 'analysis' && viewMode === "highlights" && (
              <div className="fixed right-6 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-50">
                <button 
                  onClick={() => setSelectedPersona("All")}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 border-2 ${selectedPersona === "All" ? "border-gray-800 bg-gray-900 text-white shadow-gray-900/30" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
                  title="All Personas"
                >
                  <span className="text-xs font-black tracking-widest">ALL</span>
                </button>
                {reports?.map(report => {
                  let colorHex, bgColorHex, icon, title, shadowClass;
                  if (report.persona_type === "Senior") { colorHex = "#ea580c"; bgColorHex = "bg-orange-50"; icon = <UserCircle className="w-6 h-6"/>; title = "Oma Schmidt"; shadowClass = "shadow-orange-500/30"; }
                  else if (report.persona_type === "A11y") { colorHex = "#9333ea"; bgColorHex = "bg-purple-50"; icon = <Scale className="w-6 h-6"/>; title = "Legal Advisor"; shadowClass = "shadow-purple-500/30"; }
                  else { colorHex = "#2563eb"; bgColorHex = "bg-blue-50"; icon = <MonitorSmartphone className="w-6 h-6"/>; title = "Digital Native"; shadowClass = "shadow-blue-500/30"; }

                  const isSelected = selectedPersona === report.persona_type;

                  return (
                    <div key={report._id} className="relative group">
                      <button 
                        onClick={() => setSelectedPersona(report.persona_type)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 border-2 relative ${isSelected ? shadowClass : ''}`}
                        style={{ 
                          borderColor: isSelected ? colorHex : '#e5e7eb',
                          backgroundColor: isSelected ? colorHex : 'white',
                          color: isSelected ? 'white' : colorHex
                        }}
                      >
                        {icon}
                        {/* Score badge */}
                        <div className={`absolute -top-2 -right-2 bg-white font-black text-[11px] w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-sm ${isSelected ? 'text-gray-900 border-white' : 'text-gray-600 border-gray-100'}`} style={{ color: isSelected ? colorHex : undefined }}>
                          {report.score}
                        </div>
                      </button>
                      
                      {/* Expandable info on hover */}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-6 w-72 bg-white/95 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-gray-100 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-4 group-hover:translate-x-0 scale-95 group-hover:scale-100 origin-right">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-extrabold text-lg tracking-tight" style={{ color: colorHex }}>{title}</h4>
                          <div className="text-sm font-black bg-gray-100 px-2 py-0.5 rounded-lg text-gray-800">{report.score}/100</div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {report.keywords?.map((kw, i) => (
                            <span key={i} className="text-[11px] font-bold bg-gray-50 px-2 py-1 rounded-md text-gray-600 border border-gray-200">{kw}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            </div>
            </div>
              </>
            )}

            {activeTab === 'improvements' && (
              <div className="space-y-8 max-w-5xl mx-auto py-4">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Actionable Improvements</h2>
                  <p className="text-gray-500 mt-2 font-medium">Prioritized list of issues to fix across all personas</p>
                </div>
                <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden">
                  {allFindings.length === 0 ? (
                    <div className="p-16 text-center text-gray-500 flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">No issues found</h3>
                      <p className="text-gray-500 mt-1">Perfect score! This page meets all our evaluated criteria.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {allFindings.map((f, i) => {
                        let color = "red";
                        let bgClass = "bg-red-50";
                        let textClass = "text-red-700";
                        let badgeBg = "bg-red-100";
                        let badgeText = "text-red-700";
                        
                        if (f.persona === "Senior") { 
                          color = "orange"; bgClass = "bg-orange-50"; textClass = "text-orange-700"; badgeBg = "bg-orange-100"; badgeText = "text-orange-700";
                        }
                        if (f.persona === "A11y") { 
                          color = "purple"; bgClass = "bg-purple-50"; textClass = "text-purple-700"; badgeBg = "bg-purple-100"; badgeText = "text-purple-700";
                        }
                        if (f.persona === "Pro") { 
                          color = "blue"; bgClass = "bg-blue-50"; textClass = "text-blue-700"; badgeBg = "bg-blue-100"; badgeText = "text-blue-700";
                        }
                        
                        return (
                          <li key={i} className="p-6 hover:bg-gray-50 transition-colors flex gap-5 group">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${badgeBg} ${badgeText} flex items-center justify-center font-black shadow-sm border border-white`}>
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${bgClass} ${textClass} uppercase tracking-wider border border-${color}-100`}>
                                  {f.persona}
                                </span>
                                {f.severity && (
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                                    f.severity === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                                    f.severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                    'bg-green-50 text-green-700 border-green-100'
                                  }`}>
                                    {f.severity}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-800 text-lg leading-relaxed font-medium group-hover:text-gray-900 transition-colors">{f.issue}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
