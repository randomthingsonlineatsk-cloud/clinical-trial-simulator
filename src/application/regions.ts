// Phase 4: clinical trial applications in the UK, Canada, Australia, Japan and China. Each pack
// names its route, its documents, one rule that often trips sponsors, and its clock. Reviewer
// questions come from the Phase I design, as for the US, EU and India.
import { buildDecisions, p1SizeBand } from '../data/ct-decisions'
import { gradePhase } from '../data/ct-engine'
import type { Choices, Scenario } from '../data/ct-types'
import { SAFETY_OPTIONS } from './ind'

export type RegionCode = 'UK' | 'CA' | 'AU' | 'JP' | 'CN'
export interface Opt { id: string; label: string }
export interface CtPack {
  id: RegionCode
  name: string
  regulation: string
  reviewer: string
  routes: (Opt & { note: string })[]
  docs: { id: string; title: string }[]
  trap: { prompt: string; options: Opt[]; correct: string; problem: string; cite: string }
  cite: string
}

export const CT_PACKS: CtPack[] = [
  {
    id: 'UK', name: 'United Kingdom', regulation: 'Medicines for Human Use (Clinical Trials) Regulations 2004, as amended (new provisions in force 28 April 2026)', reviewer: 'MHRA and a research ethics committee, in one combined review through IRAS', cite: 'UK clinical trials regulations',
    routes: [
      { id: 'combined', label: 'Combined review (MHRA and research ethics committee)', note: 'Validation in 7 days; a decision within 30 days; if more information is needed, up to 60 days to answer and a decision within 10 days.' },
      { id: 'notifiable', label: 'Notifiable scheme (lowest-risk trials, decided in 14 days)', note: 'Only for the lowest-risk trials, such as phase 3 and 4 trials of products with no significant safety concerns. A first-in-human trial is not eligible.' },
    ],
    docs: [{ id: 'iras', title: 'IRAS application form' }, { id: 'protocol', title: 'Protocol' }, { id: 'ib', title: "Investigator's brochure" }, { id: 'impd', title: 'IMP dossier' }, { id: 'pis', title: 'Participant information sheet and consent form' }, { id: 'insurance', title: 'Insurance or indemnity confirmation' }],
    trap: { prompt: 'When must the trial be registered in a public registry?', options: [{ id: 'before', label: 'Before the first participant is recruited, or within 90 days of approval, whichever is sooner' }, { id: 'results', label: 'With the results, within 12 months of the end of the trial' }], correct: 'before', problem: 'Registration is a legal requirement: before the first participant, or within 90 days of approval, whichever is sooner.', cite: 'UK clinical trials regulations (2026), transparency' },
  },
  {
    id: 'CA', name: 'Canada', regulation: 'Food and Drug Regulations, Part C, Division 5', reviewer: 'Health Canada; a research ethics board (REB) at each site', cite: 'C.05.006',
    routes: [{ id: 'cta', label: 'Clinical trial application (CTA)', note: 'If Health Canada sends no objection within 30 days, the trial may proceed (C.05.006); it usually issues a no objection letter.' }],
    docs: [{ id: 'protocol', title: 'Protocol' }, { id: 'risk', title: 'Statement of risks and anticipated benefits for the consent form' }, { id: 'attest', title: 'Clinical trial attestation, signed by the senior medical or scientific officer in Canada' }, { id: 'ib', title: "Investigator's brochure" }, { id: 'cmc', title: 'Chemistry and manufacturing information (no drug identification number yet)' }, { id: 'dates', title: 'Proposed start date at each site' }],
    trap: { prompt: 'When can the drug be shipped to a site?', options: [{ id: 'reb', label: 'After the 30-day period, once that site’s REB has approved and its site information has been filed' }, { id: 'nol', label: 'As soon as the no objection letter arrives; the REB can approve later' }], correct: 'reb', problem: 'Each site needs REB approval, and its site information filed with Health Canada, before the drug is sold or imported for it (C.05.006, C.05.010).', cite: 'C.05.006(1)(b) and (c); C.05.010(d)' },
  },
  {
    id: 'AU', name: 'Australia', regulation: 'Therapeutic Goods Act 1989: CTN and CTA schemes', reviewer: 'A human research ethics committee (HREC); the TGA only under the CTA scheme', cite: 'TGA clinical trial schemes',
    routes: [
      { id: 'ctn', label: 'CTN scheme: notify the TGA after HREC approval; the TGA does not review the data', note: 'The sponsor and the HREC carry the scientific and safety review; the site also gives governance authorisation.' },
      { id: 'cta', label: 'CTA scheme: the TGA evaluates the product before the trial starts', note: 'Used for products with high uncertainty about safety; TGA evaluation adds weeks (indicative 50 working days).' },
    ],
    docs: [{ id: 'protocol', title: 'Protocol' }, { id: 'ib', title: "Investigator's brochure" }, { id: 'pics', title: 'Participant information and consent form' }, { id: 'hrec', title: 'HREC application' }, { id: 'governance', title: 'Site governance (research governance) application' }],
    trap: { prompt: 'Under the CTN scheme, when is the TGA notified?', options: [{ id: 'before', label: 'After HREC approval and before the product is supplied in the trial' }, { id: 'after', label: 'After the first participant is dosed' }], correct: 'before', problem: 'The CTN is what makes the supply of an unapproved product lawful: it must be in place before the product is supplied.', cite: 'Therapeutic Goods Regulations 1990 (CTN scheme)' },
  },
  {
    id: 'JP', name: 'Japan', regulation: 'PMD Act; GCP ministerial ordinance', reviewer: 'MHLW, with PMDA reviewing the clinical trial notification; an IRB at each site', cite: 'PMD Act, article 80-2',
    routes: [{ id: 'ctn', label: 'Clinical trial notification (chiken todoke)', note: 'For the first notification of a product, PMDA has 30 days to review before the trial may start.' }],
    docs: [{ id: 'ctn', title: 'Clinical trial notification form' }, { id: 'protocol', title: 'Protocol' }, { id: 'ib', title: "Investigator's brochure" }, { id: 'icf', title: 'Informed consent form in Japanese' }, { id: 'caretaker', title: 'In-country clinical caretaker (for a sponsor without a base in Japan)' }],
    trap: { prompt: 'Can the site agreement be signed and the first participant dosed during PMDA’s 30-day review?', options: [{ id: 'wait', label: 'No: wait until the 30 days end with no objection, and the IRB has approved' }, { id: 'go', label: 'Yes, if the IRB has approved' }], correct: 'wait', problem: 'For a first notification, the trial cannot start until PMDA’s 30-day review has ended.', cite: 'PMD Act, article 80-2' },
  },
  {
    id: 'CN', name: 'China', regulation: 'Drug Administration Law; Provisions for Drug Registration', reviewer: 'NMPA’s Center for Drug Evaluation (CDE); an ethics committee at each site', cite: 'Provisions for Drug Registration, article 23',
    routes: [
      { id: 'standard', label: 'Standard clinical trial application: approval is implied after 60 working days without objection', note: 'If the CDE raises no objection or question within 60 working days of acceptance, the trial may start.' },
      { id: 'expedited', label: 'Expedited 30-working-day track (NMPA Announcement No. 86 of 2025)', note: 'For priority innovative drugs and some global, paediatric and rare-disease programmes; if the CDE needs more time it says so within 20 working days and the 60-day track applies.' },
    ],
    docs: [{ id: 'application', title: 'Clinical trial application' }, { id: 'protocol', title: 'Protocol' }, { id: 'ib', title: "Investigator's brochure" }, { id: 'cmc', title: 'Pharmaceutical (CMC) data' }, { id: 'nonclinical', title: 'Pharmacology and toxicology data' }, { id: 'agent', title: 'Agent in China for an overseas applicant' }],
    trap: { prompt: 'Blood samples will be sent to the sponsor’s laboratory outside China. What is needed?', options: [{ id: 'hgr', label: 'Approval or filing for human genetic resources, run in parallel with the CDE review' }, { id: 'none', label: 'Nothing beyond the CDE approval and ethics committee approval' }], correct: 'hgr', problem: 'Human genetic resources leaving China need approval or filing (administered by the National Health Commission since May 2024).', cite: 'Regulations on the Administration of Human Genetic Resources' },
  },
]

