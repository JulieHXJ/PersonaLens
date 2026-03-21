import { NextRequest } from "next/server";
import { getScreenshotPath } from "@/lib/db";
import * as fs from "fs";

export async function GET(req: NextRequest) {
  const filename = new URL(req.url).searchParams.get("file");
  if (!filename || filename.includes("..")) {
    return new Response("Invalid filename", { status: 400 });
  }

  const filepath = getScreenshotPath(filename);
  try {
    const buffer = fs.readFileSync(filepath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
