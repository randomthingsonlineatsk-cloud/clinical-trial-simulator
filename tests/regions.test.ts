// Phase 4: the UK, Canada, Australia, Japan and China packs; missions; certificate.
import { describe, expect, it } from 'vitest'
import { getScenario } from '../src/data/ct-scenarios'
import { CT_PACKS, runRegion, regionFindings, type RegionForm } from '../src/application/regions'
import { IND_MISSIONS } from '../src/application/missions'
import { certCode } from '../src/application/IndMissions'
import { bestP1 } from './helpers'

const vas = getScenario('vasclarin')!
const pack = (id: string) => CT_PACKS.find((p) => p.id === id)!
const good = (id: string, route?: string): RegionForm => { const p = pack(id); return { route: route ?? p.routes[0].id, docs: p.docs.map((d) => d.id), trap: p.trap.correct, safety: ['sentinel', 'stagger', 'src', 'stopping', 'site'] } }
const fpi = (id: string, route?: string) => runRegion(pack(id), vas, bestP1(vas), good(id, route), null).firstPatientDay

describe('clocks for a clean application', () => {
  it('UK 7 + 30 days; Canada 30; Australia CTN after HREC and governance, CTA after TGA evaluation; Japan 30; China 60 working days', () => {
    expect(fpi('UK')).toBe(7 + 30 + 14)
    expect(fpi('UK', 'notifiable')).toBe(7 + 7 + 30 + 14)
    expect(fpi('CA')).toBe(30 + 14)
    expect(fpi('AU', 'ctn')).toBe(30 + 14 + 14)
    expect(fpi('AU', 'cta')).toBe(30 + 70 + 14)
    expect(fpi('JP')).toBe(30 + 14)
    expect(fpi('CN', 'standard')).toBe(84 + 14)
    expect(fpi('CN', 'expedited')).toBe(84 + 14)
  })
})

describe('questions, objections and blocks', () => {
  it('missing documents and design weaknesses become questions; a wrong answer is an objection; resubmission fixes it', () => {
    const tr = getScenario('tregolimab')!
    const c = { ...bestP1(tr), p1_dose: 'noael' }
    const f = good('CA')
    const fs = regionFindings(pack('CA'), tr, c, f)
    expect(fs.map((x) => x.id)).toContain('dose')
    expect(runRegion(pack('CA'), tr, c, f, null).stage).toBe('questions')
    const wrong = Object.fromEntries(fs.map((x) => [x.id, x.options.find((o) => o.id !== x.correct)!.id]))
    const o = runRegion(pack('CA'), tr, c, f, wrong)
    expect(o.objection).toBe(true)
    const r = runRegion(pack('CA'), tr, c, f, wrong, true)
    expect(r.firstPatientDay).toBe(30 + 21 + 30 + 14)
    expect(r.correctedChoices.p1_dose).toBe(tr.startingDoseBasis)
  })
  it('each region’s trap blocks the first participant', () => {
    for (const p of CT_PACKS) {
      const f = { ...good(p.id), trap: p.trap.options.find((o) => o.id !== p.trap.correct)!.id }
      const o = runRegion(p, vas, bestP1(vas), f, null)
      expect(o.firstPatientDay, p.id).toBe(-1)
      expect(o.problems[0], p.id).toBe(p.trap.problem)
    }
  })
})

describe('missions and certificate', () => {
  it('twelve missions; the five-region mission scores 100 when clean; the code is stable', () => {
    expect(IND_MISSIONS).toHaveLength(12)
    const m = IND_MISSIONS.find((x) => x.id === 'five-regions')!
    const outs = CT_PACKS.map((p) => runRegion(p, vas, m.design!, good(p.id), null))
    expect(m.regionsScore!({ summaries: outs.map((o) => ({ code: o.code, name: o.code, authorisedDay: o.authorisedDay, firstPatientDay: o.firstPatientDay, questions: o.findings.length, objection: o.objection, problems: o.problems })), rows: [] })).toBe(100)
    for (const q of IND_MISSIONS.filter((x) => x.items)) for (const t of q.items!) expect(t.options, t.id).toContain(t.answer)
    expect(certCode('u', 'Khan', '2026-10-20', ['a'])).toMatch(/^CTS-[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(certCode('u', ' khan', '2026-10-20', ['a'])).toBe(certCode('u', 'Khan', '2026-10-20', ['a']))
  })
})
