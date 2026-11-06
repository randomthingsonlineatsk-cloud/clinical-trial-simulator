import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const MAX_NAME_LENGTH = 32
const LEADERBOARD_SIZE = 30
const MIN_SCORE_TOTAL = 1

const entryValidator = v.object({
  _id: v.id("ctLeaderboard"),
  _creationTime: v.number(),
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

export const top = query({
  args: { scenarioId: v.optional(v.string()), authorityKey: v.optional(v.string()) },
  returns: v.array(entryValidator),
  handler: async (ctx, args) => {
    if (args.scenarioId) {
      return await ctx.db
        .query("ctLeaderboard")
        .withIndex("by_scenario_pct", (q) => q.eq("scenarioId", args.scenarioId!))
        .order("desc")
        .take(LEADERBOARD_SIZE)
    }
    if (args.authorityKey) {
      return await ctx.db
        .query("ctLeaderboard")
        .withIndex("by_authority_pct", (q) => q.eq("authorityKey", args.authorityKey!))
        .order("desc")
        .take(LEADERBOARD_SIZE)
    }
    return await ctx.db.query("ctLeaderboard").withIndex("by_pct").order("desc").take(LEADERBOARD_SIZE)
  },
})

export const submit = mutation({
  args: {
    name: v.string(),
    scenarioId: v.string(),
    scenarioName: v.string(),
    authorityKey: v.string(),
    authorityName: v.string(),
    verdict: v.string(),
    approved: v.boolean(),
    score: v.number(),
    maxScore: v.number(),
  },
  returns: v.id("ctLeaderboard"),
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, MAX_NAME_LENGTH)
    if (!name) throw new Error("Name is required")
    if (args.maxScore < MIN_SCORE_TOTAL || args.score < 0 || args.score > args.maxScore) throw new Error("Invalid score")
    const pct = (args.score / args.maxScore) * 100
    return await ctx.db.insert("ctLeaderboard", { ...args, name, pct })
  },
})
