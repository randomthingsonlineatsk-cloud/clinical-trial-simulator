// Phase 2: the EU clinical trial application (CTR 536/2014, CTIS). The clock is checked day by day.
import { describe, expect, it } from 'vitest'
import { getScenario } from '../src/data/ct-scenarios'
import { runEu, validationFindings, assessmentFindings, canSubmitEu, euChecklist, EMPTY_EU, EMPTY_ANSWERS, PART2_SIMPLE, type EuForm } from '../src/application/eu'
import { bestP1 } from './helpers'
import { IND_MISSIONS } from '../src/application/missions'
import { summariseEu } from '../src/application/EuStep'

const good: EuForm = { ...EMPTY_EU, sponsor: 'Halvern Therapeutics (fictional)', countries: ['DE', 'ES', 'NL'], rms: 'DE', ib: 'full', impd: 'full', gmp: 'mia_qp', label: 'annex6', lowIntervention: false, safety: ['sentinel', 'stagger', 'src', 'stopping', 'site'], icf: 'national', part2: [...PART2_SIMPLE], insurance: { DE: 'national', ES: 'national', NL: 'national' }, category: '1' }
const vas = getScenario('vasclarin')!

describe('EU clock (CTR Articles 5 to 8)', () => {
  it('a complete dossier and a sound design: validated day 10, decided day 60, first subject day 74', () => {
    expect(canSubmitEu(good)).toBe(true)
    const o = runEu(vas, bestP1(vas), good, EMPTY_ANSWERS)
    expect(o.stage).toBe('decided')
    expect(o.events.find((e) => /Validation date/.test(e.text))!.day).toBe(10)
    expect(o.countries.map((c) => [c.code, c.status, c.decisionDay, c.firstPatientDay])).toEqual([['DE', 'authorised', 60, 74], ['ES', 'authorised', 60, 74], ['NL', 'authorised', 60, 74]])
    expect(o.proposed.days).toBe(47)
  })
  it('a validation request and a Part I request answered well: 106 days, the maximum', () => {
    const f = { ...good, part2: good.part2.filter((x) => x !== 'fee'), ib: 'summary' as const }
    expect(validationFindings(f).map((v) => v.id)).toEqual(['v-part2'])
    let o = runEu(vas, bestP1(vas), f, EMPTY_ANSWERS)
    expect(o.stage).toBe('validation')
    o = runEu(vas, bestP1(vas), f, { ...EMPTY_ANSWERS, validation: { 'v-part2': 'provide' } })
    expect(o.stage).toBe('assessment')
    expect(o.events.find((e) => /Validation date/.test(e.text))!.day).toBe(25)
    expect(o.events.find((e) => /Request for information/.test(e.text))!.day).toBe(25 + 26 + 12)
    o = runEu(vas, bestP1(vas), f, { ...EMPTY_ANSWERS, validation: { 'v-part2': 'provide' }, assessment: { ib: 'full' } })
    expect(o.countries.every((c) => c.status === 'authorised' && c.decisionDay === 106)).toBe(true)
    expect(o.proposed.days).toBe(76)
  })
  it('an advanced therapy adds 50 days to Part I', () => {
    const ly = getScenario('lymphacel')!
    const o = runEu(ly, bestP1(ly), good, EMPTY_ANSWERS)
    expect(o.atmp).toBe(true)
    expect(o.countries[0].decisionDay).toBe(10 + 45 + 50 + 5)
  })
  it('a bad answer at validation makes the application lapse; a new one restarts the clock', () => {
    const f = { ...good, gmp: 'none' as const }
    const o = runEu(vas, bestP1(vas), f, { ...EMPTY_ANSWERS, validation: { 'v-gmp': 'later' } })
    expect(o.stage).toBe('lapsed')
    const r = runEu(vas, bestP1(vas), f, { ...EMPTY_ANSWERS, validation: { 'v-gmp': 'later' }, resubmitAll: true })
    expect(r.countries[0].decisionDay).toBe(20 + 14 + 10 + 45 + 5)
  })
  it('one member state refuses on Part II while the others authorise; resubmission there', () => {
    const f = { ...good, insurance: { ...good.insurance, ES: 'global' as const } }
    const fs = assessmentFindings(vas, bestP1(vas), f)
    expect(fs.map((x) => [x.id, x.part, x.country])).toEqual([['ins-ES', 'II', 'ES']])
    const o = runEu(vas, bestP1(vas), f, { ...EMPTY_ANSWERS, assessment: { 'ins-ES': 'keep' } })
    expect(o.countries.map((c) => [c.code, c.status, c.decisionDay])).toEqual([['DE', 'authorised', 60], ['ES', 'refused', 91], ['NL', 'authorised', 60]])
    const r = runEu(vas, bestP1(vas), f, { ...EMPTY_ANSWERS, assessment: { 'ins-ES': 'keep' }, resubmit: ['ES'] })
    expect(r.countries[1]).toMatchObject({ status: 'authorised', decisionDay: 91 + 14 + 60 })
  })
  it('Part I not acceptable: every member state refuses; design weaknesses become Part I questions', () => {
    const tr = getScenario('tregolimab')!
    const c = { ...bestP1(tr), p1_dose: 'noael', p1_escalation: 'accelerated' }
    const fs = assessmentFindings(tr, c, good).filter((x) => x.part === 'I')
    expect(fs.map((x) => x.id)).toEqual(expect.arrayContaining(['dose', 'escalation']))
    const wrong = Object.fromEntries(fs.map((x) => [x.id, x.options.find((o) => o.id !== x.correct)!.id]))
    const o = runEu(tr, c, good, { ...EMPTY_ANSWERS, assessment: wrong })
    expect(o.partIAcceptable).toBe(false)
    expect(o.countries.every((x) => x.status === 'refused')).toBe(true)
    const right = Object.fromEntries(fs.map((x) => [x.id, x.correct]))
    const ok = runEu(tr, c, good, { ...EMPTY_ANSWERS, assessment: right })
    expect(ok.countries.every((x) => x.status === 'authorised')).toBe(true)
    expect(ok.correctedChoices.p1_dose).toBe(tr.startingDoseBasis)
  })
  it('the checklist export names Part I and Part II per member state', () => {
    const x = euChecklist(vas, good, { userId: 'u', classId: null })
    expect(x.partII.map((p) => p.memberState)).toEqual(['Germany', 'Spain', 'Netherlands'])
    expect(x.partI.every((d) => d.provided)).toBe(true)
  })
})

describe('EU missions', () => {
  it('three EU missions; quiz answers are among their options; a clean start-up scores 100', () => {
    const eu = IND_MISSIONS.filter((m) => m.region === 'EU')
    expect(eu.map((m) => m.id)).toEqual(['eu-startup', 'part-i-ii', 'eu-clock'])
    for (const m of eu.filter((x) => x.items)) for (const t of m.items!) expect(t.options).toContain(t.answer)
    const m = eu[0], s = getScenario(m.scenarioId!)!
    const f = { ...good, ...m.euInitial }
    const o = runEu(s, m.design!, f, EMPTY_ANSWERS)
    expect(m.euScore!(summariseEu(o, f, s, m.design!))).toBe(100)
    const weak = { ...f, insurance: { ...f.insurance, NL: 'global' as const }, category: '2' as const }
    const o2 = runEu(s, m.design!, weak, { ...EMPTY_ANSWERS, assessment: { 'ins-NL': 'national' } })
    expect(m.euScore!(summariseEu(o2, weak, s, m.design!))).toBeLessThan(100)
  })
})
