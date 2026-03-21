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
  const [activeTab, setActiveTab] = useState<"analysis" | "scoring" | "improvements">("analysis");
  const [hoveredFinding, setHoveredFinding] = useState<number | null>(null);
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
            className={`py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis (Live View)
          </button>
          <button 
            className={`py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'scoring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'} ${audit.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => audit.status === 'completed' && setActiveTab('scoring')}
          >
            Scoring Details
          </button>
          <button 
            className={`py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'improvements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'} ${audit.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => audit.status === 'completed' && setActiveTab('improvements')}
          >
            Actionable Improvements
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-auto border-r bg-gray-50">
            {activeTab === 'analysis' && (
              <>
                <h2 className="text-lg font-semibold mb-4">Live View (Visual Sensor)</h2>
                
                {audit.status === "failed" && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 border border-red-200">
                    <p className="font-semibold">Audit failed</p>
                    <p className="text-sm mt-1">There was an error while trying to run the audit.</p>
                    {audit.error_message && (
                      <p className="text-xs mt-2 font-mono bg-red-100 p-2 rounded">{audit.error_message}</p>
                    )}
                  </div>
                )}

          <div className="bg-white rounded-lg shadow-sm border relative overflow-hidden" style={{ minHeight: '600px' }}>
            <div className="w-full h-full overflow-auto relative">
              {!screenshotUrl && audit.status !== "failed" && audit.status !== "completed" && (
                  <div className="absolute inset-0 z-10 bg-gray-50/80 pointer-events-none">
                  <iframe 
                    src={audit.url.startsWith('http') ? audit.url : `https://${audit.url}`} 
                    className="w-full h-full opacity-50 pointer-events-none"
                    title="Website Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                  <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-800 bg-white/40 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-600" />
                    <p className="font-medium text-lg drop-shadow-sm">Capturing visual DOM tree...</p>
                    <p className="text-sm mt-2 text-gray-600 font-medium">Please wait while the AI experts analyze the page</p>
                  </div>
                </div>
              )}
              
              {audit.status === "analyzing" && screenshotUrl && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-800 z-20 bg-white/60 backdrop-blur-md">
                  <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-600" />
                  <p className="font-medium text-lg drop-shadow-sm">AI experts are analyzing...</p>
                  <p className="text-sm mt-2 text-gray-700 font-medium">Reading the extracted DOM and generating reports</p>
                </div>
              )}
                  
                  {audit.simplifiedHtml && audit.status === "completed" && (
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
                  
            {screenshotUrl && audit.status === "completed" && (
              <div className="relative mx-auto" style={{ minHeight: '800px', width: '100%', maxWidth: '1280px' }}>
                <img 
                  src={screenshotUrl} 
                  alt="Website screenshot" 
                  className="w-full h-auto block shadow-md border bg-gray-50"
                  onLoad={() => console.log("Image loaded successfully")}
                  onError={(e) => console.error("Error loading image", e)}
                />
                
                {/* Overlay SVGs for flaws */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {allFindings.map((finding, idx) => {
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
            </div>
          </div>
              </>
            )}

            {activeTab === 'scoring' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Scoring & Analysis</h2>
                {reports?.map((report) => {
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

          {/* Right Panel: Simplified Persona Feeds */}
          <div className="w-[350px] bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Panel of Experts</h2>
              <p className="text-xs text-gray-500 mt-1">High-level overview</p>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50">
              {audit.status === "analyzing" && reports?.length === 0 && (
                <div className="flex items-center text-gray-500 justify-center h-20">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Analyzing...
                </div>
              )}

              {reports?.map((report) => {
                let icon;
                let title;
                let avatarBg;
                
                if (report.persona_type === "Senior") {
                  icon = <UserCircle className="w-6 h-6 text-orange-600" />;
                  title = "Oma Schmidt";
                  avatarBg = "bg-orange-100";
                } else if (report.persona_type === "A11y") {
                  icon = <Scale className="w-6 h-6 text-purple-600" />;
                  title = "Legal Advisor";
                  avatarBg = "bg-purple-100";
                } else {
                  icon = <MonitorSmartphone className="w-6 h-6 text-blue-600" />;
                  title = "Digital Native";
                  avatarBg = "bg-blue-100";
                }

                return (
                  <div key={report._id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${avatarBg}`}>
                          {icon}
                        </div>
                        <h3 className="font-bold text-gray-900">{title}</h3>
                      </div>
                      <div className="font-black text-xl text-gray-800">{report.score}</div>
                    </div>
                    
                    {report.keywords && report.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {report.keywords.map((kw, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {audit.status === "completed" && reports?.length === 0 && (
                <div className="text-center text-gray-500 text-sm">No reports generated.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
