# Nightshift — User Flow

## Step 1: Configure the Run (5 minutes)
Clean, form-based setup screen. No chat. Three input sections:

### Your Product (free text, 2-3 sentences)
Example:
> "An AI-powered tool that analyzes rental contracts for German tenants, highlights illegal clauses, and generates dispute letters citing specific BGB paragraphs."

### Your Target Customer (structured fields)
- **Segment:** e.g., "Renters in Germany, age 20-40"
- **Sub-segments to test:** e.g., Students, young professionals, expats, families
- **Income range:** e.g., 1,500-5,000/month
- **Tech savviness:** Low / Mixed / High

### What You Want to Learn (checkboxes + custom)
- [ ] Willingness to pay + price sensitivity
- [ ] Current alternatives and switching triggers
- [ ] Must-have vs. nice-to-have features
- [ ] Trust and objection barriers
- [ ] Discovery channels (where would they find you?)
- [ ] Custom: free text field

## Step 2: Launch (1 click)
Press "Run Overnight". A progress screen appears showing:
- Real-time log of persona generation and interview progress
- Estimated completion time (typically 2-3 hours with real pacing, ~5 min with parallelism)
- User can close browser — email/notification sent on completion

### Behind the Scenes (example log)
```
[22:01] Generating 50 synthetic personas...
[22:03] Persona batch generated. Diversity check: OK
        - 12 students, 10 young professionals, 15 expats, 13 families
        - Income distribution: bell curve centered at €2,800
        - Tech savviness: 30% low, 45% medium, 25% high
        - Skepticism levels: 20% trusting, 50% cautious, 30% skeptical
[22:04] Beginning interview batch...
[22:04] Interview 1/50: "Lena, 24, student in Munich" - STARTED
[22:06] Interview 1/50: COMPLETED (8 questions, strong buy signal)
...
[00:42] All 50 interviews completed.
[00:43] Cross-referencing patterns...
[00:47] REPORT READY. Notification sent.
```

## Step 3: Wake Up to a Dashboard
The output is NOT a wall of text. It's a structured, visual, interactive dashboard with multiple tabs for different insights.

Key interaction model: **configure -> launch -> sleep -> explore results**
