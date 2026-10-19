// The EU clinical trial application under Regulation (EU) No 536/2014 (the CTR), submitted
// through CTIS. One dossier: Part I (assessed jointly, led by the reporting member state) and
// Part II (assessed by each member state concerned, with its ethics committee). The clock follows
// CTR Articles 5 to 8; reviewer questions come from the weaknesses the simulator's grading finds
// in the Phase I design, as for the US IND. Countries are real member states; sites, sponsor and
// medicines are fictional.
import { buildDecisions, p1SizeBand } from '../data/ct-decisions'
import { gradePhase } from '../data/ct-engine'
import type { Choices, Scenario } from '../data/ct-types'
import { SAFETY_OPTIONS } from './ind'

export interface MemberState { code: string; name: string; language: string; site: string }
export const MEMBER_STATES: MemberState[] = [
  { code: 'DE', name: 'Germany', language: 'German', site: 'Rheinfeld Clinical Pharmacology Unit (fictional)' },
  { code: 'FR', name: 'France', language: 'French', site: 'Centre d’Essais Valmont (fictional)' },
  { code: 'ES', name: 'Spain', language: 'Spanish', site: 'Unidad de Ensayos Altamar (fictional)' },
  { code: 'NL', name: 'Netherlands', language: 'Dutch', site: 'Polderkade Research Clinic (fictional)' },
  { code: 'BE', name: 'Belgium', language: 'Dutch, French or German, by site', site: 'Scheldt Phase I Unit (fictional)' },
  { code: 'PL', name: 'Poland', language: 'Polish', site: 'Wisłoka Clinical Centre (fictional)' },
  { code: 'IT', name: 'Italy', language: 'Italian', site: 'Centro Studi Clinici Arnesi (fictional)' },
  { code: 'DK', name: 'Denmark', language: 'Danish', site: 'Fjordby Trial Unit (fictional)' },
]
export const msName = (code: string) => MEMBER_STATES.find((m) => m.code === code)?.name ?? code

export interface EuForm {
  sponsor: string
  countries: string[]
  rms: string
  ib: 'full' | 'summary' | ''
  impd: 'full' | 'simplified' | ''
  gmp: 'mia_qp' | 'none' | ''
  label: 'annex6' | 'english' | ''
  lowIntervention: boolean | null
  safety: string[]
  icf: 'national' | 'english' | ''
  part2: string[]                                   // common Part II documents provided
  insurance: Record<string, 'national' | 'global' | ''>
  category: '1' | '2' | '3' | ''
}
export const EMPTY_EU: EuForm = { sponsor: '', countries: [], rms: '', ib: '', impd: '', gmp: '', label: '', lowIntervention: null, safety: [], icf: '', part2: [], insurance: {}, category: '' }

// CTR Annex I. Part I is assessed jointly; Part II by each member state concerned.
export const PART1_DOCS = [
  { id: 'cover', title: 'Cover letter', annex: 'Annex I, B' },
  { id: 'form', title: 'EU application form (completed in CTIS)', annex: 'Annex I, C' },
  { id: 'protocol', title: 'Protocol, with a synopsis in the national languages where required', annex: 'Annex I, D' },
  { id: 'ib', title: "Investigator's brochure", annex: 'Annex I, E' },
  { id: 'gmp', title: 'Documentation of GMP compliance for the investigational medicinal product', annex: 'Annex I, F' },
  { id: 'impd', title: 'Investigational medicinal product dossier (IMPD)', annex: 'Annex I, G' },
  { id: 'label', title: 'Labelling of the investigational medicinal product', annex: 'Annex I, J; Annex VI' },
]
export const PART2_DOCS = [
  { id: 'recruitment', title: 'Recruitment arrangements', annex: 'Annex I, K' },
  { id: 'icf', title: 'Subject information, informed consent form and procedure', annex: 'Annex I, L' },
  { id: 'investigator', title: 'Suitability of the investigator (CVs, interests)', annex: 'Annex I, M' },
  { id: 'site', title: 'Suitability of the facilities, signed by the head of the site', annex: 'Annex I, N' },
  { id: 'insurance', title: 'Proof of insurance cover or indemnification', annex: 'Annex I, O' },
  { id: 'finance', title: 'Financial and other arrangements (payments to subjects and investigators)', annex: 'Annex I, P' },
  { id: 'data', title: 'Compliance with the General Data Protection Regulation', annex: 'Annex I, R' },
  { id: 'fee', title: 'Proof of payment of the national fee', annex: 'Annex I, Q' },
]
export const PART2_SIMPLE = ['recruitment', 'investigator', 'site', 'finance', 'fee', 'data']

