// Optional shared backend (Convex). When VITE_CONVEX_URL is set at build time, scores go to a
// shared leaderboard and a short sync code can move run history between devices. When it is not
// set, the app works exactly as before, with everything kept in this browser.
import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { submitEntry, topEntries, type LeaderboardEntry } from './local-leaderboard'

const url = import.meta.env.VITE_CONVEX_URL as string | undefined
const client = url ? new ConvexHttpClient(url) : null

export const sharedBackend = client !== null

type NewEntry = Omit<LeaderboardEntry, '_id' | 'pct' | 'ts'>
type Filter = { scenarioId?: string; authorityKey?: string }

/** Save a score on this device and, when the backend is on, to the shared leaderboard too. */
export async function submitScore(e: NewEntry): Promise<void> {
  submitEntry(e)
  if (!client) return
  try {
    await client.mutation(anyApi.leaderboard.submit, {
      name: e.name, scenarioId: e.scenarioId, scenarioName: e.scenarioName, authorityKey: e.authorityKey,
      authorityName: e.authorityName, verdict: e.verdict, approved: e.approved, score: e.score, maxScore: e.maxScore,
    })
  } catch { /* the device copy is already saved */ }
}

/** Shared top scores when the backend is on; otherwise (or if it is unreachable) this device's scores. */
export async function loadLeaderboard(filter: Filter): Promise<{ entries: LeaderboardEntry[]; shared: boolean }> {
  if (client) {
    try {
      const rows = (await client.query(anyApi.leaderboard.top, filter)) as Array<Omit<LeaderboardEntry, 'ts'> & { _creationTime: number }>
      return { entries: rows.map((r) => ({ ...r, ts: r._creationTime })), shared: true }
    } catch { /* fall through to the device copy */ }
  }
  return { entries: topEntries(filter), shared: false }
}

export async function createSyncCode(): Promise<string> {
  if (!client) throw new Error('Sync codes are not enabled on this site.')
  return (await client.mutation(anyApi.sync.generate, {})) as string
}
export async function pushSync(code: string, historyJson: string): Promise<void> {
  if (!client) throw new Error('Sync codes are not enabled on this site.')
  await client.mutation(anyApi.sync.push, { code, historyJson })
}
export async function pullSync(code: string): Promise<string | null> {
  if (!client) throw new Error('Sync codes are not enabled on this site.')
  const r = (await client.query(anyApi.sync.pull, { code })) as { historyJson: string } | null
  return r ? r.historyJson : null
}
