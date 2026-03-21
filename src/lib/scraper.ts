import * as cheerio from "cheerio";

export interface ScrapedWebsite {
  url: string;
  title: string;
  metaDescription: string;
  headings: { level: string; text: string }[];
  paragraphs: string[];
  features: string[];
  navigation: string[];
  contactInfo: string[];
  imageCount: number;
  summary: string;
}

export async function scrapeWebsite(url: string): Promise<ScrapedWebsite> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Nightshift/1.0; +https://nightshift.dev)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove scripts and styles
  $("script, style, noscript").remove();

  const title = $("title").text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || "";

  const headings: { level: string; text: string }[] = [];
  $("h1, h2, h3, h4").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 200) {
      headings.push({ level: el.tagName.toLowerCase(), text });
    }
  });

  const paragraphs: string[] = [];
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20 && text.length < 1000) {
      paragraphs.push(text);
    }
  });

  // Extract list items as potential features
  const features: string[] = [];
  $("li").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 5 && text.length < 200) {
      features.push(text);
    }
  });

  const navigation: string[] = [];
  $("nav a, header a").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 1 && text.length < 100) {
      navigation.push(text);
    }
  });

  // Find contact info
  const bodyText = $("body").text();
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const phoneRegex =
    /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const contactInfo = [
    ...(bodyText.match(emailRegex) || []),
    ...(bodyText.match(phoneRegex) || []).slice(0, 3),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const imageCount = $("img").length;

  // Build a summary from the most important content
  const summaryParts = [
    title,
    metaDescription,
    ...headings.slice(0, 5).map((h) => h.text),
    ...paragraphs.slice(0, 3),
  ].filter(Boolean);
  const summary = summaryParts.join(" | ").substring(0, 1500);

  return {
    url,
    title,
    metaDescription,
    headings: headings.slice(0, 20),
    paragraphs: paragraphs.slice(0, 15),
    features: features.slice(0, 20),
    navigation: [...new Set(navigation)].slice(0, 15),
    contactInfo,
    imageCount,
    summary,
  };
}
