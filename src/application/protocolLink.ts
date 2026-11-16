// Links to the Protocol Builder (a separate app).
//   1. The design file: the scenario and the learner's phase 2 and phase 3 choices, which the
//      Protocol Builder turns into the first draft of a protocol (title page and sections 1 to 5
//      and 10). Keep in step with protocol-builder/src/domain/simulator.ts (schema 1).
//   2. The application bundle the Protocol Builder exports: a written protocol with its synopsis,
//      cross-walk results and, for an amendment, the summary of changes and cover notes. The
//      trial application step reads it and shows where each part goes in the US, EU and India.
import type { Choices, Scenario } from '../data/ct-types'
import { buildDecisions } from '../data/ct-decisions'

export const DESIGN_KIND = 'clinical-trial-simulator/design'
export function designFile(s: Scenario, c: Choices, user: { userId: string; classId: string | null }) {
  const labels: Record<string, string> = {}
  for (const ph of ['p2', 'p3'] as const) for (const d of buildDecisions(s, ph)) { const o = d.options.find((x) => x.id === c[d.id]); if (o) labels[d.id] = o.label }
  return {
    kind: DESIGN_KIND, schema: 1, createdAt: new Date().toISOString(), userId: user.userId, classId: user.classId,
    notice: 'Training only. Fictional product and trial.',
    phase: c.p3_endpoint ? 'p3' : 'p2',
    scenario: { code: s.code, drug: s.drug, modality: s.modality, indication: s.indication, area: s.area, moa: s.moa, preclinical: s.preclinical, known: s.known, unknown: s.unknown, soc: s.soc, socExists: s.socExists, surrogate: s.surrogate },
    choices: Object.fromEntries(Object.entries(c).filter(([k]) => k.startsWith('p2_') || k.startsWith('p3_'))),
    labels,
  }
}

export const BUNDLE_FORMAT = 'protocol-builder-application-bundle'
export type Region = 'US' | 'EU' | 'IN'
export interface Gap { id: string; text: string; hint: string; m11: string[] }
export interface Bundle {
  format: typeof BUNDLE_FORMAT; schema: number; exportedUtc: string; learner: { userId: string; classId: string }
  protocol: { id: string; title: string; shortTitle: string; acronym: string; phase: string; version: string; versionDate: string; status: string; product: string; productCode: string; sponsor: string; indNumber: string; euCtNumber: string; ctriNumber: string; nctNumber: string; countries: string; participants: number; healthy: boolean; committees: string }
  synopsis: string
  crosswalks: { id: 'spirit' | 'ctr' | 'ndct' | 'ind'; name: string; pct: number; covered: number; scored: number; gaps: Gap[] }[]
  consistency: { high: number; medium: number; low: number; highOpen: number }
  usdm: { version: string; errors: number; warnings: number }
  amendment: null | { identifier: string; scope: string; primaryReason: string; summary: string; safetyRights: string; dataImpact: string; changes: { sections: string[]; description: string; rationale: string; kind: string; classification: Record<Region, string> }[]; coverNotes: Partial<Record<Region, string>> }
  documents: { protocolHtml: string }
}
export function readBundle(text: string): Bundle {
  let j: Bundle
  try { j = JSON.parse(text) } catch { throw new Error('The file is not JSON.') }
  if (j?.format !== BUNDLE_FORMAT || !j.protocol || !Array.isArray(j.crosswalks)) throw new Error('This is not an application bundle from the Protocol Builder. Export one there: Export, Application bundle.')
  if ((j.schema ?? 1) > 1) throw new Error('This bundle was made by a newer version of the Protocol Builder.')
  return j
}

export interface Place { what: string; where: string; note?: string }
export interface Route { region: Region; title: string; basis: string; route: string; places: Place[]; checks: { label: string; ok: boolean; detail: string }[]; crosswalk: Bundle['crosswalks'][number] | undefined; ready: boolean }

