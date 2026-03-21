import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { generateAnalysis, generatePersonas } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Step 1: Scrape the website
    const scraped = await scrapeWebsite(url);

    // Step 2: Generate AI analysis
    const analysis = await generateAnalysis(scraped);

    // Step 3: Generate personas based on analysis
    const personas = await generatePersonas(analysis, 10);

    return NextResponse.json({
      scraped: {
        title: scraped.title,
        metaDescription: scraped.metaDescription,
        headings: scraped.headings.slice(0, 8),
        navigation: scraped.navigation,
        imageCount: scraped.imageCount,
      },
      analysis,
      personas,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze website";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
