import { NextRequest } from "next/server";
import { queryLogs } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const logs = queryLogs({
    component: searchParams.get("component") || undefined,
    level: searchParams.get("level") || undefined,
    limit: parseInt(searchParams.get("limit") || "100"),
    offset: parseInt(searchParams.get("offset") || "0"),
    since: searchParams.get("since") || undefined,
  });

  return Response.json({ logs });
}
