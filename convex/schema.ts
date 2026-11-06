import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ctLeaderboard: defineTable({
    name: v.string(),
    scenarioId: v.string(),
    scenarioName: v.string(),
    authorityKey: v.string(),
    authorityName: v.string(),
    verdict: v.string(),
    approved: v.boolean(),
    score: v.number(),
    maxScore: v.number(),
    pct: v.number(),
  })
    .index("by_pct", ["pct"])
    .index("by_scenario_pct", ["scenarioId", "pct"])
    .index("by_authority_pct", ["authorityKey", "pct"]),
  ctSyncProfiles: defineTable({
    code: v.string(),
    historyJson: v.string(),
    updatedAt: v.number(),
  }).index("by_code", ["code"]),
})
