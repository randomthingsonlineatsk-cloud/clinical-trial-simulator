// India: clinical trial permission under the New Drugs and Clinical Trials Rules, 2019 (NDCT
// Rules). Three things before the first participant: the Central Licensing Authority's permission
// (Form CT-04 to CT-06), approval by an ethics committee registered with it (CT-01 to CT-02), and
// registration in the Clinical Trials Registry - India (CTRI). The Rules count working days; the
// timeline converts them to calendar days at 5 working days a week (holidays ignored).
import { buildDecisions, p1SizeBand } from '../data/ct-decisions'
import { gradePhase } from '../data/ct-engine'
import type { Choices, Scenario } from '../data/ct-types'
import { SAFETY_OPTIONS } from './ind'

export interface InForm {
  sponsor: string
  discovery: 'india' | 'abroad' | ''
  docs: string[]                 // Second Schedule contents provided
  icf: 'english_local' | 'english' | ''
  av: boolean                    // audio-video recording of consent for vulnerable participants
  ec: 'registered' | 'unregistered' | ''
  ctri: 'before' | 'after' | ''
  compensation: boolean          // compensation undertaking (rule 39(5))
  safety: string[]
}
export const EMPTY_IN: InForm = { sponsor: '', discovery: '', docs: [], icf: '', av: false, ec: '', ctri: '', compensation: false, safety: [] }

// Second Schedule: what a CT-04 application carries.
export const SECOND_SCHEDULE = [
  { id: 'cmc', title: 'Chemical, pharmaceutical and manufacturing information on the investigational product' },
  { id: 'nonclinical', title: 'Animal pharmacology and toxicology data' },
  { id: 'human', title: 'Human data so far (for a first-in-human trial: a statement that there is none)' },
  { id: 'protocol', title: 'Protocol, with the case record form' },
  { id: 'ib', title: "Investigator's brochure" },
  { id: 'undertaking', title: 'Undertaking by each investigator' },
  { id: 'fee', title: 'Fee as in the Sixth Schedule' },
]
const DOC_IDS = SECOND_SCHEDULE.map((d) => d.id)

export const IN_OPTS = {
  discovery: [{ id: 'india', label: 'Discovered and developed in India, to be manufactured and marketed in India' }, { id: 'abroad', label: 'Discovered and developed outside India' }],
  icf: [{ id: 'english_local', label: 'In English and in the language the participants understand at each site, with the Third Schedule elements' }, { id: 'english', label: 'In English only; the investigator explains it orally' }],
  ec: [{ id: 'registered', label: 'Each site’s ethics committee is registered with the Central Licensing Authority (Form CT-02)' }, { id: 'unregistered', label: 'The hospital’s institutional committee reviews it; it has not registered' }],
  ctri: [{ id: 'before', label: 'Register in CTRI before the first participant is enrolled' }, { id: 'after', label: 'Register in CTRI once recruitment is under way' }],
}

export const inComplete = (f: InForm) => !!f.sponsor.trim() && !!f.discovery && !!f.icf && !!f.ec && !!f.ctri

export interface InFinding { id: string; cite: string; text: string; options: { id: string; label: string }[]; correct: string; decisionId?: string }