export const OPTS = {
  ib: [{ id: 'full', label: 'The full investigator’s brochure: physical, chemical and pharmaceutical properties, nonclinical pharmacology, pharmacokinetics and toxicology, and the reference safety information' }, { id: 'summary', label: 'A five-page summary of the nonclinical data; the full brochure goes to investigators on request' }],
  impd: [{ id: 'full', label: 'Full IMPD: quality data, and nonclinical and clinical data (safety and efficacy)' }, { id: 'simplified', label: 'Simplified IMPD, referring to the summary of product characteristics' }],
  gmp: [{ id: 'mia_qp', label: 'The manufacturing and import authorisation of the EU site that releases the product, with the qualified person’s declaration of GMP equivalence for the non-EU manufacturer' }, { id: 'none', label: 'Not needed: the product is made by a contract manufacturer' }],
  label: [{ id: 'annex6', label: 'The particulars of Annex VI, in the official language of each member state concerned' }, { id: 'english', label: 'The Annex VI particulars in English for every country, to keep one label' }],
  icf: [{ id: 'national', label: 'In each country’s official language, written for lay people, with the right to withdraw at any time without detriment' }, { id: 'english', label: 'One English version for all countries, read out by the investigator' }],
  insurance: [{ id: 'national', label: 'An insurance certificate that meets this country’s law' }, { id: 'global', label: 'The sponsor’s global clinical trial policy letter' }],
}

export const CATEGORIES = [
  { id: '1', label: 'Category 1: phase I trials (first-in-human, bioavailability, bioequivalence, pharmacokinetic and pharmacodynamic trials)' },
  { id: '2', label: 'Category 2: phase II and phase III trials' },
  { id: '3', label: 'Category 3: phase IV and low-intervention trials' },
]
export const TRANSPARENCY: Record<string, string[]> = {
  '1': ['At the decision: the trial’s structured data (title, sponsor, countries, status).', 'Adult trials: the protocol and the remaining documents 30 months after the end of the trial in the EU/EEA; paediatric trials: with the summary of results.', 'Never published: the subject information sheet and informed consent form.', 'The summary of results and a lay summary are due within 12 months of the end of the trial (CTR Article 37(4)).'],
  '2': ['At the decision: the structured data and the protocol.', 'The summary of results and the lay summary within 12 months of the end of the trial.', 'Never published: the subject information sheet and informed consent form.'],
  '3': ['At the decision: the structured data and the protocol.', 'The summary of results and the lay summary within 12 months of the end of the trial.', 'Never published: the subject information sheet and informed consent form.'],
}

export const part1Complete = (f: EuForm) => !!f.sponsor.trim() && !!f.ib && !!f.impd && !!f.label && f.lowIntervention !== null
export const countriesReady = (f: EuForm) => f.countries.length > 0 && f.countries.includes(f.rms)
export const part2Complete = (f: EuForm) => !!f.icf && f.countries.every((c) => !!f.insurance[c])
export const canSubmitEu = (f: EuForm) => countriesReady(f) && part1Complete(f) && part2Complete(f) && !!f.category && !!f.gmp

export interface FixOption { id: string; label: string }
export interface EuFinding {
  id: string
  part: 'validation' | 'I' | 'II'
  country?: string               // Part II findings belong to one member state
  cite: string
  text: string
  options: FixOption[]
  correct: string
  decisionId?: string
}

