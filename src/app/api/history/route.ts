import { NextRequest } from "next/server";
import { listExplorations, getExploration, countExplorations, getScreenshots, getRunsByExploration } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (id) {
    const exploration = getExploration(id);
    if (!exploration) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    const screenshots = getScreenshots(id);
    const runs = getRunsByExploration(id);

    return Response.json({
      id: exploration.id,
      url: exploration.url,
      status: exploration.status,
      productName: exploration.product_name,
      analysis: exploration.analysis_json ? JSON.parse(exploration.analysis_json) : null,
      personas: exploration.personas_json ? JSON.parse(exploration.personas_json) : null,
      events: exploration.events_json ? JSON.parse(exploration.events_json) : null,
      screenshots: screenshots.map((s) => ({
        url: `/api/screenshots?file=${s.filename}`,
        label: s.label,
        order: s.order_idx,
      })),
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        config: JSON.parse(r.config_json),
        results: r.results_json ? JSON.parse(r.results_json) : null,
      })),
      eventCount: exploration.event_count,
      screenshotCount: exploration.screenshot_count,
      errorMessage: exploration.error_message,
      durationMs: exploration.duration_ms,
      createdAt: exploration.created_at,
      completedAt: exploration.completed_at,
    });
  }

  const explorations = listExplorations(limit, offset);
  const total = countExplorations();

  return Response.json({
    explorations: explorations.map((e) => ({
      id: e.id,
      url: e.url,
      status: e.status,
      productName: e.product_name,
      eventCount: e.event_count,
      screenshotCount: e.screenshot_count,
      errorMessage: e.error_message,
      durationMs: e.duration_ms,
      createdAt: e.created_at,
      completedAt: e.completed_at,
    })),
    total,
    limit,
    offset,
  });
}