// Queries from CDSCO and its Subject Expert Committee (SEC), from the design and the dossier.
export function inFindings(s: Scenario, c: Choices, f: InForm): InFinding[] {
  const out: InFinding[] = []
  const grades = gradePhase(s, 'p1', c)
  const decisions = buildDecisions(s, 'p1')
  const opts = (id: string) => decisions.find((d) => d.id === id)!.options.map((o) => ({ id: o.id, label: o.label }))
  const poor = (id: string) => grades.find((g) => g.decisionId === id)?.verdict === 'poor'
  const why = (id: string) => grades.find((g) => g.decisionId === id)?.explanation ?? ''
  const sec = 'Subject Expert Committee review (NDCT Rules, rule 22)'
  if (poor('p1_dose')) out.push({ id: 'dose', cite: sec, text: `Justify the starting dose. ${why('p1_dose')}`, decisionId: 'p1_dose', options: opts('p1_dose'), correct: s.startingDoseBasis })
  if (poor('p1_population')) out.push({ id: 'population', cite: sec, text: `The trial population is not justified. ${why('p1_population')}`, decisionId: 'p1_population', options: opts('p1_population'), correct: s.p1Population })
  if (poor('p1_escalation')) out.push({ id: 'escalation', cite: sec, text: `The escalation scheme does not protect participants enough. ${why('p1_escalation')}`, decisionId: 'p1_escalation', options: opts('p1_escalation'), correct: s.escalation })
  if (poor('p1_dlt')) out.push({ id: 'dlt', cite: sec, text: `Define dose-limiting toxicity and stopping rules. ${why('p1_dlt')}`, decisionId: 'p1_dlt', options: opts('p1_dlt'), correct: 'prespecified' })
  if (s.special && c[s.special.id] !== s.special.correctOptionId) out.push({ id: 'special', cite: sec, text: `${s.special.title}: ${s.special.wrongWhy}`, decisionId: s.special.id, options: s.special.options.map((o) => ({ id: o.id, label: o.label })), correct: s.special.correctOptionId })
  if (c['p1_n'] && c['p1_n'] !== p1SizeBand(s)) out.push({ id: 'n', cite: sec, text: 'Justify the number of participants for a first-in-human trial of this product.', decisionId: 'p1_n', options: opts('p1_n'), correct: p1SizeBand(s) })
  const needed = s.fihRisk === 'high' ? ['sentinel', 'stagger', 'src', 'stopping', 'site'] : s.fihRisk === 'moderate' ? ['sentinel', 'src', 'stopping'] : ['src', 'stopping']
  const missing = needed.filter((x) => !f.safety.includes(x))
  if (missing.length) out.push({ id: 'safety', cite: sec, text: `Add to the protocol: ${missing.map((m) => SAFETY_OPTIONS.find((o) => o.id === m)!.label.split(':')[0].toLowerCase()).join('; ')}.`, options: [{ id: 'add', label: 'Submit the revised protocol with these measures' }, { id: 'justify', label: 'Explain that the nonclinical data make them unnecessary' }], correct: 'add' })
  const gaps = DOC_IDS.filter((d) => !f.docs.includes(d))
  if (gaps.length) out.push({ id: 'docs', cite: 'NDCT Rules, rule 21; Second Schedule', text: `The application is incomplete: ${gaps.map((g) => SECOND_SCHEDULE.find((d) => d.id === g)!.title.toLowerCase()).join('; ')}.`, options: [{ id: 'provide', label: 'Submit the missing documents through SUGAM' }, { id: 'later', label: 'Undertake to submit them before the first participant' }], correct: 'provide' })
  if (f.icf === 'english') out.push({ id: 'icf', cite: 'NDCT Rules, Third Schedule (informed consent)', text: 'The participant information sheet and consent form must be in a language the participant understands, with every Third Schedule element.', options: [{ id: 'local', label: 'Provide the consent documents in English and the local language of each site' }, { id: 'keep', label: 'Keep English: the investigator explains orally' }], correct: 'local' })
  if (!f.av) out.push({ id: 'av', cite: 'NDCT Rules, Third Schedule', text: 'For a new chemical entity, the informed consent process of vulnerable participants must also be recorded on audio and video, and the record kept.', options: [{ id: 'add', label: 'Add audio-video recording of consent for vulnerable participants' }, { id: 'none', label: 'Reply that no vulnerable participants will be enrolled, without changing the criteria' }], correct: 'add' })
  if (!f.compensation) out.push({ id: 'comp', cite: 'NDCT Rules, rule 39(5)', text: 'The application must include the sponsor’s undertaking to provide compensation for trial-related injury or death under Chapter VI.', options: [{ id: 'give', label: 'Submit the compensation undertaking' }, { id: 'insurance', label: 'Submit the insurance certificate instead' }], correct: 'give' })
  return out
}

