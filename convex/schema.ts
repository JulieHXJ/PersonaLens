import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  website_audits: defineTable({
    url: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("crawling"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error_message: v.optional(v.string()), // Added error message field
    overall_score: v.optional(v.number()),
    screenshotId: v.optional(v.id("_storage")),
    simplifiedHtml: v.optional(v.string()), // Added to store HTML for UI
    timestamp: v.number(), // Use Date.now()
  }),

  persona_reports: defineTable({
    auditId: v.id("website_audits"),
    persona_type: v.union(
      v.literal("Senior"),
      v.literal("Pro"),
      v.literal("A11y")
    ),
    score: v.number(),
    findings: v.array(
      v.object({
        issue: v.string(),
        coordinates: v.object({
          x: v.number(),
          y: v.number(),
          width: v.optional(v.number()),
          height: v.optional(v.number()),
        }),
        severity: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
      })
    ),
    summary_en: v.optional(v.string()), // Made optional to support old records that had summary_de
    summary_de: v.optional(v.string()), // Keep for backwards compatibility
    keywords: v.optional(v.array(v.string())), // 3-5 keywords
  }).index("by_auditId", ["auditId"]),
});
