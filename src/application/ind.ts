// The US IND gate before first patient in (21 CFR Part 312). The user builds the IND from their
// Phase I design; FDA's 30-day review then raises information requests and clinical hold grounds
// from the weaknesses the simulator's own grading finds in that design.
import { buildDecisions, p1SizeBand } from '../data/ct-decisions'
import { gradePhase } from '../data/ct-engine'
import type { Choices, Scenario } from '../data/ct-types'

export interface IndForm {
  sponsor: string
  indType: 'commercial' | 'research'
  commitments: string[]          // Form FDA 1571 commitments ticked
  cro: 'none' | 'listed' | 'not_listed'
  plan: string                   // introductory statement and general investigational plan
  ibSections: string[]           // investigator's brochure contents (312.23(a)(5))
  safety: string[]               // protocol safety measures
  label: string                  // investigational label statement (312.6)
  glp: 'statement' | 'none'      // GLP compliance statement for nonclinical studies (312.23(a)(8)(iii))
  form3674: 'apply' | 'not_apply' | ''
  form1572: boolean
}

export const EMPTY_FORM: IndForm = { sponsor: '', indType: 'commercial', commitments: [], cro: 'none', plan: '', ibSections: [], safety: [], label: '', glp: 'statement', form3674: '', form1572: false }

export const COMMITMENTS = [
  { id: 'wait', label: 'Not to begin clinical investigations until 30 days after FDA receives the IND, unless FDA notifies earlier that they may begin' },
  { id: 'irb', label: 'Not to begin or continue investigations covered by the IND if they are placed on clinical hold' },
  { id: 'irb_review', label: 'That an IRB complying with 21 CFR Part 56 will be responsible for initial and continuing review and approval of each study' },
  { id: 'comply', label: 'To conduct the investigation in accordance with all other applicable regulatory requirements' },
]

export const PLAN_OPTIONS = [
  { id: 'year', label: 'The rationale, the indication, the general approach, the kinds of trials planned in the coming year, the estimated number of subjects, and risks anticipated from the toxicology', correct: true },
  { id: 'nda', label: 'The complete marketing plan and the proposed labelling for approval', correct: false },
  { id: 'none', label: 'Not needed for a first-in-human IND: the protocol is enough', correct: false },
]

export const IB_SECTIONS = [
  { id: 'description', label: 'Description of the drug substance and formulation, with the structural formula if known' },
  { id: 'pharmtox', label: 'Summary of pharmacological and toxicological effects in animals (and humans, if known)' },
  { id: 'pk', label: 'Summary of pharmacokinetics and biological disposition in animals (and humans, if known)' },
  { id: 'prior', label: 'Summary of information on safety and effectiveness in humans from prior studies' },
  { id: 'risks', label: 'Possible risks and side effects to be anticipated, with precautions or special monitoring' },
]

export const SAFETY_OPTIONS = [
  { id: 'sentinel', label: 'Sentinel dosing: one subject per cohort dosed first, with an observation period before the rest' },
  { id: 'stagger', label: 'Staggered dosing within each cohort' },
  { id: 'src', label: 'A safety review committee reviews all data before each dose escalation' },
  { id: 'stopping', label: 'Written stopping and pausing rules for individual subjects and the study' },
  { id: 'site', label: 'Dosing at a unit with immediate access to intensive care' },
]

export const LABEL_OPTIONS = [
  { id: 'caution', label: 'Caution: New Drug—Limited by Federal (or United States) law to investigational use.', correct: true },
  { id: 'rx', label: 'Rx only', correct: false },
  { id: 'approved', label: 'Approved for clinical trial use by FDA', correct: false },
]

export interface IndPart { id: string; title: string; cite: string; ectd: string; complete: (f: IndForm) => boolean; quality: (f: IndForm) => boolean }

