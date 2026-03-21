# Nightshift — AI Pipeline Specification

## Overview
Three sequential AI stages, all using Google Gemini API:
1. **Persona Generation** — create 50 diverse synthetic customer profiles
2. **Interview Simulation** — run structured interviews with each persona
3. **Cross-Analysis** — aggregate all interviews into dashboard data

---

## Stage 1: Persona Generation

### Input
- Product description (from user)
- Target segment definition (from user)
- Sub-segments with quotas
- Income range
- Tech savviness range

### Diversity Constraints (enforced programmatically)
- Segment quotas: distribute personas proportionally across sub-segments
- Income distribution: bell curve centered on midpoint of user's range
- Tech savviness: 30% low, 45% medium, 25% high (adjustable)
- Skepticism levels: 20% trusting, 50% cautious, 30% skeptical
- Geographic diversity within the target market
- Age distribution within the target range
- Mix of decision styles (impulsive, researcher, social proof seeker, etc.)

### Output Schema (per persona)
```json
{
  "name": "Lena Hoffmann",
  "age": 24,
  "segment": "student",
  "city": "Munich",
  "income": 1200,
  "techSavviness": 0.6,
  "skepticism": 0.4,
  "currentSolution": "asks German roommate",
  "painLevel": 0.8,
  "budgetSensitivity": 0.9,
  "decisionStyle": "researches extensively before buying",
  "background": "3rd year psychology student, first apartment alone, had issues with Nebenkostenabrechnung last year"
}
```

### Prompt Strategy
- Single call requesting all 50 personas as a JSON array
- System prompt defines the diversity constraints and output schema
- Include the product context so personas are relevant to the domain
- Validate output: check segment quotas, income distribution, and diversity

---

## Stage 2: Interview Simulation

### Interview Script (7 sections, adaptive)
1. **Problem exploration** (open-ended) — "Tell me about your experience with [problem domain]"
2. **Current solution deep-dive** — "How do you handle this today? What's frustrating about it?"
3. **Product concept reaction** — present the product, get initial reaction
4. **Feature prioritization** — forced rank of proposed features
5. **Willingness to pay** (Van Westendorp style) — "At what price would this be too cheap? A bargain? Getting expensive? Too expensive?"
6. **Objection surfacing** — "What would stop you from using this?"
7. **Discovery channel** — "Where would you expect to find a tool like this?"

### Adaptive Branching
The AI adapts follow-up questions based on responses:
- If persona says "I don't trust AI" → probe deeper on trust, not features
- If persona shows high enthusiasm → probe on willingness to pay more aggressively
- If persona already uses a competitor → deep dive on switching triggers
- If persona is skeptical → explore what proof/evidence would convince them

### Input
- Persona JSON
- Product description
- Interview script template
- Learning goals from user config

### Output Schema (per interview)
```json
{
  "transcript": [
    { "role": "interviewer", "content": "Tell me about your experience renting in Germany..." },
    { "role": "persona", "content": "Well, I moved to Berlin two years ago..." }
  ],
  "extractedData": {
    "buySignal": 0.8,
    "willingnessToPay": {
      "tooCheap": 2,
      "bargain": 5,
      "gettingExpensive": 15,
      "tooExpensive": 30
    },
    "topObjections": ["trust in AI legal advice", "data privacy concerns"],
    "featureRanking": ["clause detection", "dispute letter", "pre-signing scanner", "voice explainer"],
    "discoveryChannel": "Facebook expat groups",
    "currentSolution": "asks German colleague",
    "killerQuote": "I signed a contract with a Schönheitsreparaturen clause and paid €2,000...",
    "surpriseInsight": "Would want this BEFORE signing, not after",
    "overallSentiment": "enthusiastic with trust concerns"
  }
}
```

### Prompt Strategy
- Simulate the entire multi-turn interview in a single Gemini call
- System prompt: "You are simulating a customer discovery interview. Play both the interviewer and the persona. The persona should respond authentically based on their profile — including skepticism, budget sensitivity, and background."
- The persona's profile is injected as context
- Request both the transcript AND extracted structured data in one call

---

## Stage 3: Cross-Analysis

### Input
- All 50 interview extracted data objects
- All 50 persona profiles
- Original product description and learning goals

### Analysis Tasks

#### 3a: Demand Signal
- Count personas with buySignal > 0.6 (configurable threshold)
- Calculate overall demand percentage
- Generate verdict text

#### 3b: Demand Heatmap
- Cross-reference feature rankings by segment
- Score each feature×segment cell on 0-3 scale
- Generate insight text identifying beachhead segment

#### 3c: Willingness to Pay Curve
- Aggregate Van Westendorp responses
- Calculate conversion rate at each price point
- Identify sweet spot, revenue-max price, and ceiling

#### 3d: Killer Quotes
- Select most impactful quotes from each category (buy signals, objections, surprises)
- Rank by specificity and emotional impact
- Include persona attribution

#### 3e: Objection Matrix
- Cluster objections using semantic similarity
- Count frequency of each cluster
- Rate severity (HIGH/MEDIUM/LOW based on frequency + whether it's a dealbreaker)
- Generate suggested counter for each

#### 3f: Feature Priority Stack Rank
- Aggregate feature rankings across all personas
- Calculate percentage that ranked each feature in top 3
- Tier into MUST HAVE (>70%), SHOULD HAVE (40-70%), NICE TO HAVE (<40%)

#### 3g: Competitive Landscape
- Aggregate currentSolution responses
- Group and count
- Generate insight about the opportunity

#### 3h: Segment Deep Dives
- Group all data by segment
- Calculate segment-specific averages and top responses
- Generate per-segment recommendations

### Prompt Strategy
- May need to split into multiple Gemini calls if context window is tight
- Use structured JSON output mode for reliability
- Some analysis (counting, averaging) should be done programmatically in Convex, not via AI — more accurate and faster
- AI handles: clustering, insight generation, quote selection, counter-suggestions

---

## Error Handling
- If a persona generation fails: retry once, then fall back to fewer personas (minimum 30)
- If an interview fails: retry once, then mark as failed and continue (report notes reduced sample)
- If analysis fails: retry with simplified prompt, or fall back to programmatic-only analysis
- All errors logged to the run's log stream for user visibility
