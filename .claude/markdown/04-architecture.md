# Nightshift — Technical Architecture

## Stack Decision Rationale

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js + TypeScript | Deploys to Vercel (sponsor). v0 can gen UI. React ecosystem for charts. |
| Backend | Convex | Sponsor tool. Native background jobs for batch processing. Real-time subscriptions for progress tracking. Zero DevOps. |
| AI | Google Gemini API | Sponsor tool. Free credits at event. Strong structured JSON output. |
| Deployment | Vercel | Sponsor tool. `git push` = deployed. |
| Charts | Recharts or Nivo | React-native charting. Heatmaps, bar charts, gauges. |
| Notifications | n8n (optional) | Sponsor tool. Email/Slack when run completes. |

## System Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        NEXT.JS (VERCEL)                         │
│                                                                  │
│  /configure      →  Form UI, collects product + target + goals  │
│  /run/[id]       →  Live progress view (Convex subscription)    │
│  /report/[id]    →  Dashboard (renders pre-computed JSON)       │
└──────────────┬───────────────────────────────────┬───────────────┘
               │ useMutation                       │ useQuery
               ▼                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                          CONVEX                                  │
│                                                                  │
│  mutations:                                                      │
│    createRun(config)        → stores config, returns runId       │
│    startRun(runId)          → kicks off persona generation       │
│                                                                  │
│  actions (call Gemini):                                          │
│    generatePersonas(config) → 50 structured persona JSONs        │
│    runInterview(persona)    → multi-turn interview transcript     │
│    analyzeResults(runId)    → cross-analysis, stats, quotes      │
│                                                                  │
│  background jobs:                                                │
│    orchestrateRun(runId)    → coordinates full pipeline           │
│      1. generatePersonas                                         │
│      2. fan-out: runInterview x50 (batches of 5-10)             │
│      3. analyzeResults                                           │
│      4. mark run complete                                        │
│                                                                  │
│  queries:                                                        │
│    getRunStatus(runId)      → progress, logs, completion state   │
│    getReport(runId)         → full dashboard data                │
│    getRunHistory()          → list of past runs                  │
└──────────────┬───────────────────────────────────────────────────┘
               │ HTTP (Convex actions)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      GOOGLE GEMINI API                           │
│                                                                  │
│  1. Persona Generation                                           │
│     Input: product desc, target segments, constraints            │
│     Output: 50 structured persona JSON objects                   │
│                                                                  │
│  2. Interview Simulation                                         │
│     Input: persona JSON + interview script + product desc        │
│     Output: multi-turn transcript + extracted data               │
│                                                                  │
│  3. Cross-Analysis                                               │
│     Input: all 50 transcripts + extracted data                   │
│     Output: dashboard data (heatmap, WTP, quotes, objections...) │
└──────────────────────────────────────────────────────────────────┘
```

## Convex Schema (conceptual)

```typescript
// runs table
runs: {
  config: {                    // user input
    productDescription: string,
    targetSegment: string,
    subSegments: string[],
    incomeRange: { min: number, max: number },
    techSavviness: string,
    learningGoals: string[],
    customQuestions: string[],
  },
  status: "configuring" | "generating_personas" | "interviewing" | "analyzing" | "complete" | "failed",
  progress: {
    totalPersonas: number,
    completedInterviews: number,
    currentPhase: string,
  },
  logs: Array<{ timestamp: number, message: string }>,
  createdAt: number,
}

// personas table
personas: {
  runId: Id<"runs">,
  name: string,
  age: number,
  segment: string,
  city: string,
  income: number,
  techSavviness: number,      // 0-1
  skepticism: number,          // 0-1
  currentSolution: string,
  painLevel: number,           // 0-1
  budgetSensitivity: number,   // 0-1
  decisionStyle: string,
  background: string,
}

// interviews table
interviews: {
  runId: Id<"runs">,
  personaId: Id<"personas">,
  transcript: Array<{ role: "interviewer" | "persona", content: string }>,
  extractedData: {
    buySignal: number,         // 0-1
    willingnessToPay: number,  // price in EUR
    topObjections: string[],
    featureRanking: string[],
    discoveryChannel: string,
    currentSolution: string,
    killerQuote: string,
    surpriseInsight: string | null,
  },
  status: "pending" | "in_progress" | "completed" | "failed",
}

// reports table
reports: {
  runId: Id<"runs">,
  demandSignal: {
    percentage: number,
    strongIntentCount: number,
    verdict: string,
  },
  heatmap: {
    segments: string[],
    features: string[],
    data: number[][],          // segment x feature demand scores
    insight: string,
  },
  willingnessToPay: {
    pricePoints: number[],
    conversionRates: number[],
    sweetSpot: string,
    revenueMaxPrice: number,
    priceCeiling: number,
  },
  killerQuotes: {
    buySignals: Array<{ quote: string, personaName: string, segment: string }>,
    objections: Array<{ quote: string, personaName: string, segment: string }>,
    surprises: Array<{ quote: string, personaName: string, segment: string }>,
  },
  objectionMatrix: Array<{
    objection: string,
    frequency: number,
    percentage: number,
    severity: "HIGH" | "MEDIUM" | "LOW",
    suggestedCounter: string,
  }>,
  featurePriority: {
    mustHave: Array<{ feature: string, percentage: number }>,
    shouldHave: Array<{ feature: string, percentage: number }>,
    niceToHave: Array<{ feature: string, percentage: number }>,
  },
  competitiveLandscape: Array<{
    solution: string,
    percentage: number,
  }>,
  segmentDeepDives: Array<{
    segment: string,
    avgWillingnessToPay: number,
    topPain: string,
    discoveryChannels: string[],
    trustBarrier: string,
    killerFeature: string,
    representativeQuote: string,
    recommendations: string[],
  }>,
}
```

## Parallelization Strategy
- Persona generation: single Gemini call, returns all 50 personas
- Interviews: fan out in batches of 5-10 concurrent Convex actions
- Each interview = 1 Gemini call with multi-turn simulation in a single prompt (faster than actual multi-turn API calls)
- Analysis: single pass after all interviews complete, may split into sub-analyses if context window is tight
- Total estimated time: ~5 minutes with parallelism

## Key Design Decisions
1. **Single-prompt interviews** — simulate the full multi-turn interview in one Gemini call rather than actual back-and-forth. Faster, cheaper, more reliable.
2. **Pre-computed dashboard data** — all analysis happens in Convex, stored as structured JSON. Dashboard is pure render. Zero AI during viewing.
3. **Convex background jobs** — native scheduler handles retries, timeouts, and concurrency limits.
4. **Structured JSON output** — use Gemini's JSON mode / response schema to get reliable structured data from every AI call.
