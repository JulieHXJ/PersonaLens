import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createAudit = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("website_audits", {
      url: args.url,
      status: "queued",
      timestamp: Date.now(),
    });
  },
});

export const updateAuditStatus = mutation({
  args: { 
    id: v.id("website_audits"), 
    status: v.union(v.literal("queued"), v.literal("crawling"), v.literal("analyzing"), v.literal("completed"), v.literal("failed")),
    error_message: v.optional(v.string()),
    overall_score: v.optional(v.number()),
    screenshotId: v.optional(v.id("_storage")),
    simplifiedHtml: v.optional(v.string()), // Ensure this is definitely updated
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      error_message: args.error_message,
      overall_score: args.overall_score,
      screenshotId: args.screenshotId,
      simplifiedHtml: args.simplifiedHtml,
    });
  },
});

export const addPersonaReport = mutation({
  args: {
    auditId: v.id("website_audits"),
    persona_type: v.union(v.literal("Senior"), v.literal("Pro"), v.literal("A11y")),
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
    summary_en: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("persona_reports", {
      auditId: args.auditId,
      persona_type: args.persona_type,
      score: args.score,
      findings: args.findings,
      summary_en: args.summary_en,
    });
  },
});

export const getAudit = query({
  args: { id: v.id("website_audits") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPersonaReports = query({
  args: { auditId: v.id("website_audits") },
  handler: async (ctx, args) => {
    return await ctx.db.query("persona_reports")
      .withIndex("by_auditId", q => q.eq("auditId", args.auditId))
      .collect();
  },
});
