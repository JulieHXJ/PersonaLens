# Nightshift — Dashboard / Morning Report Specification

The dashboard is the product. It must be visually polished, interactive, and structured.

---

## Top-Level Verdict
A prominent signal meter at the top of the dashboard.

**Data:**
- Demand signal percentage (0-100%)
- Count of personas that expressed clear intent to use/pay
- Overall verdict text (e.g., "STRONG DEMAND", "MIXED SIGNALS", "WEAK DEMAND")

**Visual:** Large colored gauge/meter. Green = strong, yellow = mixed, red = weak.

---

## Tab 1: Demand Heatmap
Visual matrix showing demand strength per feature per segment.

- **Rows:** Customer segments (e.g., Students, Expats, Young Professionals, Families)
- **Columns:** Product features (extracted from interviews)
- **Cells:** Color intensity = demand strength (green = high, yellow = medium, red = low)
- **Insight card** below the heatmap with AI-generated summary (e.g., "Expats have the highest demand across ALL features. This is your beachhead segment.")

---

## Tab 2: Willingness to Pay Curve
Interactive chart showing price sensitivity.

- **X-axis:** Price points (Free, €2, €5, €9, €15, €19, €29, €49)
- **Y-axis:** Estimated conversion rate (0-100%)
- **Key callouts:**
  - Sweet spot range (e.g., "€4.99-€9.99/analysis")
  - Revenue-maximizing price (e.g., "€9.99 at 58% conversion")
  - Price ceiling (e.g., "€19.99 — conversion drops below 30%")

---

## Tab 3: Killer Quotes
Categorized quotes from the synthetic interviews.

**Categories:**
- **Buy Signals** — strong positive intent quotes
- **Objections** — concerns and pushback
- **Surprises** — unexpected insights that change product thinking

Each quote shows: the quote text, persona name/demographics, segment tag.

---

## Tab 4: Objection Matrix
Table of every objection raised, clustered and ranked.

**Columns:**
- Objection (text)
- Frequency (X/50, percentage)
- Severity (HIGH / MEDIUM / LOW)
- Suggested Counter (AI-generated response/mitigation strategy)

Sorted by frequency descending.

---

## Tab 5: Feature Priority Stack Rank
Based on forced-ranking exercise across all 50 personas.

**Tiers:**
- **MUST HAVE (>70% ranked top 3):** numbered list with percentages
- **SHOULD HAVE (40-70%):** numbered list with percentages
- **NICE TO HAVE (<40%):** numbered list with percentages

---

## Tab 6: Competitive Landscape (from customer's POV)
How synthetic personas currently solve this problem.

- Horizontal bar chart showing percentage for each current solution
- Insight card highlighting the biggest opportunity (e.g., "44% do nothing — you're competing with inertia, not incumbents")

---

## Tab 7: Segment Deep Dives
Click into any segment for a full profile.

**Per segment:**
- Average willingness to pay
- Top pain point
- Discovery channels (where would they find the product)
- Trust barrier level
- Killer feature for this segment
- Representative quote
- Segment-specific recommendations

---

## Design Notes
- Dark mode preferred, clean typography
- Use data visualization best practices (Recharts or Nivo)
- Cards/panels layout, not a document flow
- Responsive but desktop-first (judges will view on laptops)
- Pre-computed data only — zero AI calls during dashboard viewing = zero latency, zero failure risk
