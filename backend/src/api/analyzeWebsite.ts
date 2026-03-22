import { Request, Response } from 'express';
import { normalizeUrl, fetchPage, discoverLinks } from '../services/urlAccess';
import { captureScreenshots } from '../services/browserCapture';
import { extractEvidence } from '../services/extraction';
import { runReasoning } from '../services/ai';
import { getCache, setCache } from '../utils/cache';
import { logger } from '../utils/logger';
import { AnalyzeResponse, AiReasoningOutput } from '../types/analysis';

export async function analyzeWebsiteHandler(req: Request, res: Response) {
  try {
    const rawUrl = req.body.url;
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL is required in the JSON body.' });
    }

    const url = normalizeUrl(rawUrl);
    
    // 1. Cache Check
    const cached = getCache<AnalyzeResponse>(url);
    if (cached) {
      logger.info(`Returning cached result for ${url}`);
      return res.json(cached);
    }

    logger.info(`Starting analysis for ${url}`);

    // 2. URL Access Layer
    const mainPage = await fetchPage(url);
    const finalUrl = mainPage.finalUrl || url;
    
    const pages = [{ 
      url, 
      finalUrl, 
      status: mainPage.status 
    }];
    
    // Attempt to discover more links to prove the access layer works
    const otherLinks = discoverLinks(mainPage.html || '', finalUrl);
    for (const link of otherLinks) {
      if (pages.length >= 4) break; // Limit total pages 
      if (link !== finalUrl) {
        const p = await fetchPage(link);
        pages.push({ url: link, finalUrl: p.finalUrl, status: p.status });
      }
    }

    // 3. Parallelize Browser Capture & Extraction Layers
    logger.info(`Capturing screenshots & extracting evidence for ${finalUrl}...`);
    const [screenshots, evidence] = await Promise.all([
      captureScreenshots(finalUrl),
      Promise.resolve(extractEvidence(mainPage.html || '', finalUrl))
    ]);

    // 4. AI Reasoning Layer
    let ai: AiReasoningOutput | null = null;
    try {
      if (evidence.title || evidence.headings.h1.length > 0) {
        logger.info(`Running AI reasoning on structured evidence...`);
        ai = await runReasoning(evidence);
      } else {
        logger.warn('Insufficient HTML extracted, skipping AI reasoning.');
      }
    } catch (e: any) {
      logger.error('AI Reasoning process failed:', e.message);
    }

    // Build format
    const dashboardCards = ai ? [
      {
        id: 'value-prop',
        title: 'Value Proposition',
        score: ai.evaluation.valuePropositionClarity,
        summary: 'Clarity of the main offering',
        details: ai.evaluation.strengths
      },
      {
        id: 'friction',
        title: 'Friction Points',
        score: 100 - (ai.evaluation.frictionPoints.length * 10),
        summary: 'Identified blockers in user journey',
        details: ai.evaluation.frictionPoints
      },
      {
        id: 'trust',
        title: 'Trust Signals',
        score: ai.evaluation.trustSignals,
        summary: 'Presence of security, testimonials, and validation',
        details: ai.evaluation.improvements
      }
    ] : [];

    const result: AnalyzeResponse = {
      success: true,
      inputUrl: rawUrl,
      normalizedUrl: url,
      pages,
      screenshots,
      evidence,
      ai,
      dashboardCards
    };

    setCache(url, result);
    logger.info(`Analysis complete for ${url}`);
    res.json(result);

  } catch (error: any) {
    logger.error('Analysis failed:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