// Validation (CTR Article 5): is the dossier complete and within scope?
export function validationFindings(f: EuForm): EuFinding[] {
  const out: EuFinding[] = []
  const missing = PART2_SIMPLE.filter((x) => !f.part2.includes(x)).map((x) => PART2_DOCS.find((d) => d.id === x)!.title.toLowerCase())
  const fix = [{ id: 'provide', label: 'Upload the missing documents in CTIS within 10 days' }, { id: 'later', label: 'Reply that they will follow once the trial is authorised' }]
  if (missing.length) out.push({ id: 'v-part2', part: 'validation', cite: 'CTR Article 5(3) and (5); Annex I', text: `The dossier is incomplete. Missing Part II documents: ${missing.join('; ')}.`, options: fix, correct: 'provide' })
  if (f.gmp === 'none') out.push({ id: 'v-gmp', part: 'validation', cite: 'CTR Annex I, F; Article 61', text: 'The dossier does not document GMP compliance for the investigational medicinal product: give the manufacturing and import authorisation of the EU site and, for a product made outside the EU, the qualified person’s declaration.', options: [{ id: 'provide', label: 'Upload the authorisation and the QP declaration within 10 days' }, { id: 'later', label: 'Reply that the contract manufacturer is GMP certified' }], correct: 'provide' })
  if (f.lowIntervention === true) out.push({ id: 'v-low', part: 'validation', cite: 'CTR Article 2(2)(3)', text: 'The trial is declared low-intervention, but the investigational medicinal product is not authorised. A low-intervention trial uses authorised products as authorised, or with evidence-based use.', options: [{ id: 'provide', label: 'Withdraw the low-intervention claim; the full requirements for monitoring and insurance apply' }, { id: 'later', label: 'Keep the claim: the doses are low' }], correct: 'provide' })
  return out
}

