// Phase 3: India (NDCT Rules, 2019), changes during the trial, safety reporting and compensation.
import { describe, expect, it } from 'vitest'
import { getScenario } from '../src/data/ct-scenarios'
import { runIndia, inFindings, deathComp, disabilityComp, injuryComp, cal, EMPTY_IN, EMPTY_IN_ANSWERS, SECOND_SCHEDULE, type InForm } from '../src/application/india'
import { CHANGES, US_OPTS, EU_OPTS, IN_OPTS, SAFETY_RULES } from '../src/application/amend'
import { IND_MISSIONS } from '../src/application/missions'
import { summariseIndia } from '../src/application/IndiaStep'
import { bestP1 } from './helpers'

const good: InForm = { ...EMPTY_IN, sponsor: 'Halvern Therapeutics (fictional)', discovery: 'abroad', docs: SECOND_SCHEDULE.map((d) => d.id), icf: 'english_local', av: true, ec: 'registered', ctri: 'before', compensation: true, safety: ['sentinel', 'stagger', 'src', 'stopping', 'site'] }
const vas = getScenario('vasclarin')!
const day = (o: ReturnType<typeof runIndia>, re: RegExp) => o.events.find((e) => re.test(e.text))!.wd

describe('India clock in working days', () => {
  it('a drug discovered abroad, no queries: CT-06 at 90 working days, first participant at 105', () => {
    const o = runIndia(vas, bestP1(vas), good, EMPTY_IN_ANSWERS)
    expect(o.findings).toEqual([])
    expect(day(o, /Form CT-06/)).toBe(90)
    expect(o.permitDay).toBe(cal(90))
    expect(o.firstPatientDay).toBe(cal(105))
    expect(cal(105)).toBe(147)
  })
  it('a drug discovered in India: deemed permission after 30 working days (rule 23)', () => {
    const o = runIndia(vas, bestP1(vas), { ...good, discovery: 'india' }, EMPTY_IN_ANSWERS)
    expect(o.deemed).toBe(true)
    expect(day(o, /deemed granted/)).toBe(30)
    expect(o.firstPatientDay).toBe(cal(45))
  })
  it('a query pauses the clock; a bad answer means rejection, then reconsideration', () => {
    const f = { ...good, compensation: false }
    expect(inFindings(vas, bestP1(vas), f).map((x) => x.id)).toEqual(['comp'])
    expect(runIndia(vas, bestP1(vas), f, EMPTY_IN_ANSWERS).stage).toBe('queries')
    const ok = runIndia(vas, bestP1(vas), f, { ...EMPTY_IN_ANSWERS, queries: { comp: 'give' } })
    expect(day(ok, /Form CT-06/)).toBe(30 + 15 + 60)
    const bad = runIndia(vas, bestP1(vas), f, { ...EMPTY_IN_ANSWERS, queries: { comp: 'insurance' } })
    expect(bad.stage).toBe('rejected')
    const re = runIndia(vas, bestP1(vas), f, { queries: { comp: 'insurance' }, reconsider: true })
    expect(day(re, /On reconsideration/)).toBe(105 + 10 + 30)
  })
  it('an unregistered ethics committee or late CTRI registration blocks the first participant; fixing it late costs time', () => {
    const o = runIndia(vas, bestP1(vas), { ...good, ec: 'unregistered', ctri: 'after' }, EMPTY_IN_ANSWERS)
    expect(o.firstPatientDay).toBe(-1)
    expect(o.blocked).toHaveLength(2)
    const fixed = runIndia(vas, bestP1(vas), { ...good, ec: 'unregistered', ctri: 'after' }, { ...EMPTY_IN_ANSWERS, fixLate: true })
    expect(fixed.blocked).toEqual([])
    expect(fixed.firstPatientDay).toBe(cal(120))
  })
  it('design weaknesses become Subject Expert Committee queries, and correct answers change the protocol', () => {
    const tr = getScenario('tregolimab')!
    const c = { ...bestP1(tr), p1_dose: 'noael' }
    const f = inFindings(tr, c, good)
    expect(f.map((x) => x.id)).toContain('dose')
    const o = runIndia(tr, c, good, { ...EMPTY_IN_ANSWERS, queries: Object.fromEntries(f.map((x) => [x.id, x.correct])) })
    expect(o.correctedChoices.p1_dose).toBe(tr.startingDoseBasis)
  })
})

describe('compensation (Seventh Schedule)', () => {
  it('death, permanent disability and non-permanent injury', () => {
    expect(deathComp(30, 4)).toBe(6697555)
    expect(deathComp(65, 1)).toBe(800000)
    expect(disabilityComp(deathComp(30, 4), 40)).toBe(2411120)
    expect(disabilityComp(1000000, 100)).toBe(900000)
    expect(injuryComp(800, 6)).toBe(9600)
  })
})

describe('changes and safety reporting', () => {
  it('every change has a valid answer for each region; deadlines are listed for each region', () => {
    expect(CHANGES).toHaveLength(6)
    for (const c of CHANGES) { expect(US_OPTS).toContain(c.us); expect(EU_OPTS).toContain(c.eu); expect(IN_OPTS).toContain(c.in) }
    expect(new Set(CHANGES.map((c) => c.eu)).size).toBe(4)
    expect(SAFETY_RULES.filter((r) => r.region === 'US').map((r) => r.deadline)).toEqual(['7 days', '15 days'])
    expect(SAFETY_RULES.filter((r) => r.region === 'IN').map((r) => r.deadline)).toEqual(['24 hours', '14 days', '30 days', '90 days'])
  })
})

describe('Phase 3 missions', () => {
  it('three missions: a clean India application scores 100; quiz answers are among their options', () => {
    const ms = IND_MISSIONS.filter((m) => ['india-cta', 'india-safety', 'amendments'].includes(m.id))
    expect(ms.map((m) => m.id)).toEqual(['india-cta', 'india-safety', 'amendments'])
    for (const m of ms.filter((x) => x.items)) for (const t of m.items!) expect(t.options, t.id).toContain(t.answer)
    const m = ms[0], s = getScenario(m.scenarioId!)!
    expect(m.inScore!(summariseIndia(runIndia(s, m.design!, good, EMPTY_IN_ANSWERS), m.design!))).toBe(100)
    expect(m.inScore!(summariseIndia(runIndia(s, m.design!, { ...good, compensation: false }, { ...EMPTY_IN_ANSWERS, queries: { comp: 'give' } }), m.design!))).toBeLessThan(100)
  })
})
