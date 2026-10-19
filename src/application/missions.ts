// IND missions. The two IND missions use real programs from the simulator with a fixed Phase I
// design; the other two are short decision exercises.
import type { Choices } from '../data/ct-types'
import type { IndSummary } from './IndStep'

export interface QuizItem { id: string; prompt: string; options: string[]; answer: string; explain: string }

export interface IndMission {
  id: string
  title: string
  brief: string
  kind: 'ind' | 'quiz'
  scenarioId?: string
  design?: Choices
  score?: (s: IndSummary) => number
  items?: QuizItem[]
}

const EXEMPT = 'Exempt from an IND (21 CFR 312.2(b))'
const NEEDED = 'IND required'

export const IND_MISSIONS: IndMission[] = [
  {
    id: 'clean-ind', kind: 'ind', title: 'Open a first-in-human IND without a hold', scenarioId: 'vasclarin',
    brief: 'Vasclarin (VSC-9), a fictional once-daily oral antihypertensive, has a sound Phase I design: healthy volunteers, a NOAEL-based start, accelerated titration with sentinel dosing, 18 to 30 subjects and a protocol-defined DLT. Build the IND so that FDA has nothing to ask and the study can start on day 30.',
    design: { p1_dose: 'noael', p1_escalation: 'accelerated', p1_population: 'healthy', p1_n: 'small', p1_dlt: 'prespecified' },
    score: (s) => Math.max(0, 100 - 15 * s.requests - 40 * s.holdCycles),
  },
  {
    id: 'clear-hold', kind: 'ind', title: 'Clear a clinical hold in one cycle', scenarioId: 'tregolimab',
    brief: 'Tregolimab (TGL-11) is a fictional agonist antibody with a high first-in-human risk. A colleague locked the Phase I protocol with a NOAEL-based starting dose and accelerated titration. Submit the IND, then answer FDA so that the hold is lifted after a single complete response.',
    design: { p1_dose: 'noael', p1_escalation: 'accelerated', p1_population: 'patients', p1_n: 'small', p1_dlt: 'prespecified' },
    score: (s) => (s.proceedDay < 0 ? 0 : s.holdCycles <= 1 ? 100 - 10 * s.requests : Math.max(0, 100 - 35 * (s.holdCycles - 1) - 10 * s.requests)),
  },
  {
    id: 'exempt', kind: 'quiz', title: 'IND or exempt?',
    brief: 'An investigation of a lawfully marketed drug can be exempt from an IND only if every condition in 21 CFR 312.2(b)(1) is met. Decide for each study.',
    items: [
      { id: 'e1', prompt: 'An academic group compares two approved antihypertensives at their labelled doses in adults, for a journal article. No labelling change is planned; IRB approval and consent are in place.', options: [EXEMPT, NEEDED], answer: EXEMPT, explain: 'All conditions of 312.2(b)(1) are met: a marketed drug, no new indication or labelling change sought, no factor that significantly increases risk, IRB and consent in place, no promotion.' },
      { id: 'e2', prompt: 'The manufacturer studies its approved drug in a new indication to support a supplemental application.', options: [EXEMPT, NEEDED], answer: NEEDED, explain: 'The study is intended to support a new indication (312.2(b)(1)(i)), so an IND is needed.' },
      { id: 'e3', prompt: 'An investigator gives an approved oncology drug to children at twice the labelled adult dose.', options: [EXEMPT, NEEDED], answer: NEEDED, explain: 'The dose and the population significantly increase the risk (312.2(b)(1)(iii)).' },
      { id: 'e4', prompt: 'A company gives a new molecular entity to healthy volunteers for the first time.', options: [EXEMPT, NEEDED], answer: NEEDED, explain: 'The exemption covers only lawfully marketed drugs; an unapproved new drug always needs an IND before use in humans.' },
      { id: 'e5', prompt: 'A hospital study gives an approved oral drug intravenously to test faster onset.', options: [EXEMPT, NEEDED], answer: NEEDED, explain: 'A new route of administration that significantly increases risk takes the study outside the exemption (312.2(b)(1)(iii)).' },
    ],
  },
  {
    id: 'ectd', kind: 'quiz', title: 'File the IND in eCTD',
    brief: 'Your IND goes to FDA as eCTD sequence 0000. Place each document in its node of the US Module 1 or the CTD.',
    items: [
      ['Form FDA 1571', '1.1 Forms', 'Forms go in 1.1: Form FDA 1571, and also Forms 1572 and 3674.'],
      ['Cover letter for the initial IND', '1.2 Cover Letters', 'Every sequence has its cover letter in 1.2.'],
      ['Introductory statement and general investigational plan', '1.20 General Investigational Plan for Initial IND', 'Node 1.20 exists for the initial IND’s plan.'],
      ["Investigator's brochure", '1.14.4.1 Investigational Brochure', 'The brochure sits under investigational drug labeling, 1.14.4.1.'],
      ['Investigational drug labels', '1.14.4.2 Investigational Drug Labeling', 'Labels for the investigational product go in 1.14.4.2.'],
      ['Protocol for the first-in-human study in healthy volunteers', '5.3.3.1 Healthy Subject PK and Initial Tolerability Study Reports', 'Protocols go in Module 5 under the study type; a healthy-volunteer phase 1 is 5.3.3.1.'],
      ['Nonclinical overview', '2.4 Nonclinical Overview', 'The overview is in Module 2.4; the study reports are in Module 4.'],
      ['Minutes of the pre-IND meeting', '1.12.1 Pre IND Correspondence', 'Pre-IND correspondence has its own node, 1.12.1.'],
    ].map(([doc, node, why], i) => ({ id: `x${i}`, prompt: `Where does this go: ${doc}?`, options: ['1.1 Forms', '1.2 Cover Letters', '1.12.1 Pre IND Correspondence', '1.14.4.1 Investigational Brochure', '1.14.4.2 Investigational Drug Labeling', '1.20 General Investigational Plan for Initial IND', '2.4 Nonclinical Overview', '5.3.3.1 Healthy Subject PK and Initial Tolerability Study Reports'], answer: node, explain: why })),
  },
]