// Part I (CTR Article 6), led by the reporting member state; Part II (Article 7) per country.
export function assessmentFindings(s: Scenario, c: Choices, f: EuForm): EuFinding[] {
  const out: EuFinding[] = []
  const grades = gradePhase(s, 'p1', c)
  const decisions = buildDecisions(s, 'p1')
  const opts = (id: string) => decisions.find((d) => d.id === id)!.options.map((o) => ({ id: o.id, label: o.label }))
  const poor = (id: string) => grades.find((g) => g.decisionId === id)?.verdict === 'poor'
  const why = (id: string) => grades.find((g) => g.decisionId === id)?.explanation ?? ''
  const p1 = 'CTR Article 6(1)(b): therapeutic and public health benefits and risks to the subject'
  if (poor('p1_dose')) out.push({ id: 'dose', part: 'I', cite: p1, text: `Justify the starting dose. ${why('p1_dose')}`, decisionId: 'p1_dose', options: opts('p1_dose'), correct: s.startingDoseBasis })
  if (poor('p1_population')) out.push({ id: 'population', part: 'I', cite: p1, text: `The choice of trial population is not justified. ${why('p1_population')}`, decisionId: 'p1_population', options: opts('p1_population'), correct: s.p1Population })
  if (poor('p1_escalation')) out.push({ id: 'escalation', part: 'I', cite: p1, text: `The dose-escalation scheme does not adequately protect subjects. ${why('p1_escalation')}`, decisionId: 'p1_escalation', options: opts('p1_escalation'), correct: s.escalation })
  if (poor('p1_dlt')) out.push({ id: 'dlt', part: 'I', cite: p1, text: `Define dose-limiting toxicity and the stopping rules in the protocol. ${why('p1_dlt')}`, decisionId: 'p1_dlt', options: opts('p1_dlt'), correct: 'prespecified' })
  if (s.special && c[s.special.id] !== s.special.correctOptionId) out.push({ id: 'special', part: 'I', cite: p1, text: `${s.special.title}: ${s.special.wrongWhy}`, decisionId: s.special.id, options: s.special.options.map((o) => ({ id: o.id, label: o.label })), correct: s.special.correctOptionId })
  if (c['p1_n'] && c['p1_n'] !== p1SizeBand(s)) out.push({ id: 'n', part: 'I', cite: 'CTR Annex I, D (statistical justification of the number of subjects)', text: 'Justify the planned number of subjects for a first-in-human trial of this product.', decisionId: 'p1_n', options: opts('p1_n'), correct: p1SizeBand(s) })
  const needed = s.fihRisk === 'high' ? ['sentinel', 'stagger', 'src', 'stopping', 'site'] : s.fihRisk === 'moderate' ? ['sentinel', 'src', 'stopping'] : ['src', 'stopping']
  const missing = needed.filter((x) => !f.safety.includes(x))
  if (missing.length) out.push({ id: 'safety', part: 'I', cite: 'EMA guideline on first-in-human trials (EMEA/CHMP/SWP/28367/07 Rev. 1)', text: `For a ${s.fihRisk}-risk first-in-human trial, add to the protocol: ${missing.map((m) => SAFETY_OPTIONS.find((o) => o.id === m)!.label.split(':')[0].toLowerCase()).join('; ')}.`, options: [{ id: 'add', label: 'Submit an updated protocol with the measures' }, { id: 'justify', label: 'Argue that the nonclinical data make them unnecessary' }], correct: 'add' })
  if (f.ib === 'summary') out.push({ id: 'ib', part: 'I', cite: 'CTR Article 55; Annex I, E', text: 'The investigator’s brochure must present the clinical and nonclinical data relevant to the product, including the reference safety information. A summary is not acceptable.', options: [{ id: 'full', label: 'Submit the full investigator’s brochure' }, { id: 'keep', label: 'Keep the summary and offer the full brochure on request' }], correct: 'full' })
  if (f.impd === 'simplified') out.push({ id: 'impd', part: 'I', cite: 'CTR Annex I, G', text: 'A simplified IMPD is only possible for an authorised product. This product is not authorised anywhere: submit the full IMPD.', options: [{ id: 'full', label: 'Submit the full IMPD with quality, nonclinical and clinical data' }, { id: 'keep', label: 'Keep the simplified IMPD and add the nonclinical overview' }], correct: 'full' })
  if (f.label === 'english') out.push({ id: 'label', part: 'I', cite: 'CTR Article 67(1); Annex VI', text: 'The label particulars must be in the official language of each member state concerned (or a language it accepts).', options: [{ id: 'annex6', label: 'Submit labels in the language of each member state concerned' }, { id: 'keep', label: 'Keep English labels: the subjects are healthy volunteers' }], correct: 'annex6' })
  for (const code of f.countries) {
    if (f.insurance[code] === 'global') out.push({ id: `ins-${code}`, part: 'II', country: code, cite: 'CTR Article 76; Annex I, O', text: `${msName(code)}: the insurance or indemnity arrangement must meet the law of ${msName(code)}. A global policy letter is not proof of cover there.`, options: [{ id: 'national', label: `Provide an insurance certificate that meets the law of ${msName(code)}` }, { id: 'keep', label: 'Confirm that the global policy covers all countries' }], correct: 'national' })
    if (f.icf === 'english') out.push({ id: `icf-${code}`, part: 'II', country: code, cite: 'CTR Article 29; Annex I, L', text: `${msName(code)}: the information sheet and consent form must be in a language the subjects understand (${MEMBER_STATES.find((m) => m.code === code)?.language}), in lay terms.`, options: [{ id: 'national', label: `Provide the information and consent form in ${MEMBER_STATES.find((m) => m.code === code)?.language}` }, { id: 'keep', label: 'Keep English: the investigator will translate during the consent interview' }], correct: 'national' })
  }
  return out
}

export interface EuAnswers {
  validation: Record<string, string>
  assessment: Record<string, string>
  resubmitAll: boolean
  resubmit: string[]                // member states the sponsor resubmits to after a Part II refusal
}
export const EMPTY_ANSWERS: EuAnswers = { validation: {}, assessment: {}, resubmitAll: false, resubmit: [] }

