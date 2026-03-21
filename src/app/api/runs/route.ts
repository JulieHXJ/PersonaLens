import { NextRequest } from "next/server";
import { createRun, completeRun, failRun, getRun, listRuns } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const run = getRun(id);
    if (!run) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    return Response.json({
      id: run.id,
      explorationId: run.exploration_id,
      status: run.status,
      config: JSON.parse(run.config_json),
      results: run.results_json ? JSON.parse(run.results_json) : null,
      startedAt: run.started_at,
      completedAt: run.completed_at,
    });
  }

  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const runs = listRuns(limit, offset);

  return Response.json({
    runs: runs.map((r) => ({
      id: r.id,
      explorationId: r.exploration_id,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      config: JSON.parse(r.config_json),
      hasResults: !!r.results_json,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { action, explorationId, config, runId, results } = await req.json();

  if (action === "create") {
    if (!explorationId || !config) {
      return Response.json({ error: "explorationId and config required" }, { status: 400 });
    }
    const id = createRun(explorationId, config);
    return Response.json({ id });
  }

  if (action === "complete") {
    if (!runId || !results) {
      return Response.json({ error: "runId and results required" }, { status: 400 });
    }
    completeRun(runId, results);
    return Response.json({ success: true });
  }

  if (action === "fail") {
    if (!runId) {
      return Response.json({ error: "runId required" }, { status: 400 });
    }
    failRun(runId);
    return Response.json({ success: true });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
