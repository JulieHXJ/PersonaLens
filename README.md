# MarketMirror

**AI synthetic users that tell you why your website converts — or why it doesn't.**

MarketMirror simulates how different customer types experience your product before you ship changes, spend on ads, or scale acquisition.

Instead of guessing why users drop off, you can **watch realistic AI personas explore your site and identify friction, trust gaps, and buying signals.**

---

# What this solves

Early-stage teams waste months building features before knowing:

* Why users don’t trust pricing
* Where conversion friction appears
* Which segments resonate
* What objections block purchase

Traditional analytics tell you **what happened**.

MarketMirror shows you **why it happened.**

---

# How it works

MarketMirror combines:

Browser automation
AI reasoning
Synthetic personas
Behavior simulation

Pipeline:

```text
URL input
→ Website exploration
→ Screenshot capture
→ Structure extraction
→ AI persona generation
→ User simulation
→ Insight aggregation
```

This allows teams to run **customer discovery overnight** without interviews.

---

# Quickstart

## 1 Install

Clone the repo:

```bash
git clone https://github.com/JulieHXJ/MarketMirror.git
cd marketmirror
```

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Usage

## 1 Configure your API key

MarketMirror requires your own AI API key.

This design ensures:

* No keys stored in repo
* No shared quota issues
* No accidental leaks
* User-controlled billing

Enter your key in the UI.

The key is stored locally only.

---

## 2 Run a website analysis

Enter a URL:

```
https://example.com
```

Click:

**Audit Website**

MarketMirror will automatically:

• Launch a browser
• Explore the site
• Capture screenshots
• Extract product signals
• Generate customer personas
• Simulate browsing behavior
• Produce insights

---

## 3 Review the intelligence pipeline

The workspace shows a continuous execution flow:

### Reconnaissance

Website structure discovery

### Synthetic Users

AI-generated customer profiles

### Simulation

Behavior modeling and friction detection

### Intelligence Dashboard

Buy signals and objections

Unlike dashboards, MarketMirror shows the reasoning path.

---

## 4 Save reports

Completed analyses will be stored in:

Document Library

This allows:

• Comparing different products
• Tracking improvements
• Replaying analysis

Prototype version uses local storage.

Future versions will support:

Team workspaces
Cloud storage
History timelines

---

# Tech stack

Frontend:

Next.js
React
Tailwind

Pipeline:

Playwright (browser automation)
LLM reasoning layer
Structured extraction engine

Architecture:

```text
UI Layer
Workspace orchestration

Pipeline Layer
Exploration engine

Extraction Layer
Structured signals

AI Layer
Reasoning + persona generation
```

---

# Contributing

This project is collabrated with 

---

# License

MIT

---
