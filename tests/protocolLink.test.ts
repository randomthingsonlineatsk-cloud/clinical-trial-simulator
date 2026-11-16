import { describe, expect, test } from 'vitest'
import bundleText from './fixtures/hrp301-application-bundle.json?raw'
import { readBundle, routeFor, bundleIndPackage, designFile, DESIGN_KIND } from '../src/application/protocolLink'
import { SCENARIOS } from '../src/data/ct-scenarios'

const bundle = readBundle(bundleText)
describe('protocol bundle from the Protocol Builder', () => {
  test('opens, and refuses other files', () => {
    expect(bundle.protocol.id).toBe('HRP-301')
    expect(() => readBundle('{"format":"x"}')).toThrow(/not an application bundle/)
  })
  test('US: an amendment to the IND, ready, with the protocol in Module 5', () => {
    const r = routeFor(bundle, 'US')
    expect(r.route).toMatch(/312\.30\(b\)/); expect(r.ready).toBe(true)
    expect(r.places.find((x) => x.what.startsWith('Protocol'))?.where).toBe('eCTD 5.3.5.1')
    const pkg = bundleIndPackage(bundle, { userId: 'u', classId: null })
    expect(pkg.kind).toBe('clinical-trial-simulator/ind-package')
    expect(pkg.submission).toMatchObject({ submissionType: 'original-application', subType: 'amendment' })
    expect(pkg.documents.map((d) => d.section)).toEqual(['1.1', '1.1', '1.2', '5.3.5.1'])
  })
  test('EU and India: the route and the region’s cross-walk', () => {
    expect(routeFor(bundle, 'EU').route).toMatch(/Substantial modification/)
    expect(routeFor(bundle, 'EU').crosswalk?.id).toBe('ctr')
    expect(routeFor(bundle, 'IN').route).toMatch(/Third Schedule 1\(v\)/)
  })
  test('a draft or a protocol with gaps is not ready', () => {
    const b = structuredClone(bundle); b.protocol.status = 'draft'
    expect(routeFor(b, 'US').ready).toBe(false)
    const g = structuredClone(bundle); g.crosswalks.find((c) => c.id === 'ndct')!.gaps.push({ id: '15', text: 'Undertaking', hint: '', m11: ['12.2'] })
    expect(routeFor(g, 'IN').ready).toBe(false); expect(routeFor(g, 'US').ready).toBe(true)
  })
})
describe('design file for the Protocol Builder', () => {
  test('carries the scenario, the phase 2 and 3 choices and their labels', () => {
    const s = SCENARIOS[0]
    const f = designFile(s, { p1_dose: 'mabel', p2_comparator: 'placebo', p3_design: 'superiority' }, { userId: 'u', classId: null })
    expect(f.kind).toBe(DESIGN_KIND); expect(f.phase).toBe('p2')
    expect(Object.keys(f.choices)).toEqual(['p2_comparator', 'p3_design'])
    expect(f.labels.p3_design).toBe('Superiority')
  })
})