export interface EuEvent { day: number; text: string; kind: 'info' | 'request' | 'refusal' | 'ok'; country?: string }
export interface Segment { from: number; to: number; kind: 'validation' | 'assessment' | 'rfi' | 'decision' | 'refused' | 'resubmission' | 'activation'; label: string }
export interface CountryOutcome { code: string; status: 'authorised' | 'refused' | 'pending'; decisionDay: number; firstPatientDay: number; segments: Segment[] }
export interface EuOutcome {
  stage: 'validation' | 'assessment' | 'decided' | 'lapsed'
  events: EuEvent[]
  validation: EuFinding[]
  findings: EuFinding[]                 // Part I and Part II requests for information
  countries: CountryOutcome[]
  partIAcceptable: boolean | null
  rfiCount: number
  refusals: number
  lapsed: boolean
  atmp: boolean
  correctedChoices: Choices
  proposed: { days: number; label: string }   // Watch: the proposed EU Biotech Act clock
}

const DAYS = { validate: 10, sponsorFix: 10, rmsCheck: 5, assess: 45, initial: 26, coordinated: 12, consolidate: 7, rfiExt: 31, rfiReply: 12, decide: 5, atmp: 50, prep: 14, activate: 14 }

// Runs the EU clock (calendar days from submission in CTIS) for the answers given so far.
export function runEu(s: Scenario, c: Choices, f: EuForm, ans: EuAnswers): EuOutcome {
  const atmp = s.platformGroup === 'cell-gene'
  const corrected: Choices = { ...c }
  const events: EuEvent[] = [{ day: 0, text: `Application submitted in CTIS for ${f.countries.map(msName).join(', ')}, with ${msName(f.rms)} proposed as reporting member state (CTR Article 5(1)).`, kind: 'info' }]
  const validation = validationFindings(f)
  const findings = assessmentFindings(s, c, f)
  const base = { validation, findings, atmp, correctedChoices: corrected, rfiCount: 0, refusals: 0 }
  const proposedFor = (q: boolean) => ({ days: q ? 76 : 47, label: `Watch, proposed European Biotech Act: about ${q ? 76 : 47} days for this multinational application${atmp ? ', with no extra time for advanced therapies' : ''} (current rules: ${q ? 106 : 60}${atmp ? ' + 50' : ''}). Not adopted; the current clock applies.` })
  const pending = (): CountryOutcome[] => f.countries.map((code) => ({ code, status: 'pending', decisionDay: -1, firstPatientDay: -1, segments: [] }))

  // Validation
  let start = 0
  let vd = DAYS.validate
  let lapsed = false
  const segsBefore: Segment[] = []
  if (validation.length) {
    events.push({ day: DAYS.validate, text: `Validation: ${msName(f.rms)} asks for the missing information; the sponsor has 10 days (CTR Article 5(5)).`, kind: 'request' })
    for (const v of validation) events.push({ day: DAYS.validate, text: `${v.text} (${v.cite})`, kind: 'request' })
    if (validation.some((v) => !ans.validation[v.id])) return { ...base, stage: 'validation', events, countries: pending(), partIAcceptable: null, lapsed: false, proposed: proposedFor(true) }
    if (validation.every((v) => ans.validation[v.id] === v.correct)) {
      vd = DAYS.validate + DAYS.sponsorFix + DAYS.rmsCheck
      events.push({ day: DAYS.validate + DAYS.sponsorFix, text: 'The sponsor completes the dossier.', kind: 'info' })
      segsBefore.push({ from: 0, to: vd, kind: 'validation', label: 'Validation with a request (10 + 10 + 5 days)' })
    } else {
      lapsed = true
      events.push({ day: DAYS.validate + DAYS.sponsorFix, text: 'The answer does not complete the dossier: the application lapses (CTR Article 5(5)). The sponsor must submit a new application.', kind: 'refusal' })
      if (!ans.resubmitAll) return { ...base, stage: 'lapsed', events, countries: pending().map((p) => ({ ...p, segments: [{ from: 0, to: 20, kind: 'refused', label: 'Lapsed at validation' }] })), partIAcceptable: null, lapsed: true, proposed: proposedFor(true) }
      start = DAYS.validate + DAYS.sponsorFix + DAYS.prep
      segsBefore.push({ from: 0, to: 20, kind: 'refused', label: 'Lapsed at validation' }, { from: 20, to: start, kind: 'resubmission', label: 'New application prepared' })
      events.push({ day: start, text: 'New application submitted with the complete dossier.', kind: 'info' })
      vd = start + DAYS.validate
      segsBefore.push({ from: start, to: vd, kind: 'validation', label: 'Validation (10 days)' })
    }
  } else segsBefore.push({ from: 0, to: vd, kind: 'validation', label: 'Validation (10 days)' })
  events.push({ day: vd, text: `Validation date. Part I assessment starts: initial assessment (26 days), coordinated review (12 days), consolidation (7 days)${atmp ? ', plus 50 days for an advanced therapy (CTR Article 6(7))' : ''}.`, kind: 'ok' })

  // Assessment
  const p1 = findings.filter((x) => x.part === 'I')
  const p2 = findings.filter((x) => x.part === 'II')
  const rfiDay = vd + DAYS.initial + DAYS.coordinated
  if (findings.length) {
    events.push({ day: rfiDay, text: `Request for information: ${p1.length ? `${p1.length} on Part I from ${msName(f.rms)} on behalf of all member states concerned` : ''}${p1.length && p2.length ? ', and ' : ''}${p2.length ? `${p2.length} on Part II from ${Array.from(new Set(p2.map((x) => msName(x.country!)))).join(', ')}` : ''}. The sponsor has up to 12 days; the assessment is extended by up to 31 days (CTR Articles 6(8) and 7(2)).`, kind: 'request' })
    if (findings.some((x) => !ans.assessment[x.id])) return { ...base, rfiCount: findings.length, stage: 'assessment', events, countries: pending(), partIAcceptable: null, lapsed, proposed: proposedFor(true) }
  }
  const p1Fail = p1.filter((x) => ans.assessment[x.id] !== x.correct)
  for (const x of findings) if (ans.assessment[x.id] === x.correct && x.decisionId) corrected[x.decisionId] = x.correct
  const partIDays = DAYS.assess + (p1.length ? DAYS.rfiExt : 0) + (atmp ? DAYS.atmp : 0)
  const reportDay = vd + partIDays
  if (findings.length) events.push({ day: rfiDay + DAYS.rfiReply, text: `The sponsor answers the request for information. ${findings.length - findings.filter((x) => ans.assessment[x.id] !== x.correct).length} of ${findings.length} points resolved.`, kind: findings.every((x) => ans.assessment[x.id] === x.correct) ? 'ok' : 'request' })
  events.push({ day: reportDay, text: p1Fail.length ? `Reporting date: ${msName(f.rms)} concludes that Part I is NOT acceptable (${p1Fail.map((x) => x.id).join(', ')} unresolved). That conclusion is the conclusion of every member state concerned (CTR Article 8).` : `Reporting date: ${msName(f.rms)} concludes that Part I is acceptable.`, kind: p1Fail.length ? 'refusal' : 'ok' })

  const countries: CountryOutcome[] = []
  let refusals = 0
  for (const code of f.countries) {
    const mine = p2.filter((x) => x.country === code)
    const fail = mine.filter((x) => ans.assessment[x.id] !== x.correct)
    const partIIDays = DAYS.assess + (mine.length ? DAYS.rfiExt : 0)
    const decisionDay = vd + Math.max(partIDays, partIIDays) + DAYS.decide
    const segs: Segment[] = [...segsBefore]
    segs.push({ from: vd, to: vd + DAYS.assess + (atmp ? DAYS.atmp : 0), kind: 'assessment', label: `Part I${atmp ? ' (with the ATMP extension)' : ''} and Part II assessment` })
    if (p1.length || mine.length) segs.push({ from: vd + DAYS.assess + (atmp ? DAYS.atmp : 0), to: vd + Math.max(partIDays, partIIDays), kind: 'rfi', label: 'Request for information (+31 days)' })
    segs.push({ from: decisionDay - DAYS.decide, to: decisionDay, kind: 'decision', label: 'Decision within 5 days (Article 8)' })
    if (p1Fail.length || fail.length) {
      refusals++
      events.push({ day: decisionDay, text: `${msName(code)} refuses the trial: ${p1Fail.length ? 'Part I is not acceptable' : `Part II is not acceptable (${fail.map((x) => x.text.split(':')[1]?.trim().split('.')[0] ?? x.id).join('; ')})`}.`, kind: 'refusal', country: code })
      const retry = p1Fail.length ? ans.resubmitAll : ans.resubmit.includes(code)
      if (!retry) { countries.push({ code, status: 'refused', decisionDay, firstPatientDay: -1, segments: [...segs, { from: decisionDay, to: decisionDay + 3, kind: 'refused', label: 'Refused' }] }); continue }
      // Resubmission: a new application for this member state with the fixes; no further questions.
      const resub = decisionDay + DAYS.prep
      const d2 = resub + DAYS.validate + DAYS.assess + (atmp && p1Fail.length ? DAYS.atmp : 0) + DAYS.decide
      events.push({ day: resub, text: `Resubmission to ${msName(code)} with the fixes asked for.`, kind: 'info', country: code })
      events.push({ day: d2, text: `${msName(code)} authorises the resubmitted trial.`, kind: 'ok', country: code })
      if (p1Fail.length) for (const x of p1Fail) if (x.decisionId) corrected[x.decisionId] = x.correct
      countries.push({ code, status: 'authorised', decisionDay: d2, firstPatientDay: d2 + DAYS.activate, segments: [...segs, { from: decisionDay, to: resub, kind: 'resubmission', label: 'Refused; new application prepared' }, { from: resub, to: d2, kind: 'assessment', label: 'Resubmission: validation, assessment, decision' }, { from: d2, to: d2 + DAYS.activate, kind: 'activation', label: 'Site activation' }] })
      continue
    }
    events.push({ day: decisionDay, text: `${msName(code)} authorises the trial (Part I and Part II).`, kind: 'ok', country: code })
    countries.push({ code, status: 'authorised', decisionDay, firstPatientDay: decisionDay + DAYS.activate, segments: [...segs, { from: decisionDay, to: decisionDay + DAYS.activate, kind: 'activation', label: 'Site activation' }] })
  }
  for (const co of countries) if (co.status === 'authorised') events.push({ day: co.firstPatientDay, text: `${msName(co.code)}: first subject in at ${MEMBER_STATES.find((m) => m.code === co.code)?.site}.`, kind: 'ok', country: co.code })
  events.sort((a, b) => a.day - b.day)
  return { ...base, rfiCount: findings.length + validation.length, refusals, stage: 'decided', events, countries, partIAcceptable: p1Fail.length === 0, lapsed, proposed: proposedFor(findings.length > 0 || validation.length > 0) }
}