export const IND_PARTS: IndPart[] = [
  { id: '1571', title: 'Form FDA 1571', cite: '21 CFR 312.23(a)(1)', ectd: '1.1', complete: (f) => !!f.sponsor.trim() && COMMITMENTS.every((c) => f.commitments.includes(c.id)), quality: (f) => f.cro !== 'not_listed' },
  { id: 'toc', title: 'Table of contents and cover letter', cite: '21 CFR 312.23(a)(2)', ectd: '1.2', complete: () => true, quality: () => true },
  { id: 'plan', title: 'Introductory statement and general investigational plan', cite: '21 CFR 312.23(a)(3)', ectd: '1.20', complete: (f) => !!f.plan, quality: (f) => PLAN_OPTIONS.find((p) => p.id === f.plan)?.correct === true },
  { id: 'ib', title: "Investigator's brochure", cite: '21 CFR 312.23(a)(5)', ectd: '1.14.4.1', complete: (f) => f.ibSections.length > 0, quality: (f) => IB_SECTIONS.every((s) => f.ibSections.includes(s.id)) },
  { id: 'protocol', title: 'Protocol', cite: '21 CFR 312.23(a)(6)', ectd: '5.3.3.1 or 5.3.3.2', complete: () => true, quality: () => true },
  { id: 'cmc', title: 'Chemistry, manufacturing and controls, with investigational labels', cite: '21 CFR 312.23(a)(7); 312.6', ectd: '3.2 (summary in 2.3); labels in 1.14.4.2', complete: (f) => !!f.label, quality: (f) => LABEL_OPTIONS.find((l) => l.id === f.label)?.correct === true },
  { id: 'pharmtox', title: 'Pharmacology and toxicology', cite: '21 CFR 312.23(a)(8)', ectd: '4.2 (summary in 2.4)', complete: () => true, quality: (f) => f.glp === 'statement' },
  { id: 'human', title: 'Previous human experience', cite: '21 CFR 312.23(a)(9)', ectd: '1.20', complete: () => true, quality: () => true },
  { id: 'forms', title: 'Form FDA 1572 and Form FDA 3674', cite: '21 CFR 312.53(c); 42 U.S.C. 282(j)(5)(B)', ectd: '1.1', complete: (f) => f.form1572 && !!f.form3674, quality: (f) => f.form3674 === 'not_apply' },
]

export const canSubmit = (f: IndForm) => IND_PARTS.every((p) => p.complete(f))

export interface FixOption { id: string; label: string }
export interface Finding {
  id: string
  kind: 'hold' | 'request'
  cite: string
  ground: string
  text: string
  decisionId?: string           // design decision the user must change to fix it
  formField?: keyof IndForm     // or IND content to fix
  options: FixOption[]
  correct: string
}

const HOLD_I = '21 CFR 312.42(b)(1)(i)'
const GROUND_I = 'Human subjects are or would be exposed to an unreasonable and significant risk of illness or injury.'