/** Where the protocol goes in each region, and what stops it going. */
export function routeFor(b: Bundle, region: Region): Route {
  const p = b.protocol, a = b.amendment, phase1 = /phase 1\b/i.test(p.phase) && !/phase 1\/phase 2/i.test(p.phase)
  const cw = b.crosswalks.find((c) => c.id === (region === 'US' ? 'ind' : region === 'EU' ? 'ctr' : 'ndct'))
  const base = [
    { label: 'No high consistency findings', ok: b.consistency.highOpen === 0, detail: `${b.consistency.highOpen} high finding(s) open in the Protocol Builder` },
    { label: 'Protocol approved by the sponsor', ok: p.status === 'approved', detail: p.status === 'approved' ? `Version ${p.version} approved` : `Version ${p.version} is still a draft: approve it in the Protocol Builder (Versions and amendments) before submitting` },
    { label: `Content required by ${cw?.name ?? 'the region'}`, ok: !!cw && cw.gaps.length === 0, detail: cw ? (cw.gaps.length ? `${cw.gaps.length} gap(s): ${cw.gaps.map((g) => g.id).join(', ')}` : `All ${cw.scored} applicable items covered`) : 'No cross-walk in the bundle' },
  ]
  if (region === 'US') {
    const node = phase1 ? (p.healthy ? '5.3.3.1' : '5.3.3.2') : '5.3.5.1'
    const route = a ? 'Protocol amendment: change in protocol, 21 CFR 312.30(b). Submitted to FDA and approved by the IRB before it is implemented (except to remove an immediate hazard).'
      : p.indNumber ? 'Protocol amendment: new protocol, 21 CFR 312.30(a), to the existing IND. The study may begin once the protocol is submitted to FDA and the IRB has approved it.' : 'Original IND (21 CFR 312.23): the protocol is item (a)(6).'
    const checks = [...base, { label: 'An IND number', ok: !!p.indNumber, detail: p.indNumber ? `IND ${p.indNumber}` : 'No IND number on the title page' }, { label: 'ClinicalTrials.gov certification (Form FDA 3674)', ok: phase1 || !!p.nctNumber, detail: phase1 ? 'Phase 1: 42 U.S.C. 282(j) does not apply' : p.nctNumber ? `Registered as ${p.nctNumber}` : 'An applicable clinical trial needs registration and Form FDA 3674' }]
    return { region, title: 'United States: IND', basis: '21 CFR 312.23(a)(6) and 312.30', route, crosswalk: cw, ready: checks.every((c) => c.ok), checks,
      places: [
        { what: 'Form FDA 1571', where: 'eCTD 1.1', note: 'With every IND submission' },
        { what: a ? 'Cover letter with the summary of changes' : 'Cover letter', where: 'eCTD 1.2', note: a?.coverNotes.US ? 'Drafted in the bundle' : undefined },
        ...(phase1 ? [] : [{ what: 'Form FDA 3674', where: 'eCTD 1.1' }]),
        { what: `Protocol ${p.id} version ${p.version}${a ? ' (amended, with changes shown)' : ''}`, where: `eCTD ${node}`, note: phase1 ? 'Phase 1 study' : 'Controlled study for the claimed indication' },
        { what: 'Form FDA 1572 for each investigator', where: 'eCTD 1.1 (or kept by the sponsor and listed)', note: 'Investigators added later: within 30 days (312.30(c))' },
      ] }
  }
  if (region === 'EU') {
    const route = a ? 'Substantial modification through CTIS (Articles 15 to 24): Part I by the reporting Member State with the others, Part II by each Member State concerned. Non-substantial changes are recorded, and notified where relevant (Article 81(9)).' : 'Initial clinical trial application through CTIS (Article 5): Part I assessed jointly, Part II by each Member State concerned.'
    const checks = [...base, { label: 'EU CT number', ok: !!p.euCtNumber, detail: p.euCtNumber ? p.euCtNumber : 'CTIS gives the EU CT number when the application is created; put it on the title page (Annex I 15(b))' }, { label: 'Data monitoring committee charter, if there is a committee', ok: true, detail: p.committees ? `${p.committees}: attach the charter (Annex I 23)` : 'No committee named' }]
    return { region, title: 'European Union: CTA in CTIS', basis: 'Regulation (EU) No 536/2014, Annex I', route, crosswalk: cw, ready: checks.every((c) => c.ok), checks,
      places: [
        { what: 'Cover letter', where: 'CTIS Part I (Annex I section B)', note: a ? 'For a modification: reasons and a summary (Annex II)' : undefined },
        { what: 'Protocol and synopsis', where: 'CTIS Part I (Annex I section D, paragraphs 15 to 24)' },
        ...(a ? [{ what: 'Amended protocol with changes highlighted, and the table of changes', where: 'CTIS Part I (Annex II)' }] : []),
        { what: "Investigator's brochure", where: 'CTIS Part I (Annex I section E)' },
        { what: 'Recruitment arrangements, consent forms, site suitability, investigator CVs', where: 'CTIS Part II (Annex I sections K to N)' },
      ] }
  }
  const route = a ? 'Amendment to the Central Licencing Authority (Third Schedule 1(v)): prior written approval of the ethics committee and CDSCO, except administrative, logistic or minor changes (notified within 30 days) and changes to remove an immediate hazard (notified at once) (1(vi)).' : 'Application for permission to conduct a clinical trial: Form CT-04 through SUGAM, with the protocol in the format of the Third Schedule, Table 2.'
  const checks = [...base, { label: 'Registered in CTRI before the first participant', ok: !!p.ctriNumber, detail: p.ctriNumber ? p.ctriNumber : 'Register the trial in the Clinical Trials Registry of India' }]
  return { region, title: 'India: CDSCO', basis: 'New Drugs and Clinical Trials Rules 2019', route, crosswalk: cw, ready: checks.every((c) => c.ok), checks,
    places: [
      { what: a ? 'Amendment letter with the summary of changes' : 'Form CT-04 (application for permission)', where: 'SUGAM portal', note: a?.coverNotes.IN ? 'Drafted in the bundle' : undefined },
      { what: 'Protocol in the Table 2 order', where: 'With the application (Third Schedule, Table 2)' },
      { what: 'Ethics committee approval (or the application to it)', where: 'With the application' },
      { what: 'Investigator undertaking (Table 4) for each investigator', where: 'With the application' },
    ] }
}

