// The Macaly version kept the leaderboard and cross-device sync on a Convex server. This
// static version keeps the leaderboard on this device; a shared leaderboard returns with
// classroom mode on the shared classroom server.

export interface LeaderboardEntry {
  _id: string
  name: string
  scenarioId: string
  scenarioName: string
  authorityKey: string
  authorityName: string
  verdict: string
  approved: boolean
  score: number
  maxScore: number
  pct: number
  ts: number
}

const KEY = 'cts_local_leaderboard_v1'

function load(): LeaderboardEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as LeaderboardEntry[] } catch { return [] }
}

export function submitEntry(e: Omit<LeaderboardEntry, '_id' | 'pct' | 'ts'>): void {
  const all = load()
  all.push({ ...e, _id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, pct: e.maxScore ? (e.score / e.maxScore) * 100 : 0, ts: Date.now() })
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* storage unavailable */ }
}

export function topEntries(filter: { scenarioId?: string; authorityKey?: string }, limit = 20): LeaderboardEntry[] {
  return load()
    .filter((e) => (!filter.scenarioId || e.scenarioId === filter.scenarioId) && (!filter.authorityKey || e.authorityKey === filter.authorityKey))
    .sort((a, b) => Number(b.approved) - Number(a.approved) || b.pct - a.pct || a.ts - b.ts)
    .slice(0, limit)
}