// Checklist export: CTIS is not eCTD, so the EU dossier goes out as a checklist.
export const EU_CHECKLIST_KIND = 'clinical-trial-simulator/eu-cta-checklist'
export function euChecklist(s: Scenario, f: EuForm, user: { userId: string; classId: string | null }) {
  return {
    kind: EU_CHECKLIST_KIND, schema: 1, createdAt: new Date().toISOString(), userId: user.userId, classId: user.classId,
    notice: 'Training only. Fictional medicine, sponsor and sites. CTIS is not eCTD: this is a checklist, not a submission.',
    regulation: 'Regulation (EU) No 536/2014', product: { drug: s.drug, code: s.code }, sponsor: f.sponsor,
    reportingMemberState: msName(f.rms), memberStatesConcerned: f.countries.map(msName), transparencyCategory: f.category,
    partI: PART1_DOCS.map((d) => ({ ...d, provided: d.id === 'cover' || d.id === 'form' || d.id === 'protocol' ? true : d.id === 'gmp' ? f.gmp === 'mia_qp' : !!f[d.id as 'ib' | 'impd' | 'label'] })),
    partII: f.countries.map((code) => ({ memberState: msName(code), site: MEMBER_STATES.find((m) => m.code === code)?.site, documents: PART2_DOCS.map((d) => ({ ...d, provided: d.id === 'icf' ? !!f.icf : d.id === 'insurance' ? !!f.insurance[code] : f.part2.includes(d.id) })) })),
  }
}
