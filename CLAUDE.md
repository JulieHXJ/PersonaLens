# Nightshift (PersonaLens)

## What This Is
Autonomous AI customer discovery engine. Users configure a run, press go, go to sleep. By morning: a structured market intelligence report based on 50+ simulated customer interviews.

## Tech Stack
- **Frontend:** Next.js (React) + TypeScript
- **Backend:** Convex (database, real-time, background jobs)
- **AI:** Google Gemini API (persona gen, interviews, analysis)
- **Deployment:** Vercel
- **Charts:** Recharts or Nivo
- **Optional:** n8n for email/Slack notifications

## Project Structure
```
/src                 - Next.js app (frontend + API routes)
/convex              - Convex backend (schema, functions, background jobs)
/documentation       - Specs, guides, diagrams
/artifacts           - Temp files, scripts, resources
```

## Architecture
- Convex is the orchestrator: mutations start runs, background jobs execute interviews in parallel batches, analysis runs after all interviews complete.
- Gemini API is called from Convex actions for: persona generation, interview simulation, cross-analysis.
- Frontend consumes Convex via React hooks (useQuery/useMutation). Dashboard renders pre-computed data — zero AI calls during viewing.
- The dashboard IS the product. Invest in making it visually polished.

## Hackathon Context
- **Event:** March 21-22, 2026 (Heilbronn)
- **Deadline:** Day 2, 13:30 hard deadline
- **Submit:** 2-min video + GitHub repo + pitch deck + live demo URL (optional)
- **Judging:** 25% Market/Product, 25% Technical Innovation & AI, 20% Working Demo, 15% UX/Design, 15% Presentation
- **Sponsor tools to integrate:** Gemini (AI), Convex (backend), Vercel (deploy), v0 (UI gen)

## Key Principles
- No chat interface — this is a batch processing system with form-based config
- Output is a visual interactive dashboard, NOT a wall of text
- Pre-computed results = rock-solid demo stability
- Commit early, commit often

## Code Style
- TypeScript strict mode
- Keep files under 1000 lines
- Components in `/src/components/`, pages in `/src/app/`
- Convex functions organized by domain (runs, personas, interviews, analysis)
