// Phase 1 of the application step: the US IND gate before first patient in.
import { describe, expect, it } from 'vitest'
import { SCENARIOS, getScenario } from '../src/data/ct-scenarios'
import { reviewInd, runReview, canSubmit, indPackage, IND_PARTS, EMPTY_FORM, COMMITMENTS, IB_SECTIONS, IND_PKG_KIND, type IndForm } from '../src/application/ind'
import type { Choices, Scenario } from '../src/data/ct-types'

export function bestP1(s: Scenario): Choices {
  const c: Choices = { p1_dose: s.startingDoseBasis, p1_escalation: s.escalation, p1_population: s.p1Population, p1_n: s.platformGroup.startsWith('vaccine') ? 'medium' : 'small', p1_dlt: 'prespecified' }
  if (s.special) c[s.special.id] = s.special.correctOptionId
  return c
}
export const goodForm: IndForm = { ...EMPTY_FORM, sponsor: 'Halvern Therapeutics (fictional)', commitments: COMMITMENTS.map((c) => c.id), plan: 'year', ibSections: IB_SECTIONS.map((x) => x.id), safety: ['sentinel', 'stagger', 'src', 'stopping', 'site'], label: 'caution', glp: 'statement', form3674: 'not_apply', form1572: true }

describe('IND build and review', () => {
  it('an empty IND cannot be submitted; a complete one can', () => {
    expect(canSubmit(EMPTY_FORM)).toBe(false)
    expect(canSubmit(goodForm)).toBe(true)
    expect(IND_PARTS.map((p) => p.cite).join(' ')).toMatch(/312\.23\(a\)\(1\).*312\.23\(a\)\(9\)/)
  })
  it('a sound design and a complete IND raise no findings in any program: proceed on day 30', () => {
    for (const s of SCENARIOS) {
      const c = bestP1(s)
      expect(reviewInd(s, c, goodForm).map((f) => `${s.id}:${f.id}`)).toEqual([])
      const o = runReview(s, c, goodForm, { requests: {}, cycles: [] })
      expect(o.stage).toBe('proceed'); expect(o.proceedDay).toBe(30); expect(o.firstPatientDay).toBe(44)
    }
  })
  it('a NOAEL start for an immune agonist is a clinical hold under 312.42(b)(1)(i); fixing it lifts the hold', () => {
    const s = getScenario('tregolimab')!
    const c = { ...bestP1(s), p1_dose: 'noael' }
    const f = reviewInd(s, c, goodForm)
    const dose = f.find((x) => x.id === 'dose')!
    expect(dose.kind).toBe('hold'); expect(dose.cite).toBe('21 CFR 312.42(b)(1)(i)'); expect(dose.correct).toBe('mabel')
    const held = runReview(s, c, goodForm, { requests: {}, cycles: [] })
    expect(held.stage).toBe('hold'); expect(held.proceedDay).toBe(-1)
    const wrong = runReview(s, c, goodForm, { requests: {}, cycles: [{ dose: 'noael' }] })
    expect(wrong.stage).toBe('hold'); expect(wrong.holdCycles).toBe(2)
    const fixed = runReview(s, c, goodForm, { requests: {}, cycles: [{ dose: 'mabel' }] })
    expect(fixed.stage).toBe('proceed'); expect(fixed.proceedDay).toBe(95); expect(fixed.correctedChoices.p1_dose).toBe('mabel')
  })
  it('an incomplete brochure is a hold under 312.42(b)(1)(iii); missing safety measures for a high-risk agent are a hold', () => {
    const s = getScenario('lymphacel')!
    const f = reviewInd(s, bestP1(s), { ...goodForm, ibSections: ['description'], safety: ['stopping'] })
    expect(f.find((x) => x.id === 'ib')!.cite).toBe('21 CFR 312.42(b)(1)(iii)')
    expect(f.find((x) => x.id === 'safety')!.kind).toBe('hold')
  })
  it('information requests: label statement, GLP, CRO obligations, Form 3674; a wrong answer becomes a hold', () => {
    const s = getScenario('vasclarin')!
    const form = { ...goodForm, label: 'rx', glp: 'none' as const, cro: 'not_listed' as const, form3674: 'apply' as const }
    const f = reviewInd(s, bestP1(s), form)
    expect(f.filter((x) => x.kind === 'request').map((x) => x.id).sort()).toEqual(['3674', 'cro', 'glp', 'label'])
    const pending = runReview(s, bestP1(s), form, { requests: {}, cycles: [] })
    expect(pending.stage).toBe('requests')
    const good = runReview(s, bestP1(s), form, { requests: { label: 'caution', glp: 'statement', cro: 'listed', '3674': 'not_apply' }, cycles: [] })
    expect(good.stage).toBe('proceed')
    const bad = runReview(s, bestP1(s), form, { requests: { label: 'rx', glp: 'statement', cro: 'listed', '3674': 'not_apply' }, cycles: [] })
    expect(bad.stage).toBe('hold'); expect(bad.openHolds.map((h) => h.id)).toEqual(['label'])
  })
  it('the eCTD package places the IND in the US Module 1 and Module 5 nodes', () => {
    const s = getScenario('vasclarin')!
    const p = indPackage(s, bestP1(s), goodForm, { userId: 'u', classId: null })
    expect(p.kind).toBe(IND_PKG_KIND)
    const nodes = p.documents.map((d) => d.section)
    for (const n of ['1.1', '1.2', '1.20', '1.14.4.1', '1.14.4.2', '5.3.3.1', '2.3', '2.4']) expect(nodes).toContain(n)
    const k = indPackage(getScenario('kestrenib')!, bestP1(getScenario('kestrenib')!), goodForm, { userId: 'u', classId: null })
    expect(k.documents.map((d) => d.section)).toContain('5.3.3.2')
    expect(p.documents.filter((d) => 'form' in d).map((d) => (d as { form: string }).form)).toEqual(['fda-1571', 'fda-1572', 'fda-3674'])
  })
})

import { IND_MISSIONS } from '../src/application/missions'
import { summarise } from '../src/application/IndStep'
describe('IND missions', () => {
  it('four missions; the clean IND scores 100 with a complete IND; the hold mission starts on hold and scores 100 after one correct response', () => {
    expect(IND_MISSIONS).toHaveLength(4)
    const clean = IND_MISSIONS[0], hold = IND_MISSIONS[1]
    const s1 = getScenario(clean.scenarioId!)!
    const o1 = runReview(s1, clean.design!, goodForm, { requests: {}, cycles: [] })
    expect(clean.score!(summarise(o1, clean.design!))).toBe(100)
    const s2 = getScenario(hold.scenarioId!)!
    const first = runReview(s2, hold.design!, goodForm, { requests: {}, cycles: [] })
    expect(first.openHolds.map((h) => h.id).sort()).toEqual(['dose', 'escalation'])
    const fixed = runReview(s2, hold.design!, goodForm, { requests: {}, cycles: [Object.fromEntries(first.openHolds.map((h) => [h.id, h.correct]))] })
    expect(hold.score!(summarise(fixed, hold.design!))).toBe(100)
    expect(summarise(fixed, hold.design!).corrected.sort()).toEqual(['p1_dose', 'p1_escalation'])
  })
  it('quiz answers are among the options', () => {
    for (const m of IND_MISSIONS.filter((x) => x.kind === 'quiz')) for (const i of m.items!) expect(i.options).toContain(i.answer)
  })
})
