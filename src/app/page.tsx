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
  const audit = useQuery(api.audits.getAudit, { id: auditId });
  const reports = useQuery(api.audits.getPersonaReports, { auditId });
  const screenshotUrl = useQuery(
    api.files.getFileUrl, 
    audit?.screenshotId ? { storageId: audit.screenshotId } : "skip"
  );

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

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Live View */}
        <div className="flex-1 p-6 overflow-auto border-r bg-gray-50">
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

          <div className="bg-white rounded-lg shadow-sm border overflow-auto relative" style={{ minHeight: '600px' }}>
            {!screenshotUrl && audit.status !== "failed" && (
              <div className="absolute inset-0 z-10">
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
              <div className="absolute inset-0 flex items-center justify-center flex-col text-gray-400 z-20 bg-white/80">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>AI experts are analyzing...</p>
              </div>
            )}
            
            {audit.simplifiedHtml && audit.status === "completed" && (
                <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur p-4 rounded-md shadow-lg border border-gray-200 text-sm max-h-64 overflow-auto z-10">
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
            
            {screenshotUrl && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={screenshotUrl} 
                  alt="Website screenshot" 
                  className="max-w-none block"
                  style={{ width: '1280px' }} // Match playwright viewport
                />
                
                {/* Overlay SVGs for flaws */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {allFindings.map((finding, idx) => {
                    const cx = finding.coordinates.x + (finding.coordinates.width || 0) / 2;
                    const cy = finding.coordinates.y + (finding.coordinates.height || 0) / 2;
                    // Fallback if width/height missing: just use x,y
                    const finalCx = isNaN(cx) ? finding.coordinates.x : cx;
                    const finalCy = isNaN(cy) ? finding.coordinates.y : cy;

                    let color = "red";
                    if (finding.persona === "Senior") color = "orange";
                    if (finding.persona === "A11y") color = "purple";
                    if (finding.persona === "Pro") color = "blue";

                    return (
                      <g key={idx}>
                        <circle
                          cx={finalCx}
                          cy={finalCy}
                          r="20"
                          fill="transparent"
                          stroke={color}
                          strokeWidth="3"
                          className="animate-pulse"
                        />
                        <text x={finalCx + 25} y={finalCy + 5} fill={color} fontSize="14" fontWeight="bold" className="bg-white px-1 drop-shadow-md">
                          {idx + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Persona Feeds */}
        <div className="w-[400px] bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Panel of Experts</h2>
          </div>
          
          <div className="flex-1 overflow-auto p-4 space-y-6 bg-gray-50">
            {audit.status === "analyzing" && reports?.length === 0 && (
              <div className="flex items-center text-gray-500 justify-center h-20">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Agents are analyzing...
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
                <div key={report._id} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-full ${avatarBg}`}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      <div className="text-xs text-gray-500">Score: {report.score}/100</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 italic border-l-4 border-gray-300 mb-3">
                    &quot;{report.summary_en || report.summary_de}&quot;
                  </div>

                  {report.findings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Findings:</h4>
                      <ul className="text-sm space-y-2">
                        {report.findings.map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span className="text-gray-700">{f.issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
            
            {audit.status === "completed" && reports?.length === 0 && (
              <div className="text-center text-gray-500">No reports generated.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