export interface InAnswers { queries: Record<string, string>; reconsider: boolean; fixLate?: boolean }
export const EMPTY_IN_ANSWERS: InAnswers = { queries: {}, reconsider: false }
export interface InEvent { wd: number; day: number; text: string; kind: 'info' | 'request' | 'refusal' | 'ok' }
export interface InOutcome {
  stage: 'queries' | 'rejected' | 'decided'
  events: InEvent[]
  findings: InFinding[]
  permitDay: number                // calendar day of CT-06 (or deemed permission)
  firstPatientDay: number
  deemed: boolean
  rejected: boolean
  blocked: string[]                // problems that stop the first enrolment even with permission
  segments: { from: number; to: number; kind: string; label: string }[]
  correctedChoices: Choices
}

export const cal = (wd: number) => Math.round((wd * 7) / 5)
const QUERY_WD = 30, REPLY_WD = 15, RECONSIDER_WD = 30, EC_WD = 15, CTRI_WD = 10  // all but the Rules' limits are indicative

export function runIndia(s: Scenario, c: Choices, f: InForm, ans: InAnswers): InOutcome {
  const india = f.discovery === 'india'
  const limit = india ? 30 : 90
  const events: InEvent[] = []
  const ev = (wd: number, text: string, kind: InEvent['kind']) => events.push({ wd, day: cal(wd), text, kind })
  const corrected: Choices = { ...c }
  const findings = inFindings(s, c, f)
  ev(0, `Form CT-04 submitted on SUGAM with the Second Schedule documents (rule 21). The Central Licensing Authority has ${limit} working days to decide (rule ${india ? '23: a drug discovered and developed in India' : '22'}).`, 'info')
  const segments: InOutcome['segments'] = []
  const blocked: string[] = []
  if (f.ec === 'unregistered') blocked.push('The ethics committee is not registered with the Central Licensing Authority: its approval is not valid (rules 7 and 8). Register it (CT-01; decision within 45 working days) or use a registered committee.')
  if (f.ctri === 'after') blocked.push('The trial must be registered in CTRI before the first participant is enrolled (rule 25).')
  const base = { findings, correctedChoices: corrected, blocked }

  let permitWd: number
  let deemed = false
  let rejected = false
  if (!findings.length) {
    if (india) { permitWd = 30; deemed = true; ev(30, 'No reply within 30 working days: permission is deemed granted (rule 23). The sponsor files Form CT-4A before starting.', 'ok') }
    else { permitWd = 90; ev(90, 'The Subject Expert Committee recommends approval; permission granted in Form CT-06 at the 90-working-day limit.', 'ok') }
    segments.push({ from: 0, to: cal(permitWd), kind: 'review', label: deemed ? 'Review: 30 working days, deemed approval' : 'CDSCO and SEC review' })
  } else {
    const qWd = india ? 15 : QUERY_WD
    ev(qWd, `Query from CDSCO after the Subject Expert Committee meeting: ${findings.length} point${findings.length > 1 ? 's' : ''}. The review clock pauses while the sponsor answers.`, 'request')
    if (findings.some((x) => !ans.queries[x.id])) return { ...base, stage: 'queries', events, permitDay: -1, firstPatientDay: -1, deemed, rejected, segments: [{ from: 0, to: cal(qWd), kind: 'review', label: 'Review' }] }
    const fails = findings.filter((x) => ans.queries[x.id] !== x.correct)
    for (const x of findings) if (ans.queries[x.id] === x.correct && x.decisionId) corrected[x.decisionId] = x.correct
    const replyWd = qWd + REPLY_WD
    ev(replyWd, `The sponsor answers the query. ${findings.length - fails.length} of ${findings.length} points resolved.`, fails.length ? 'request' : 'ok')
    const decideWd = replyWd + (limit - qWd)  // the clock resumes where it paused
    segments.push({ from: 0, to: cal(qWd), kind: 'review', label: 'Review' }, { from: cal(qWd), to: cal(replyWd), kind: 'request', label: 'Query: clock paused' }, { from: cal(replyWd), to: cal(decideWd), kind: 'review', label: 'Review resumes' })
    if (fails.length) {
      rejected = true
      ev(decideWd, `Application rejected, with reasons in writing (rule 22): ${fails.map((x) => x.id).join(', ')} not resolved. The sponsor may ask for reconsideration within 60 working days.`, 'refusal')
      if (!ans.reconsider) return { ...base, stage: 'rejected', events, permitDay: -1, firstPatientDay: -1, deemed, rejected, segments: [...segments, { from: cal(decideWd), to: cal(decideWd) + 3, kind: 'refused', label: 'Rejected' }] }
      for (const x of fails) if (x.decisionId) corrected[x.decisionId] = x.correct
      const reqWd = decideWd + 10
      permitWd = reqWd + RECONSIDER_WD
      ev(reqWd, 'Request for reconsideration filed with the fixes and the fee.', 'info')
      ev(permitWd, 'On reconsideration, permission granted in Form CT-06.', 'ok')
      segments.push({ from: cal(decideWd), to: cal(reqWd), kind: 'resubmission', label: 'Rejected; reconsideration prepared' }, { from: cal(reqWd), to: cal(permitWd), kind: 'review', label: 'Reconsideration (indicative)' })
    } else {
      permitWd = decideWd
      ev(permitWd, 'Permission granted in Form CT-06. Valid for two years (rule 26).', 'ok')
    }
  }
  // The ethics committee reviews in parallel with CDSCO; CTRI registration follows permission.
  const ecOk = f.ec === 'registered'
  ev(20, ecOk ? 'The registered ethics committee approves the protocol at the site, in parallel with CDSCO’s review; CDSCO is told within 15 working days.' : 'The institutional committee approves the protocol, but it is not registered: its approval is not valid.', ecOk ? 'ok' : 'refusal')
  let readyWd = permitWd
  if (ans.fixLate && !ecOk) { readyWd += EC_WD; ev(readyWd, 'A registered ethics committee approves the protocol after the sponsor moves the review to it.', 'ok'); blocked.splice(0, blocked.length, ...blocked.filter((x) => !/ethics committee/.test(x))) }
  if (ans.fixLate) for (let i = blocked.length - 1; i >= 0; i--) if (/CTRI/.test(blocked[i])) blocked.splice(i, 1)
  const ctriOk = f.ctri === 'before' || !!ans.fixLate
  const ctriWd = readyWd + CTRI_WD
  ev(ctriWd, ctriOk ? 'Trial registered in CTRI.' : 'No CTRI registration yet: enrolment cannot start.', ctriOk ? 'ok' : 'refusal')
  segments.push({ from: cal(permitWd), to: cal(ctriWd), kind: 'activation', label: 'CTRI registration and site activation' })
  if (blocked.length) {
    ev(ctriWd, 'First enrolment blocked until the problems are fixed.', 'refusal')
    return { ...base, stage: 'decided', events, permitDay: cal(permitWd), firstPatientDay: -1, deemed, rejected, segments }
  }
  ev(ctriWd + 5, 'First participant enrolled.', 'ok')
  return { ...base, stage: 'decided', events, permitDay: cal(permitWd), firstPatientDay: cal(ctriWd + 5), deemed, rejected, segments }
}