export interface RegionForm { route: string; docs: string[]; trap: string; safety: string[] }
export const emptyRegionForm = (p: CtPack): RegionForm => ({ route: p.routes.length === 1 ? p.routes[0].id : '', docs: [], trap: '', safety: [] })
export const regionComplete = (f: RegionForm) => !!f.route && !!f.trap

export interface RegionFinding { id: string; text: string; cite: string; options: Opt[]; correct: string; decisionId?: string }

export function designFindings(s: Scenario, c: Choices, safety: string[], cite: string): RegionFinding[] {
  const out: RegionFinding[] = []
  const grades = gradePhase(s, 'p1', c)
  const decisions = buildDecisions(s, 'p1')
  const opts = (id: string) => decisions.find((d) => d.id === id)!.options.map((o) => ({ id: o.id, label: o.label }))
  const poor = (id: string) => grades.find((g) => g.decisionId === id)?.verdict === 'poor'
  const why = (id: string) => grades.find((g) => g.decisionId === id)?.explanation ?? ''
  if (poor('p1_dose')) out.push({ id: 'dose', cite, text: `Justify the starting dose. ${why('p1_dose')}`, decisionId: 'p1_dose', options: opts('p1_dose'), correct: s.startingDoseBasis })
  if (poor('p1_population')) out.push({ id: 'population', cite, text: `The population is not justified. ${why('p1_population')}`, decisionId: 'p1_population', options: opts('p1_population'), correct: s.p1Population })
  if (poor('p1_escalation')) out.push({ id: 'escalation', cite, text: `The escalation scheme does not protect participants. ${why('p1_escalation')}`, decisionId: 'p1_escalation', options: opts('p1_escalation'), correct: s.escalation })
  if (poor('p1_dlt')) out.push({ id: 'dlt', cite, text: `Define dose-limiting toxicity and stopping rules. ${why('p1_dlt')}`, decisionId: 'p1_dlt', options: opts('p1_dlt'), correct: 'prespecified' })
  if (s.special && c[s.special.id] !== s.special.correctOptionId) out.push({ id: 'special', cite, text: `${s.special.title}: ${s.special.wrongWhy}`, decisionId: s.special.id, options: s.special.options.map((o) => ({ id: o.id, label: o.label })), correct: s.special.correctOptionId })
  if (c['p1_n'] && c['p1_n'] !== p1SizeBand(s)) out.push({ id: 'n', cite, text: 'Justify the number of participants for a first-in-human trial.', decisionId: 'p1_n', options: opts('p1_n'), correct: p1SizeBand(s) })
  const needed = s.fihRisk === 'high' ? ['sentinel', 'stagger', 'src', 'stopping', 'site'] : s.fihRisk === 'moderate' ? ['sentinel', 'src', 'stopping'] : ['src', 'stopping']
  const missing = needed.filter((x) => !safety.includes(x))
  if (missing.length) out.push({ id: 'safety', cite, text: `Add to the protocol: ${missing.map((m) => SAFETY_OPTIONS.find((o) => o.id === m)!.label.split(':')[0].toLowerCase()).join('; ')}.`, options: [{ id: 'add', label: 'Submit the revised protocol with these measures' }, { id: 'justify', label: 'Argue that the nonclinical data make them unnecessary' }], correct: 'add' })
  return out
}

