// Browser storage for the application step. Every record carries userId and classId so a
// later classroom mode needs no migration.
const get = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
const set = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

export function userId(): string {
  let id = get<string | null>('cts_user', null)
  if (!id) { id = `u-${Math.random().toString(36).slice(2, 10)}`; set('cts_user', id) }
  return id
}
export const classId = (): string | null => get<string | null>('cts_class', null)

export interface MissionAttempt { userId: string; classId: string | null; missionId: string; score: number; detail: string; seconds: number; at: string }
export const loadMissionAttempts = () => get<MissionAttempt[]>('cts_ind_missions', [])
export function saveMissionAttempt(a: Omit<MissionAttempt, 'userId' | 'classId' | 'at'>) {
  set('cts_ind_missions', [{ ...a, userId: userId(), classId: classId(), at: new Date().toISOString() }, ...loadMissionAttempts()].slice(0, 200))
}
