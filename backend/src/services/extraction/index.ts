import * as cheerio from 'cheerio';
import { ExtractedEvidence } from '../../types/analysis';

export function extractEvidence(html: string, pageUrl: string): ExtractedEvidence {
  const $ = cheerio.load(html);
  
  const title = $('title').text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
  
  const headings = {
    h1: Array.from(new Set($('h1').map((_, el) => $(el).text().trim().replace(/\s+/g, ' ')).get().filter(Boolean))).slice(0, 5),
    h2: Array.from(new Set($('h2').map((_, el) => $(el).text().trim().replace(/\s+/g, ' ')).get().filter(Boolean))).slice(0, 10),
    h3: Array.from(new Set($('h3').map((_, el) => $(el).text().trim().replace(/\s+/g, ' ')).get().filter(Boolean))).slice(0, 10),
  };

  // CTAs
  const ctas = new Set<string>();
  const ctaKeywords = ['sign up', 'get started', 'start free', 'book demo', 'contact sales', 'try now', 'login'];
  $('a, button').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (!text || text.length > 30) return;
    
    const isButtonTag = el.tagName === 'button';
    const hasButtonClass = ($(el).attr('class') || '').toLowerCase().includes('btn') || ($(el).attr('class') || '').toLowerCase().includes('button');
    const hasCtaText = ctaKeywords.some(kw => text.toLowerCase().includes(kw));
    
    if (isButtonTag || hasButtonClass || hasCtaText) {
      ctas.add(text);
    }
  });

  // Forms
  const forms: any[] = [];
  $('form').each((_, el) => {
    const action = $(el).attr('action') || null;
    const method = $(el).attr('method') || null;
    const inputs = $(el).find('input').map((_, inp) => $(inp).attr('type') || 'text').get();
    
    let inferredPurpose: "signup" | "login" | "contact" | "search" | "subscribe" | "unknown" = 'unknown';
    const formText = $(el).text().toLowerCase();
    const actionText = (action || '').toLowerCase();
    
    if (formText.includes('login') || formText.includes('sign in') || actionText.includes('login')) inferredPurpose = 'login';
    else if (formText.includes('sign up') || formText.includes('register') || actionText.includes('signup')) inferredPurpose = 'signup';
    else if (formText.includes('contact') || formText.includes('message')) inferredPurpose = 'contact';
    else if (formText.includes('subscribe') || formText.includes('newsletter') || inputs.includes('email') && inputs.length === 1) inferredPurpose = 'subscribe';
    else if (formText.includes('search') || actionText.includes('search')) inferredPurpose = 'search';

    forms.push({ action, method, inputs, inferredPurpose });
  });

  // Pricing
  const pricingMentions = new Set<string>();
  const pricingRegex = /(\$|€|£)\s?\d+|\/(month|year)|free trial|pricing|plans|subscription|enterprise/i;
  // Look at small text nodes directly instead of whole body
  $('*').each((_, el) => {
    if ($(el).children().length === 0) {
      const text = $(el).text().trim();
      if (pricingRegex.test(text) && text.length > 0 && text.length < 100) {
        pricingMentions.add(text.replace(/\s+/g, ' '));
      }
    }
  });

  // Feature Sections (heuristic: h2/h3 followed by p)
  const featureSections: Array<{heading: string, description: string}> = [];
  $('h2, h3').each((_, el) => {
    const heading = $(el).text().trim().replace(/\s+/g, ' ');
    let description = '';
    // Look for next sibling paragraph or div with text
    let nextEl = $(el).next();
    while (nextEl.length && nextEl[0].tagName !== 'h2' && nextEl[0].tagName !== 'h3' && description.length < 200) {
      const text = nextEl.text().trim().replace(/\s+/g, ' ');
      if (text) description += text + ' ';
      nextEl = nextEl.next();
    }
    
    description = description.trim();
    if (heading && description && description.length > 20) {
      featureSections.push({ heading, description });
    }
  });

  // Links
  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (href.startsWith('http')) {
      try {
        const urlObj = new URL(href);
        const baseObj = new URL(pageUrl);
        if (urlObj.hostname === baseObj.hostname) internalLinks.add(href);
        else externalLinks.add(href);
      } catch (e) { /* ignore */ }
    } else if (href.startsWith('/')) {
      internalLinks.add(href);
    }
  });

  return {
    pageUrl,
    title,
    metaDescription,
    headings,
    ctas: Array.from(ctas).slice(0, 15),
    forms,
    pricingMentions: Array.from(pricingMentions).slice(0, 15),
    links: { 
      internal: Array.from(internalLinks).slice(0, 15), 
      external: Array.from(externalLinks).slice(0, 15) 
    },
    featureSections: featureSections.slice(0, 10)
  };
}
