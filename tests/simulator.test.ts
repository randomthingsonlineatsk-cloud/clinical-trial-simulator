// Phase 0: the move from Macaly keeps the simulation engine unchanged.
import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '../src/data/ct-scenarios'
import { REGULATORS } from '../src/data/ct-regulators'
import { buildDecisions } from '../src/data/ct-decisions'
import { gradePhase, runPhase1, runPhase2, runPhase3, reviewVerdict } from '../src/data/ct-engine'
import type { Choices, Scenario } from '../src/data/ct-types'

function bestChoices(s: Scenario): Choices {
  const c: Choices = {
    p1_dose: s.startingDoseBasis, p1_escalation: s.escalation, p1_population: s.p1Population, p1_n: s.platformGroup.startsWith('vaccine') ? 'medium' : 'small', p1_dlt: 'prespecified',
    p2_endpoint: s.p2Endpoint, p2_comparator: s.p2Comparator, p2_blinding: s.p2Blinding, p2_ratio: s.p2Comparator === 'single_arm' ? 'single_arm_na' : '1_1', p2_size: 'realistic', p2_adaptive: 'futility',
    p3_endpoint: s.p3Endpoints.find((e) => e.correct)!.id, p3_design: s.p3Design, p3_size: 'discounted', p3_interim: 'alpha_spending', p3_inclusion: 'broad',
  }
  if (s.special) c[s.special.id] = s.special.correctOptionId
  return c
}

describe('Simulator engine after the move', () => {
  it('has 15 curated programs and 21 authorities', () => {
    expect(SCENARIOS).toHaveLength(15)
    expect(REGULATORS).toHaveLength(21)
  })
  it('grades the best design as best practice in every program', () => {
    for (const s of SCENARIOS) {
      const c = bestChoices(s)
      for (const ph of ['p1', 'p2', 'p3'] as const) {
        const g = gradePhase(s, ph, c)
        expect(g.length).toBe(buildDecisions(s, ph).length)
        expect(g.filter((x) => x.verdict !== 'best').map((x) => `${s.id}:${x.decisionId}`)).toEqual([])
      }
    }
  })
  it('runs a full program deterministically for a seed', () => {
    const s = SCENARIOS[0]; const c = bestChoices(s)
    const a = runPhase1(s, c, 42), b = runPhase1(s, c, 42)
    expect(a).toEqual(b)
    const p2 = runPhase2(s, c, a, 42); const p3 = runPhase3(s, c, a, p2, 42)
    const grades = (['p1', 'p2', 'p3'] as const).flatMap((ph) => gradePhase(s, ph, c))
    const r = reviewVerdict(s, c, a, p2, p3, grades, 'FDA', false)
    expect(r.score).toBe(r.maxScore)
    expect(['approvable', 'complete_response', 'provisional', 'terminated', 'refuse_to_file']).toContain(r.verdict)
  })
  it('puts an aggressive first dose on clinical hold', () => {
    const s = SCENARIOS[0]
    expect(runPhase1(s, { ...bestChoices(s), p1_dose: 'aggressive' }, 7).flags).toContain('p1_toxicity_hold')
  })
})