// ---------------------------------------------------------------------- compensation (Chapter VI)
// Seventh Schedule. Death: B x F x R / 99.37, with B = Rs 8 lakh, F the age factor (Employees'
// Compensation Act table) and R the risk factor from 0.5 to 4. Permanent disability: C x D x 90 /
// (100 x 100). Non-permanent injury: 2 x W x N (W the minimum daily wage of an unskilled worker in
// Delhi, N the days of hospitalisation). Congenital anomaly: half the base amount.
export const BASE = 800000
export const AGE_FACTOR: Record<number, number> = { 16: 228.54, 30: 207.98, 40: 184.17, 65: 99.37 }
export const RISK_FACTOR = [
  { r: 0.5, label: 'Terminally ill (expected survival up to 6 months)' },
  { r: 1, label: 'High risk (expected survival 6 to 24 months)' },
  { r: 2, label: 'Moderate risk' },
  { r: 3, label: 'Mild risk' },
  { r: 4, label: 'Healthy volunteer, or no risk' },
]
export const deathComp = (age: number, r: number) => Math.round((BASE * AGE_FACTOR[age] * r) / 99.37)
export const disabilityComp = (c: number, pct: number) => Math.round((c * pct * 90) / (100 * 100))
export const injuryComp = (wage: number, days: number) => 2 * wage * days
export const rupees = (n: number) => `Rs ${n.toLocaleString('en-IN')}`