/** Documents for the eCTD Dossier Builder's IND import (kind and schema of ind.ts indPackage). */
export function bundleIndPackage(b: Bundle, user: { userId: string; classId: string | null }) {
  const r = routeFor(b, 'US'), p = b.protocol, a = b.amendment
  const node = r.places.find((x) => x.what.startsWith('Protocol'))!.where.replace('eCTD ', '')
  const doc = (section: string, title: string, fileName: string, content: string) => ({ section, title, fileName, content, ...(/^fda-\d{4}\.pdf$/.test(fileName) ? { form: fileName.replace('.pdf', '') } : {}) })
  return {
    kind: 'clinical-trial-simulator/ind-package', schema: 1, createdAt: new Date().toISOString(), userId: user.userId, classId: user.classId,
    notice: 'Training only. Fictional product, sponsor and trial.', region: 'US',
    product: { drug: p.product, code: p.productCode, modality: '', indication: '' }, sponsor: p.sponsor,
    submission: { submissionType: 'original-application', subType: 'amendment', description: a ? `Protocol amendment: change in protocol ${p.id} (amendment ${a.identifier})` : `Protocol amendment: new protocol ${p.id}` },
    documents: [
      doc('1.1', 'Form FDA 1571 Investigational New Drug Application', 'fda-1571.pdf', `Sponsor: ${p.sponsor}\nIND: ${p.indNumber}\nContents: protocol amendment (${a ? 'change in protocol' : 'new protocol'})`),
      ...(/phase 1\b/i.test(p.phase) ? [] : [doc('1.1', 'Form FDA 3674 Certification of Compliance', 'fda-3674.pdf', `Applicable clinical trial registered as ${p.nctNumber || '(not yet registered)'}.`)]),
      doc('1.2', a ? `Cover letter: protocol amendment ${a.identifier}` : 'Cover letter: new protocol', 'cover-letter.pdf', a?.coverNotes.US ?? `${p.sponsor} submits protocol ${p.id} (${p.title}) as a new protocol to IND ${p.indNumber} under 21 CFR 312.30(a).`),
      doc(node, `Protocol ${p.id} version ${p.version}`, `${p.id.toLowerCase()}-protocol-v${p.version}.pdf`, `${b.synopsis}`),
    ],
  }
}
