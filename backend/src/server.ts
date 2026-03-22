import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { analyzeWebsiteHandler } from './api/analyzeWebsite';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

// Simple Rate Limiter (In-Memory MVP)
const rateLimits = new Map<string, number>();

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const lastReq = rateLimits.get(ip);
  if (lastReq && Date.now() - lastReq < 5000) {
    logger.warn(`Rate limit triggered for ${ip}`);
    return res.status(429).json({ error: 'Too many requests. Please wait 5 seconds.' });
  }
  rateLimits.set(ip, Date.now());
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main Route
app.post('/api/analyze', analyzeWebsiteHandler as express.RequestHandler);

app.listen(env.PORT, () => {
  logger.info(`MarketMirror Backend MVP running on http://localhost:${env.PORT}`);
});
