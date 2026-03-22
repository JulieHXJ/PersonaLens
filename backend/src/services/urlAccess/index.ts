import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';
import { CrawledPage } from '../../types/analysis';

export function normalizeUrl(url: string): string {
  let target = url.trim();
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = 'https://' + target;
  }
  return target;
}

export async function fetchPage(url: string): Promise<Partial<CrawledPage>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const html = await response.text();
    return {
      url,
      finalUrl: response.url,
      status: response.status,
      html,
      fetchedAt: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error(`Error fetching ${url}:`, error.message);
    return { url, finalUrl: url, status: null, html: '', fetchedAt: new Date().toISOString() };
  }
}

export function discoverLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  const importantKeywords = ['pricing', 'about', 'features', 'product', 'solutions', 'docs', 'contact'];

  $('a[href]').each((_, el) => {
    let href = $(el).attr('href');
    if (!href) return;
    
    // Ignore invalid
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    if (href.match(/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip)$/i)) return;
    
    try {
      const urlObj = new URL(href, baseUrl);
      // Stay on same domain
      const baseObj = new URL(baseUrl);
      if (urlObj.hostname !== baseObj.hostname) return;
      
      const cleanUrl = urlObj.origin + urlObj.pathname;
      
      // Check if important
      const isImportant = importantKeywords.some(kw => cleanUrl.toLowerCase().includes(kw));
      if (isImportant) {
        links.add(cleanUrl);
      }
    } catch (e) {
      // ignore invalid URLs
    }
  });
  
  // Limit to max 3-5 links
  return Array.from(links).slice(0, 4);
}
