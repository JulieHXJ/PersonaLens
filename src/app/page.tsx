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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Nutzer-Brille 👓</CardTitle>
            <p className="text-center text-sm text-gray-500">
              AI-powered UX & Accessibility Audit (BFSG Ready)
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStart} className="flex gap-2">
              <Input
                placeholder="Enter website URL (e.g. example.de)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {isSubmitting ? "Starting..." : "Audit"}
              </Button>
            </form>
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
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nutzer-Brille 👓</h1>
          <p className="text-sm text-gray-500">Auditing: {audit.url}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
            {audit.status}
          </span>
          {audit.overall_score !== undefined && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Score: {audit.overall_score}/100
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs Navigation */}
        <div className="bg-white border-b px-6 flex gap-6">
          <button 
            className={`py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'} ${audit.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => audit.status === 'completed' && setActiveTab('analysis')}
          >
            Analysis (Live View)
          </button>
          <button 
            className={`py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'improvements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'} ${audit.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => audit.status === 'completed' && setActiveTab('improvements')}
          >
            Actionable Improvements
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-auto bg-gray-50">
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Overview</h2>
                
                {audit.status === "analyzing" && (
                  <div className="bg-white rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">AI Experts are analyzing the page</h3>
                    <p className="text-gray-500">Generating comprehensive reports across 3 different personas. This may take a moment...</p>
                  </div>
                )}

                {audit.status === "completed" && (
                  <>
                    {/* Overall Score */}
                    <div className="bg-white rounded-xl shadow-sm border p-8 flex flex-col items-center justify-center">
                      <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Overall Score</div>
                      <div className={`text-6xl font-black ${audit.overall_score !== undefined && audit.overall_score >= 80 ? 'text-green-600' : audit.overall_score !== undefined && audit.overall_score >= 60 ? 'text-orange-500' : 'text-red-600'}`}>
                        {audit.overall_score !== undefined ? audit.overall_score : '-'}
                        <span className="text-3xl text-gray-400">/100</span>
                      </div>
                    </div>

                    {/* Score Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {reports?.map(report => {
                        let title, color, bg, icon;
                        if (report.persona_type === "Senior") { title = "Oma Schmidt"; color = "text-orange-600"; bg = "bg-orange-600"; icon = <UserCircle className="w-6 h-6"/>; }
                        else if (report.persona_type === "A11y") { title = "Legal Advisor"; color = "text-purple-600"; bg = "bg-purple-600"; icon = <Scale className="w-6 h-6"/>; }
                        else { title = "Digital Native"; color = "text-blue-600"; bg = "bg-blue-600"; icon = <MonitorSmartphone className="w-6 h-6"/>; }

                        return (
                          <div 
                            key={report._id} 
                            onClick={() => {
                              setSelectedPersona(report.persona_type);
                              setActiveTab('analysis');
                            }}
                            className="bg-white rounded-xl shadow-sm border p-6 flex flex-col cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md"
                          >
                            <div className={`flex items-center gap-3 mb-4 ${color}`}>
                              {icon}
                              <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
                            </div>
                            <div className="flex items-end gap-2 mb-3">
                              <span className="text-4xl font-black text-gray-800">{report.score}</span>
                              <span className="text-gray-500 mb-1 font-medium">/ 100</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
                              <div className={`h-3 rounded-full ${bg}`} style={{ width: `${report.score}%` }}></div>
                            </div>
                            <div className="mt-auto flex flex-wrap gap-2">
                              {report.keywords?.map((kw, i) => (
                                <span key={i} className="text-xs bg-gray-50 text-gray-700 px-2.5 py-1.5 rounded-md border font-medium">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <>
              {/* Header with toggle for View Mode when completed */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Live View (Visual Sensor)</h2>
                {audit.status === "completed" && (
                  <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setViewMode("highlights")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "highlights" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
                    >
                      AI Highlights
                    </button>
                    <button 
                      onClick={() => setViewMode("iframe")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "iframe" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
                    >
                      Live Website
                    </button>
                  </div>
                )}
              </div>

              {/* Persona Summary Details - Displayed when a specific persona is selected */}
              {selectedPersona !== "All" && (
                <div className="mb-6">
                  {reports?.filter(r => r.persona_type === selectedPersona).map((report) => {
                    let icon;
                    let title;
                    let color;
                    
                    if (report.persona_type === "Senior") {
                      icon = <UserCircle className="w-6 h-6 text-orange-600" />;
                      title = "Oma Schmidt (Senior)";
                      color = "orange";
                    } else if (report.persona_type === "A11y") {
                      icon = <Scale className="w-6 h-6 text-purple-600" />;
                      title = "Legal Advisor (A11y)";
                      color = "purple";
                    } else {
                      icon = <MonitorSmartphone className="w-6 h-6 text-blue-600" />;
                      title = "Digital Native (Pro)";
                      color = "blue";
                    }

                    return (
                      <div key={report._id} className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full bg-${color}-100`}>
                              {icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                          </div>
                          <div className="text-2xl font-black text-gray-800">
                            Score: {report.score}/100
                          </div>
                        </div>
                        <div className="prose max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border">
                          <p>{report.summary_en || report.summary_de}</p>
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

          <div className="bg-white rounded-lg shadow-sm border relative overflow-hidden flex flex-col" style={{ minHeight: '800px' }}>
            <div className="w-full flex-1 overflow-auto relative bg-gray-50">
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
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-800 bg-white/60 backdrop-blur-sm pointer-events-none">
                      <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-600" />
                      <p className="font-medium text-lg drop-shadow-sm">
                        {audit.status === "analyzing" ? "AI experts are analyzing..." : "Capturing visual DOM tree..."}
                      </p>
                      <p className="text-sm mt-2 text-gray-700 font-medium">
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
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 border-2 ${selectedPersona === "All" ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-600"}`}
                  title="All Personas"
                >
                  <span className="text-xs font-bold">ALL</span>
                </button>
                {reports?.map(report => {
                  let colorHex, bgColorHex, icon, title;
                  if (report.persona_type === "Senior") { colorHex = "#f97316"; bgColorHex = "bg-orange-50"; icon = <UserCircle className="w-6 h-6"/>; title = "Oma Schmidt"; }
                  else if (report.persona_type === "A11y") { colorHex = "#a855f7"; bgColorHex = "bg-purple-50"; icon = <Scale className="w-6 h-6"/>; title = "Legal Advisor"; }
                  else { colorHex = "#3b82f6"; bgColorHex = "bg-blue-50"; icon = <MonitorSmartphone className="w-6 h-6"/>; title = "Digital Native"; }

                  const isSelected = selectedPersona === report.persona_type;

                  return (
                    <div key={report._id} className="relative group">
                      <button 
                        onClick={() => setSelectedPersona(report.persona_type)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 border-2 relative`}
                        style={{ 
                          borderColor: isSelected ? colorHex : '#e5e7eb',
                          backgroundColor: isSelected ? colorHex : 'white',
                          color: isSelected ? 'white' : colorHex
                        }}
                      >
                        {icon}
                        {/* Score badge */}
                        <div className="absolute -top-2 -right-2 bg-white text-gray-900 font-bold text-[10px] w-6 h-6 rounded-full flex items-center justify-center border shadow-sm">
                          {report.score}
                        </div>
                      </button>
                      
                      {/* Expandable info on hover */}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-4 w-64 bg-white p-4 rounded-xl shadow-xl border opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                        <h4 className="font-bold text-gray-900 mb-1" style={{ color: colorHex }}>{title}</h4>
                        <div className="text-sm font-bold mb-2 text-gray-800">Score: {report.score}/100</div>
                        <div className="flex flex-wrap gap-1">
                          {report.keywords?.map((kw, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">{kw}</span>
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
              <div className="space-y-6 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Actionable Improvements</h2>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {allFindings.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No issues found. Perfect score!</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {allFindings.map((f, i) => {
                        let color = "red";
                        if (f.persona === "Senior") color = "orange";
                        if (f.persona === "A11y") color = "purple";
                        if (f.persona === "Pro") color = "blue";
                        
                        return (
                          <li key={i} className="p-6 hover:bg-gray-50 transition-colors flex gap-4">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center font-bold text-sm`}>
                              {i + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold px-2 py-1 rounded bg-${color}-50 text-${color}-700 uppercase tracking-wider`}>
                                  {f.persona}
                                </span>
                                {f.severity && (
                                  <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                                    {f.severity} severity
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-800 text-base">{f.issue}</p>
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
