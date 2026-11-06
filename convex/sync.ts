import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous chars (0/O, 1/I)
const CODE_LENGTH = 8
const MAX_GENERATE_ATTEMPTS = 5

function randomCode(): string {
  let out = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

export const generate = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
      const code = randomCode()
      const existing = await ctx.db
        .query("ctSyncProfiles")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()
      if (!existing) {
        await ctx.db.insert("ctSyncProfiles", { code, historyJson: "[]", updatedAt: Date.now() })
        return code
      }
    }
    throw new Error("Could not generate a unique sync code, please try again")
  },
})

export const push = mutation({
  args: { code: v.string(), historyJson: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase()
    const existing = await ctx.db
      .query("ctSyncProfiles")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique()
    if (!existing) throw new Error("Sync code not found")
    await ctx.db.patch(existing._id, { historyJson: args.historyJson, updatedAt: Date.now() })
    return null
  },
})

export const pull = query({
  args: { code: v.string() },
  returns: v.union(v.object({ historyJson: v.string(), updatedAt: v.number() }), v.null()),
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase()
    const existing = await ctx.db
      .query("ctSyncProfiles")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique()
    if (!existing) return null
    return { historyJson: existing.historyJson, updatedAt: existing.updatedAt }
  },
})
