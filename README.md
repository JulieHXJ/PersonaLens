# MarketMirror

**Most tools test code. We test revenue.**

MarketMirror is an AI-powered website evaluation tool that helps early-stage teams understand how their product website is perceived **before** they waste engineering time, ad spend, or launch momentum.

Instead of only tracking clicks and bounce rates, MarketMirror simulates how different users might interpret a live website and generates a structured report about clarity, trust, pricing, and friction.

---

## Overview

Many SaaS teams build quickly, but learn too late.

Traditional analytics can tell you **what** users did, but not **why** they left.  
Manual interviews can reveal deeper insights, but they are slow, expensive, and hard to scale.

MarketMirror bridges that gap.

Given a website URL, the system:

1. visits the website,
2. captures screenshots,
3. extracts structured evidence from the page,
4. sends that evidence to an AI reasoning layer,
5. returns a report with simulated user insights and improvement suggestions.

The core principle is simple:

> **The browser looks at the website.  
> The AI interprets the evidence.**

The AI does **not** browse the web or take screenshots by itself.

---

## Problem

Early-stage founders, PMs, and small SaaS teams often face the same challenge:

- users do not understand the value proposition,
- pricing feels unclear or untrustworthy,
- calls to action are weak,
- important information is hard to find.

These issues are often discovered only **after launch**, when time and money have already been spent.

MarketMirror helps teams learn earlier.

---

## Solution

MarketMirror runs a lightweight website evaluation workflow and produces an AI-generated report in around one minute.

It focuses on:

- **value proposition clarity**
- **pricing visibility**
- **CTA clarity**
- **trust signals**
- **user friction**
- **unanswered user questions**

Instead of just collecting metrics, MarketMirror simulates how different user types may react to the website.

---

## Key Features

- Analyze a live website from a single URL
- Capture screenshots in **desktop**, **tablet**, and **mobile** views
- Extract structured page evidence such as:
  - title
  - headings
  - CTAs
  - forms
  - pricing mentions
  - feature sections
  - internal and external links
- Generate AI-based reasoning from extracted evidence
- Produce a structured “Morning Report”
- Return dashboard-ready output for frontend cards and detailed analysis views

---

## How It Works

MarketMirror is built as a four-layer pipeline:

### A. URL Access Layer
Responsible for:
- normalizing the input URL
- requesting the page
- retrieving HTML
- discovering a small number of main navigation links

This layer handles access logic only.  
It does **not** perform AI analysis.

### B. Browser Capture Layer
Responsible for:
- opening the website in a real browser environment
- capturing screenshots with Playwright
- generating desktop / tablet / mobile views
- storing screenshot paths for frontend display

### C. Extraction Layer
Responsible for:
- parsing HTML
- extracting structured evidence from the page

Examples:
- page title
- h1 / h2 / h3 headings
- button labels and CTAs
- forms and input types
- pricing-related text
- feature sections
- link structure

### D. AI Reasoning Layer
Responsible for:
- interpreting structured evidence
- classifying the page type
- inferring website category
- generating synthetic user personas
- evaluating clarity, trust, friction, and improvement opportunities

The AI only receives the structured evidence collected by the system.

---

## Why This Is Different

Most website tools focus on:
- analytics,
- A/B testing,
- SEO,
- heatmaps,
- accessibility checklists.

MarketMirror focuses on **simulated perception**.

It does not just ask:
- “Where did the user click?”

It asks:
- “What might this user think?”
- “What feels unclear?”
- “What feels risky or unconvincing?”
- “Why might this visitor hesitate?”

That makes the output more useful in the early product and messaging stage.

---

## Target Users

MarketMirror is designed for:

- **early-stage SaaS founders**
- **product managers**
- **growth teams**
- **digital agencies**
- **startup teams without a dedicated research department**

---

## Example Use Cases

- Validate a landing page before launch
- Review a SaaS pricing page
- Find weak or confusing CTA wording
- Detect trust issues on first impression
- Generate a quick usability-style report without scheduling interviews
- Create client-facing website audit reports for agencies

---

## Tech Stack

This project is designed as a modular MVP using:

- **Node.js**
- **TypeScript**
- **Express**
- **Playwright**
- **Cheerio**
- **OpenAI API**

---

## Architecture

```text
Input URL
   ↓
URL Access Layer
   ↓
Browser Capture Layer
   ↓
Extraction Layer
   ↓
AI Reasoning Layer
   ↓
Structured Report + Dashboard Cards
=======
# ProductEvaluator
AI project developed during Cursor hackathon.
>>>>>>> origin/ziqing