// The findings FDA raises during the 30-day review. Deterministic for a given design and IND.
export function reviewInd(s: Scenario, c: Choices, f: IndForm): Finding[] {
  const out: Finding[] = []
  const grades = gradePhase(s, 'p1', c)
  const decisions = buildDecisions(s, 'p1')
  const opts = (id: string) => decisions.find((d) => d.id === id)!.options.map((o) => ({ id: o.id, label: o.label }))
  const poor = (id: string) => grades.find((g) => g.decisionId === id)?.verdict === 'poor'
  const why = (id: string) => grades.find((g) => g.decisionId === id)?.explanation ?? ''

  if (poor('p1_dose')) out.push({ id: 'dose', kind: 'hold', cite: HOLD_I, ground: GROUND_I, text: `The proposed starting dose is not adequately justified. ${why('p1_dose')}`, decisionId: 'p1_dose', options: opts('p1_dose'), correct: s.startingDoseBasis })
  if (poor('p1_population')) out.push({ id: 'population', kind: 'hold', cite: HOLD_I, ground: GROUND_I, text: `The study population is not appropriate for this agent. ${why('p1_population')}`, decisionId: 'p1_population', options: opts('p1_population'), correct: s.p1Population })
  if (poor('p1_escalation')) out.push({ id: 'escalation', kind: 'hold', cite: HOLD_I, ground: GROUND_I, text: `The dose-escalation scheme does not adequately protect subjects. ${why('p1_escalation')}`, decisionId: 'p1_escalation', options: opts('p1_escalation'), correct: s.escalation })
  if (poor('p1_dlt')) out.push({ id: 'dlt', kind: 'hold', cite: HOLD_I, ground: GROUND_I, text: `The protocol lacks an adequate definition of dose-limiting toxicity and stopping rules. ${why('p1_dlt')}`, decisionId: 'p1_dlt', options: opts('p1_dlt'), correct: 'prespecified' })
  if (s.special && c[s.special.id] !== s.special.correctOptionId) out.push({ id: 'special', kind: 'hold', cite: HOLD_I, ground: GROUND_I, text: `${s.special.title}: ${s.special.wrongWhy}`, decisionId: s.special.id, options: s.special.options.map((o) => ({ id: o.id, label: o.label })), correct: s.special.correctOptionId })
  const needed = s.fihRisk === 'high' ? ['sentinel', 'stagger', 'src', 'stopping', 'site'] : s.fihRisk === 'moderate' ? ['sentinel', 'src', 'stopping'] : ['src', 'stopping']
  const missing = needed.filter((x) => !f.safety.includes(x))
  if (missing.length) out.push({ id: 'safety', kind: 'hold', cite: HOLD_I, ground: GROUND_I, text: `For a ${s.fihRisk}-risk first-in-human study, the protocol must include: ${missing.map((m) => SAFETY_OPTIONS.find((o) => o.id === m)!.label.split(':')[0].toLowerCase()).join('; ')}.`, formField: 'safety', options: [{ id: 'add', label: 'Amend the protocol to add the missing safety measures' }, { id: 'justify', label: 'Explain that the measures are not needed because the preclinical data are reassuring' }], correct: 'add' })
  if (!f.ibSections.includes('risks') || !f.ibSections.includes('pharmtox')) out.push({ id: 'ib', kind: 'hold', cite: '21 CFR 312.42(b)(1)(iii)', ground: "The investigator brochure is misleading, erroneous, or materially incomplete.", text: "The investigator's brochure does not give investigators the information they need on the drug's effects and the anticipated risks (21 CFR 312.23(a)(5)).", formField: 'ibSections', options: [{ id: 'add', label: 'Revise the investigator’s brochure to include all required sections, and send it to every investigator' }, { id: 'later', label: 'Commit to sending a fuller brochure after the first cohort' }], correct: 'add' })
  // Information requests: FDA asks; a good answer closes them, a poor one becomes a hold ground.
  if (c['p1_n'] && c['p1_n'] !== p1SizeBand(s)) out.push({ id: 'n', kind: 'request', cite: '21 CFR 312.23(a)(6)(iii)(b)', ground: 'Information request', text: `Please justify the planned number of subjects (${opts('p1_n').find((o) => o.id === c['p1_n'])?.label}) for a first-in-human study of this agent.`, decisionId: 'p1_n', options: opts('p1_n'), correct: p1SizeBand(s) })
  if (f.glp === 'none') out.push({ id: 'glp', kind: 'request', cite: '21 CFR 312.23(a)(8)(iii)', ground: 'Information request', text: 'For each nonclinical laboratory study, provide a statement that it was conducted in compliance with the good laboratory practice regulations (21 CFR Part 58), or a brief statement of the reason for noncompliance.', formField: 'glp', options: [{ id: 'statement', label: 'Send the GLP compliance statement for each pivotal toxicology study' }, { id: 'ignore', label: 'Reply that GLP is not required for an IND' }], correct: 'statement' })
  if (LABEL_OPTIONS.find((l) => l.id === f.label)?.correct !== true) out.push({ id: 'label', kind: 'request', cite: '21 CFR 312.6(a)', ground: 'Information request', text: 'The immediate package of an investigational new drug must bear the statement required by 21 CFR 312.6(a). Please submit revised labels.', formField: 'label', options: LABEL_OPTIONS.map((l) => ({ id: l.id, label: l.label })), correct: 'caution' })
  if (f.cro === 'not_listed') out.push({ id: 'cro', kind: 'request', cite: '21 CFR 312.52', ground: 'Information request', text: 'You state that a contract research organization will monitor the study. Identify the obligations transferred to it on Form FDA 1571.', formField: 'cro', options: [{ id: 'listed', label: 'Submit a revised Form FDA 1571 listing the transferred obligations' }, { id: 'none', label: 'Reply that the sponsor keeps all obligations in practice' }], correct: 'listed' })
  if (f.form3674 === 'apply') out.push({ id: '3674', kind: 'request', cite: '42 U.S.C. 282(j)', ground: 'Information request', text: 'Form FDA 3674 certifies that the trial is an applicable clinical trial that must be registered. A phase 1 trial is not an applicable clinical trial; please confirm the certification.', formField: 'form3674', options: [{ id: 'not_apply', label: 'Correct the certification: the registration requirements do not apply to this phase 1 trial' }, { id: 'apply', label: 'Keep the certification as submitted' }], correct: 'not_apply' })
  if (PLAN_OPTIONS.find((p) => p.id === f.plan)?.correct !== true) out.push({ id: 'plan', kind: 'request', cite: '21 CFR 312.23(a)(3)(iv)', ground: 'Information request', text: 'Provide a general investigational plan for the coming year: the rationale, the indication, the general approach, the kinds of trials, the estimated number of subjects and the anticipated risks.', formField: 'plan', options: [{ id: 'year', label: 'Submit the one-year general investigational plan' }, { id: 'nda', label: 'Refer FDA to the marketing plan' }], correct: 'year' })
  return out
}

