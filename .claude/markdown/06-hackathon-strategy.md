# Nightshift — Hackathon Strategy

## Event Details
- **When:** March 21-22, 2026 (Saturday-Sunday)
- **Where:** Weipertstraße 8-10, 74076 Heilbronn
- **Build starts:** Saturday 11:00
- **Submit deadline:** Sunday 13:30 (HARD — no exceptions)
- **Stop dev recommended:** Sunday ~12:00

## Timeline

### Day 1 (Saturday)
| Time | Milestone |
|------|-----------|
| 11:00-13:00 | Finalize idea, design persona schema + interview script |
| 13:00-14:00 | Repo setup, Convex + Next.js scaffold, API keys |
| 14:00-17:00 | Build persona generator + interview engine (Convex actions + Gemini) |
| 17:00-19:00 | Build config UI (setup form) |
| 19:00-22:00 | Build dashboard: verdict, heatmap, WTP curve, quotes, objections |
| 22:00 | **CRITICAL:** Run Nightshift on our own idea overnight. Dog-food it. |

### Day 2 (Sunday)
| Time | Milestone |
|------|-----------|
| 09:00-11:00 | Bug fixes, polish, edge cases, dark mode |
| 11:00-12:00 | Record 2-min video, finalize pitch deck |
| 12:00-13:00 | Final polish, test submission, practice pitch |
| 13:30 | **SUBMIT** |

## Submission Requirements
1. **2-minute video** (YouTube/Loom link)
2. **Source code on GitHub** (public repo)
3. **Pitch deck** (public URL, max 5 slides)
4. **Working demo URL** (optional but encouraged — deploy on Vercel)

All must be publicly accessible.

## Judging Criteria
| Weight | Category | Our Angle |
|--------|----------|-----------|
| 25% | Product Viability & Market Potential | Universal founder pain. $2B+ market. Clear unit economics. Meta play: "we validated our own idea with our own tool." |
| 25% | Technical Innovation & AI | Not a chatbot — batch processing with autonomous agents. Diversity-constrained persona gen. Adaptive interview branching. Cross-persona pattern detection. |
| 20% | Execution & Working Demo | Pre-computed dashboard = always stable. No real-time AI during demo. Fallback: even mediocre interviews still make the dashboard look impressive. |
| 15% | UX & Design | Dashboard IS the product. Heatmaps, charts, quote cards, segment drill-downs. Dark mode, clean typography. |
| 15% | Presentation | Open with: "Last night at 10 PM, we launched Nightshift on our own idea. We went to sleep. This morning, we woke up to this." → show dashboard. |

## Sponsor Tool Integration (bonus points)
- **Google Gemini API** — core AI for all three pipeline stages
- **Convex** — entire backend, DB, background jobs, real-time progress
- **Vercel** — deployment platform for Next.js frontend
- **v0** — use for rapid UI component generation during build
- **n8n** (stretch) — email notification workflow when run completes

## Pitch Structure (2 min pitch + 2 min demo + 2 min Q&A)

### Pitch (2 min)
"42% of startups fail because they build something nobody wants. The fix is simple: talk to customers first. But real customer discovery takes weeks and most founders skip it entirely. Last night at 10 PM, we configured Nightshift with our own startup idea. We pressed one button and went to sleep. This morning we woke up to this." → switch to demo.

### Demo (2 min)
1. Show demand signal meter (76% strong)
2. Show WTP curve ("sweet spot is €9.99")
3. Show killer objection ("68% raised trust concerns — we wouldn't have known this")
4. Show surprise insight ("customers want pre-signing, not post-signing — that changes our strategy")
5. Show segment heatmap ("expats are our beachhead market")
6. "All generated autonomously from 50 simulated interviews while we slept."

### Anticipated Q&A
- **"How is this different from ChatGPT?"** → "ChatGPT gives one answer. We generate 50 diverse personas and run structured interviews with adaptive branching, then cross-persona pattern analysis. It's a focus group vs. asking one friend."
- **"Synthetic customers aren't real."** → "Neither are survey responses, and companies make billion-dollar decisions on those. This gets 80% of the signal in 0.1% of the time, so you know which real interviews to prioritize."
- **"Would you work on this full-time?"** → "We validated our own idea with our own tool overnight. Yes."

## Pitch Deck (5 slides)
1. **Market Problem:** 42% of startups fail from no market need. Customer discovery takes months. Most skip it.
2. **Solution:** Autonomous overnight batch process. Configure → launch → sleep → dashboard by morning. 50+ simulated interviews.
3. **Business Model:** Freemium. $19-49/run. ~$1-2 API cost per run. 10-25x margin.
4. **Go-to-Market:** Indie Hackers, Product Hunt launch, YC/startup community, Reddit r/startups. "Dog-food" angle: we used it on ourselves.
5. **Why Us / Why Now:** LLMs just became good enough for realistic persona simulation. We proved it works overnight.

## Risk Mitigation
- **AI generates bad interviews?** Dashboard still renders beautifully with whatever data exists.
- **Convex goes down?** Pre-seed the dashboard with hardcoded demo data as fallback.
- **Demo crashes?** The dashboard is static React rendering pre-computed JSON. Nothing to crash.
- **Not enough time?** Prioritize: (1) working pipeline end-to-end, (2) dashboard with real data, (3) polish.