export function regionFindings(p: CtPack, s: Scenario, c: Choices, f: RegionForm): RegionFinding[] {
  const out = designFindings(s, c, f.safety, p.reviewer)
  const gaps = p.docs.filter((d) => !f.docs.includes(d.id))
  if (gaps.length) out.unshift({ id: 'docs', cite: p.cite, text: `The application is incomplete: ${gaps.map((g) => g.title.toLowerCase()).join('; ')}.`, options: [{ id: 'provide', label: 'Provide the missing documents' }, { id: 'later', label: 'Undertake to provide them before the first participant' }], correct: 'provide' })
  return out
}

export interface RegionEvent { day: number; text: string; kind: 'info' | 'request' | 'refusal' | 'ok' }
export interface RegionOutcome {
  code: RegionCode
  stage: 'questions' | 'decided'
  events: RegionEvent[]
  findings: RegionFinding[]
  authorisedDay: number
  firstPatientDay: number
  problems: string[]
  segments: { from: number; to: number; kind: string; label: string }[]
  correctedChoices: Choices
  objection: boolean
}

const wd = (n: number) => Math.round((n * 7) / 5)
const ACTIVATE = 14

// Runs one region's clock (calendar days from submission). `answers` holds the replies to the
// reviewer questions; `resubmit` is used after an objection or refusal.
export function runRegion(p: CtPack, s: Scenario, c: Choices, f: RegionForm, answers: Record<string, string> | null, resubmit = false): RegionOutcome {
  const findings = regionFindings(p, s, c, f)
  const corrected: Choices = { ...c }
  const events: RegionEvent[] = []
  const segments: RegionOutcome['segments'] = []
  const problems: string[] = []
  const base = { code: p.id, findings, correctedChoices: corrected, problems, segments }
  if (f.trap !== p.trap.correct) problems.push(p.trap.problem)
  const ev = (day: number, text: string, kind: RegionEvent['kind']) => events.push({ day, text, kind })
  ev(0, `Submitted: ${p.routes.find((r) => r.id === f.route)?.label}.`, 'info')
  if (findings.length && !answers) {
    const qDay = p.id === 'UK' ? 7 + 21 : p.id === 'CA' ? 20 : p.id === 'JP' ? 20 : p.id === 'AU' ? 21 : wd(40)
    ev(qDay, `Reviewer questions (simulated): ${findings.length}.`, 'request')
    return { ...base, stage: 'questions', events, authorisedDay: -1, firstPatientDay: -1, objection: false }
  }
  const fails = findings.filter((x) => answers?.[x.id] !== x.correct)
  for (const x of findings) if (answers?.[x.id] === x.correct && x.decisionId) corrected[x.decisionId] = x.correct
  let day = 0, objection = false
  const q = findings.length > 0
  switch (p.id) {
    case 'UK': {
      if (f.route === 'notifiable') { ev(7, 'Validation: a first-in-human trial is not eligible for the notifiable scheme; it moves to the combined review.', 'request'); day = 7 }
      const v = day + 7
      ev(v, 'Validated.', 'ok'); segments.push({ from: 0, to: v, kind: 'validation', label: 'Validation' })
      if (q) { ev(v + 21, 'Request for further information: the sponsor has up to 60 days.', 'request'); ev(v + 35, 'The sponsor responds; MHRA and the ethics committee decide within 10 days.', 'info'); day = v + 45; segments.push({ from: v, to: v + 21, kind: 'review', label: 'Combined review' }, { from: v + 21, to: v + 35, kind: 'request', label: 'Further information' }, { from: v + 35, to: day, kind: 'review', label: 'Decision' }) }
      else { day = v + 30; segments.push({ from: v, to: day, kind: 'review', label: 'Combined review (30 days)' }) }
      if (fails.length) { objection = true; ev(day, 'Authorisation refused: the answers did not resolve the concerns.', 'refusal') }
      else ev(day, 'MHRA and the research ethics committee authorise the trial.', 'ok')
      break
    }
    case 'CA': {
      if (q) { ev(20, 'Clarification request from Health Canada within the 30-day review.', 'request'); ev(22, 'The sponsor answers.', 'info') }
      day = 30; segments.push({ from: 0, to: 30, kind: 'review', label: '30-day review (C.05.006)' })
      if (fails.length) { objection = true; ev(30, 'Not satisfactory notice: Health Canada objects within the 30 days. A new or revised application is needed.', 'refusal') }
      else ev(30, 'No objection within 30 days: the trial may proceed (C.05.006).', 'ok')
      break
    }
    case 'AU': {
      const hrec = q ? 45 : 30
      ev(hrec, q ? 'HREC approves after the sponsor answers its questions.' : 'HREC approves the protocol.', fails.length && f.route === 'ctn' ? 'refusal' : 'ok')
      segments.push({ from: 0, to: hrec, kind: q ? 'request' : 'review', label: 'HREC review' })
      if (f.route === 'cta') { day = hrec + wd(50); ev(day, 'The TGA approves the CTA after evaluating the data.', 'ok'); segments.push({ from: hrec, to: day, kind: 'review', label: 'TGA evaluation (indicative 50 working days)' }) }
      else { day = hrec + 14; ev(day, 'Site governance authorisation; the CTN is lodged with the TGA before supply.', 'ok'); segments.push({ from: hrec, to: day, kind: 'review', label: 'Governance and CTN' }) }
      if (fails.length) { objection = true; ev(day, f.route === 'cta' ? 'The TGA does not approve the CTA.' : 'The HREC does not approve the trial.', 'refusal') }
      break
    }
    case 'JP': {
      if (q) ev(20, 'PMDA inquiry during the 30-day review.', 'request')
      day = 30; segments.push({ from: 0, to: 30, kind: 'review', label: 'PMDA 30-day review of the first notification' })
      if (fails.length) { objection = true; day = 60; ev(30, 'PMDA asks for changes before the trial may start; the notification is amended and reviewed again.', 'refusal'); segments.push({ from: 30, to: 60, kind: 'refused', label: 'Changes required' }) }
      else ev(30, 'The 30 days end without objection; with IRB approval and the site agreement, the trial may start.', 'ok')
      break
    }
    case 'CN': {
      const limit = f.route === 'expedited' ? 30 : 60
      let w = limit
      if (f.route === 'expedited') { ev(wd(20), 'The CDE says the product does not qualify for the expedited track: the 60-working-day track applies.', 'request'); w = 60 }
      if (q) ev(wd(40), 'The CDE asks for supplementary information.', 'request')
      day = wd(w); segments.push({ from: 0, to: day, kind: 'review', label: `CDE review (${w} working days)` })
      if (fails.length) { objection = true; ev(day, 'The CDE does not accept the application.', 'refusal') }
      else ev(day, `No objection within ${w} working days: approval is implied.`, 'ok')
      break
    }
  }
  if (objection && resubmit) {
    for (const x of fails) if (x.decisionId) corrected[x.decisionId] = x.correct
    const again = day + 21 + (p.id === 'CN' ? wd(60) : p.id === 'AU' && f.route === 'cta' ? wd(50) : 30)
    ev(day + 21, 'Resubmitted with the changes.', 'info'); ev(again, 'Authorised on resubmission.', 'ok')
    segments.push({ from: day, to: day + 21, kind: 'resubmission', label: 'Revised application prepared' }, { from: day + 21, to: again, kind: 'review', label: 'Review of the resubmission' })
    day = again; objection = false
  }
  if (objection) return { ...base, stage: 'decided', events, authorisedDay: -1, firstPatientDay: -1, objection: true }
  if (problems.length) { ev(day, `Start blocked: ${problems[0]}`, 'refusal'); return { ...base, stage: 'decided', events, authorisedDay: day, firstPatientDay: -1, objection: false } }
  ev(day + ACTIVATE, 'First participant dosed.', 'ok')
  segments.push({ from: day, to: day + ACTIVATE, kind: 'activation', label: 'Site activation' })
  return { ...base, stage: 'decided', events, authorisedDay: day, firstPatientDay: day + ACTIVATE, objection: false }
}

export interface RegionSummary { code: RegionCode; name: string; authorisedDay: number; firstPatientDay: number; questions: number; objection: boolean; problems: string[] }