export interface IndEvent { day: number; text: string; kind: 'info' | 'request' | 'hold' | 'ok' }
export interface ReviewAnswers {
  requests: Record<string, string>              // finding id -> chosen option, for information requests
  cycles: Array<Record<string, string>>         // one record per hold response: finding id -> chosen fix
}
export interface IndOutcome {
  events: IndEvent[]
  requests: Finding[]
  openHolds: Finding[]         // deficiencies still to answer (empty when the study may proceed)
  stage: 'requests' | 'hold' | 'proceed'
  holdCycles: number
  proceedDay: number           // day the study may proceed (-1 while on hold)
  firstPatientDay: number      // after IRB approval and site activation (-1 while on hold)
  correctedChoices: Choices
}

// Runs the review clock for the answers given so far. Requests come at day 12 and are answered by
// day 17; at day 30 anything unresolved becomes a clinical hold; each hold cycle is a telephone
// hold, a letter within 30 days (here day +14), a complete response (day +35) and FDA's reply
// within 30 days.
export function runReview(s: Scenario, c: Choices, f: IndForm, ans: ReviewAnswers): IndOutcome {
  const findings = reviewInd(s, c, f)
  const requests = findings.filter((x) => x.kind === 'request')
  const events: IndEvent[] = [{ day: 0, text: 'FDA receives the IND. The 30-day review starts (21 CFR 312.40(b)).', kind: 'info' }]
  const corrected: Choices = { ...c }
  const base = { requests, correctedChoices: corrected }
  for (const r of requests) events.push({ day: 12, text: `Information request (${r.cite}): ${r.text}`, kind: 'request' })
  if (requests.some((r) => !ans.requests[r.id])) return { ...base, events, openHolds: [], stage: 'requests', holdCycles: 0, proceedDay: -1, firstPatientDay: -1 }
  let open = findings.filter((x) => x.kind === 'hold')
  for (const r of requests) {
    const a = ans.requests[r.id]
    if (a === r.correct) { events.push({ day: 17, text: `Response to the request: ${r.options.find((o) => o.id === a)?.label}. Resolved.`, kind: 'ok' }); if (r.decisionId) corrected[r.decisionId] = r.correct }
    else { events.push({ day: 17, text: `Response to the request: ${r.options.find((o) => o.id === a)?.label}. Not resolved.`, kind: 'request' }); open = [...open, { ...r, kind: 'hold', cite: HOLD_I, ground: GROUND_I, text: `${r.text} The sponsor's response did not resolve the concern.` }] }
  }
  if (!open.length) {
    events.push({ day: 30, text: 'Day 30 with no clinical hold: the study may proceed (21 CFR 312.40(b)(1)).', kind: 'ok' })
    events.push({ day: 44, text: 'IRB approval in place and the site activated: first patient in. A phase 1 trial is not an applicable clinical trial, so ClinicalTrials.gov registration is not required.', kind: 'ok' })
    return { ...base, events, openHolds: [], stage: 'proceed', holdCycles: 0, proceedDay: 30, firstPatientDay: 44 }
  }
  let day = 30
  for (let k = 0; k <= ans.cycles.length && open.length; k++) {
    events.push({ day, text: `FDA places the IND on complete clinical hold by telephone: ${open.length} deficienc${open.length === 1 ? 'y' : 'ies'}. No subject may be dosed (21 CFR 312.42).`, kind: 'hold' })
    events.push({ day: day + 14, text: 'Clinical hold letter received, listing each deficiency and its regulation (FDA must send it within 30 days, 312.42(d)).', kind: 'hold' })
    const picks = ans.cycles[k]
    if (!picks) return { ...base, events, openHolds: open, stage: 'hold', holdCycles: k + 1, proceedDay: -1, firstPatientDay: -1 }
    day += 35
    events.push({ day, text: 'Sponsor submits a complete response to the clinical hold, addressing every deficiency (312.42(e)).', kind: 'info' })
    const still: Finding[] = []
    for (const h of open) { if (picks[h.id] === h.correct) { if (h.decisionId) corrected[h.decisionId] = h.correct } else still.push(h) }
    day += 30
    events.push(still.length ? { day, text: `FDA replies within 30 days: ${still.length} deficienc${still.length === 1 ? 'y remains' : 'ies remain'}; the hold continues.`, kind: 'hold' } : { day, text: 'FDA replies within 30 days: the hold is lifted and the study may proceed.', kind: 'ok' })
    open = still
  }
  if (open.length) return { ...base, events, openHolds: open, stage: 'hold', holdCycles: ans.cycles.length + 1, proceedDay: -1, firstPatientDay: -1 }
  events.push({ day: day + 14, text: 'IRB approval in place and the site activated: first patient in.', kind: 'ok' })
  return { ...base, events, openHolds: [], stage: 'proceed', holdCycles: ans.cycles.length, proceedDay: day, firstPatientDay: day + 14 }
}

