import { CandidatePersona, TraceEvent, PipelineResult, SimulationResult, DashboardInsight } from "@/types/pipeline";

export const mockTraceEvents: TraceEvent[] = [
  {
    id: "1",
    message: "Fetching homepage...",
    status: "done",
    type: "fetch",
    data: {
      url: "https://www.google.com",
      statusCode: 200,
      pageTitle: "Google",
      htmlSize: "145 KB"
    }
  },
  {
    id: "2",
    message: "Discovering navigation links...",
    status: "done",
    type: "links",
    data: {
      discoveredLinks: ["/search", "/about", "/pricing", "/docs", "/login"]
    }
  },
  {
    id: "3",
    message: "Capturing screenshots...",
    status: "done",
    type: "screenshots",
    data: {
      screenshots: [
        { device: "Desktop", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop" },
        { device: "Tablet", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=200&auto=format&fit=crop" },
        { device: "Mobile", url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=150&auto=format&fit=crop" }
      ]
    }
  },
  {
    id: "4",
    message: "Extracting content blocks...",
    status: "done",
    type: "extraction",
    data: {
      extractedEvidence: {
        headings: ["Search the world's information, including webpages, images, videos and more."],
        buttons: ["Google Search", "I'm Feeling Lucky", "Sign in"],
        forms: ["Main search query input"],
        featureBlocks: ["Search", "Image search", "Maps", "News", "Translate"],
        pricing: ["None detected"],
        copySnippets: [],
        trustSignals: [],
        integrations: []
      }
    }
  },
  {
    id: "5",
    message: "Classifying page types...",
    status: "done",
    type: "classification",
    data: {
      classifiedPages: [
        { url: "https://www.google.com", pageType: "search engine homepage" as any, confidence: 99 },
        { url: "https://www.google.com/about", pageType: "about" as any, confidence: 95 },
        { url: "https://www.google.com/login", pageType: "login/signup" as any, confidence: 98 }
      ]
    }
  },
  {
    id: "6",
    message: "Inferring website category...",
    status: "done",
    type: "inference",
    data: {
      primaryCategory: "Search Engine",
      secondaryCategory: "Consumer Internet"
    }
  },
  {
    id: "7",
    message: "Generating constrained candidate personas...",
    status: "running",
    type: "generation",
    data: {
      generatedCount: 10
    }
  }
];

export const mockSyntheticUsers: CandidatePersona[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `user-${i + 1}`,
  avatar_url: `https://i.pravatar.cc/150?u=a042581f4e29026024d${i}`,
  identity_label: ["IT Director", "Lead Dev", "VP Sales", "Marketing Mgr", "Freelancer", "Agency Owner", "CEO", "CFO", "Product Mgr", "Designer"][i],
  archetype: ["The Optimizer", "The Skeptic", "The Growth Hacker", "The Creative", "The Builder"][i % 5],
  short_bio: "Looking for an easy way to scale operations without increasing headcount.",
  core_goal: "Consolidate tooling and reduce operational overhead.",
  priorities_and_concerns: ["Security", "Cost", "Integration"],
  biggest_doubts: ["Is it secure?", "Is it easy to use?"],
  price_sensitivity: ["Low", "Medium", "High"][i % 3] as any,
  ai_automation_acceptance: ["Skeptical", "Neutral", "Enthusiastic"][i % 3] as any,
  decision_maker_likelihood: ["Low", "Medium", "High"][i % 3] as any,
  evidence: [],
  relevance_explanation: "Website heavily features enterprise language."
}));

export const mockSimulationResults: SimulationResult[] = mockSyntheticUsers.slice(0, 4).map((user, i) => ({
  persona_id: user.id,
  browsing_summary: "Landed on homepage, immediately noticed the 'Enterprise' label. Scrolled past the features but couldn't find pricing right away.",
  tasks: [
    { task_name: "Find Pricing", status: i % 2 === 0 ? "Success" : "Failed" },
    { task_name: "Understand Value", status: "Partial" },
    { task_name: "Find Signup", status: "Success" }
  ],
  main_friction: [
    "Pricing is hidden behind 'Contact Sales'",
    "Too much technical jargon on the hero section"
  ]
}));

export const mockDashboardInsight: DashboardInsight = {
  buy_signals: [
    "'Enterprise grade security' resonated well with IT Directors.",
    "SSO integration is a strong hook for mid-market users."
  ],
  objections: [
    "Pricing is completely opaque, causing early drop-offs.",
    "The signup form asks for a phone number immediately, causing friction."
  ],
  feature_priority: [
    "Transparent Pricing Table",
    "Self-serve Trial / Freemium Tier",
    "Clearer API Documentation"
  ],
  segment_scores: [
    { segment: "Enterprise IT", score: 85 },
    { segment: "Startup CTOs", score: 40 },
    { segment: "Sales Leaders", score: 60 }
  ]
};

export const mockPipelineResult: PipelineResult = {
  website_type: "SaaS",
  audience_space: {
    b2b_vs_b2c: "B2B",
    technical_level: "High",
    industry_verticals: ["Technology", "Operations", "Finance"],
    company_size_hints: ["Mid-Market", "Enterprise"]
  },
  personas: mockSyntheticUsers,
  evidence_summary: {
    headings: ["Automate your workflow"],
    copySnippets: ["Join 10,000+ teams..."],
    buttons: ["Start Free Trial"],
    forms: ["Book a demo"],
    featureBlocks: ["SOC2 Compliance"],
    trustSignals: ["G2 Crowd Badge"],
    integrations: ["Slack"]
  }
};

export const mockSavedReports: SavedReport[] = [
  {
    id: "report-1",
    url: "https://stripe.com",
    site_title: "Stripe",
    date_analyzed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    website_category: "B2B Service",
    summary: "Simulated 8 synthetic users. Strong buy signals around developer API clarity, but high drop-off on enterprise pricing discovery.",
    key_insight: "API documentation is incredibly clear, but enterprise pricing tiers are opaque.",
    preview_screenshot: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=400&auto=format&fit=crop",
    session_data: {
      url: "https://stripe.com",
      stage: "dashboard",
      traceEvents: [],
      pipelineData: mockPipelineResult,
      selectedUserIds: ["user-1", "user-2", "user-3"],
      simulationResults: mockSimulationResults,
      dashboardInsight: {
        ...mockDashboardInsight,
        buy_signals: ["API documentation is incredibly clear", "Easy to drop into existing React codebase"],
        objections: ["Enterprise pricing tiers are opaque", "Too many products listed on homepage"]
      }
    }
  },
  {
    id: "report-2",
    url: "https://vercel.com",
    site_title: "Vercel",
    date_analyzed: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    website_category: "Developer Tool",
    summary: "Simulated 5 synthetic users. Perfect scores on 'Understanding Value' for Frontend Devs. Some friction for non-technical managers.",
    key_insight: "One-click deployment is a game changer, though bandwidth pricing causes hesitation.",
    preview_screenshot: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop",
    session_data: {
      url: "https://vercel.com",
      stage: "dashboard",
      traceEvents: [],
      pipelineData: mockPipelineResult,
      selectedUserIds: ["user-2", "user-4"],
      simulationResults: mockSimulationResults,
      dashboardInsight: {
        ...mockDashboardInsight,
        buy_signals: ["One-click deployment is a game changer", "Next.js integration is flawless"],
        objections: ["Bandwidth pricing can be scary for side projects"]
      }
    }
  }
];