// eCTD hand-off: the IND as a package the eCTD Dossier Builder imports as sequence 0000.
export const IND_PKG_KIND = 'clinical-trial-simulator/ind-package'
export function indPackage(s: Scenario, c: Choices, f: IndForm, user: { userId: string; classId: string | null }) {
  const healthy = c['p1_population'] === 'healthy'
  const protocolNode = healthy ? '5.3.3.1' : '5.3.3.2'
  const lines = (...x: string[]) => x.join('\n')
  const doc = (section: string, title: string, fileName: string, content: string) => ({ section, title, fileName, content, ...(/^fda-\d{4}\.pdf$/.test(fileName) ? { form: fileName.replace('.pdf', '') } : {}) })
  return {
    kind: IND_PKG_KIND, schema: 1, createdAt: new Date().toISOString(), userId: user.userId, classId: user.classId,
    notice: 'Training only. Fictional drug and sponsor; not a real IND.',
    region: 'US',
    product: { drug: s.drug, code: s.code, modality: s.modality, indication: s.indication },
    sponsor: f.sponsor,
    submission: { submissionType: 'original-application', subType: 'application', appType: 'ind', description: `Initial IND for ${s.drug} (${s.code}): phase 1 first-in-human study` },
    documents: [
      doc('1.1', 'Form FDA 1571 Investigational New Drug Application', 'fda-1571.pdf', lines(`Sponsor: ${f.sponsor}`, `Drug: ${s.drug} (${s.code})`, 'Phase: 1', `IND type: ${f.indType}`, `Commitments: ${f.commitments.length} of ${COMMITMENTS.length} given`, `Transfer of obligations to a CRO: ${f.cro === 'listed' ? 'listed in item 14' : f.cro === 'none' ? 'none' : 'not listed'}`)),
      doc('1.1', 'Form FDA 1572 Statement of Investigator', 'fda-1572.pdf', 'Principal investigator at the phase 1 unit (fictional).'),
      doc('1.1', 'Form FDA 3674 Certification of Compliance', 'fda-3674.pdf', f.form3674 === 'not_apply' ? 'The requirements of 42 U.S.C. 282(j) do not apply: phase 1 trial.' : 'The trial is an applicable clinical trial.'),
      doc('1.2', 'Cover letter: initial IND', 'cover-letter.pdf', `${f.sponsor} submits this initial IND for ${s.drug} for ${s.indication}. Phase 1 first-in-human study.`),
      doc('1.20', 'Introductory Statement and General Investigational Plan', 'general-investigational-plan.pdf', PLAN_OPTIONS.find((p) => p.id === f.plan)?.label ?? ''),
      doc('1.14.4.1', `Investigator's Brochure - ${s.drug} (Edition 1)`, 'investigators-brochure.pdf', IB_SECTIONS.filter((x) => f.ibSections.includes(x.id)).map((x) => x.label).join('\n') + `\n\n${s.preclinical}\nKnown: ${s.known}\nUnknown: ${s.unknown}`),
      doc('1.14.4.2', 'Investigational Drug Labeling', 'investigational-labels.pdf', LABEL_OPTIONS.find((l) => l.id === f.label)?.label ?? ''),
      doc(protocolNode, `Protocol ${s.code}-101: first-in-human ${healthy ? 'single and multiple ascending dose study in healthy volunteers' : 'dose-escalation study in patients'}`, `${s.code.toLowerCase()}-101-protocol.pdf`, lines(`Population: ${c['p1_population']}`, `Starting dose basis: ${c['p1_dose']}`, `Escalation: ${c['p1_escalation']}`, `Sample size: ${c['p1_n']}`, `DLT definition: ${c['p1_dlt']}`, `Safety measures: ${f.safety.join(', ') || 'none'}`)),
      doc('2.3', 'Quality Overall Summary (IND)', 'quality-overall-summary.pdf', `Drug substance and drug product for ${s.drug}; ${s.modality}.`),
      doc('2.4', 'Nonclinical Overview', 'nonclinical-overview.pdf', `${s.preclinical}\nGLP: ${f.glp === 'statement' ? 'compliance statement provided for each pivotal study' : 'not stated'}.`),
    ],
  }
}
