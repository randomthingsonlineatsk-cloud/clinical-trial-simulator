// IND missions. The two IND missions use real programs from the simulator with a fixed Phase I
// design; the other two are short decision exercises.
import type { Choices } from '../data/ct-types'
import type { IndSummary } from './IndStep'
import type { EuSummary } from './EuStep'
import type { EuForm } from './eu'
import type { IndiaSummary } from './IndiaStep'
import type { RegionsResult } from './RegionsStep'
import { CHANGES, US_OPTS, EU_OPTS, IN_OPTS } from './amend'
import { deathComp, disabilityComp, injuryComp, rupees } from './india'

export interface QuizItem { id: string; prompt: string; options: string[]; answer: string; explain: string }

export interface IndMission {
  id: string
  title: string
  brief: string
  kind: 'ind' | 'eu' | 'india' | 'regions' | 'quiz'
  region: 'US' | 'EU' | 'IN' | 'MORE' | 'ALL'
  scenarioId?: string
  design?: Choices
  score?: (s: IndSummary) => number
  euInitial?: Partial<EuForm>
  euScore?: (s: EuSummary) => number
  inScore?: (s: IndiaSummary) => number
  regionsScore?: (r: RegionsResult) => number
  items?: QuizItem[]
}

const EXEMPT = 'Exempt from an IND (21 CFR 312.2(b))'
const NEEDED = 'IND required'

export const IND_MISSIONS: IndMission[] = [
  {
    id: 'clean-ind', kind: 'ind', region: 'US', title: 'Open a first-in-human IND without a hold', scenarioId: 'vasclarin',
    brief: 'Vasclarin (VSC-9), a fictional once-daily oral antihypertensive, has a sound Phase I design: healthy volunteers, a NOAEL-based start, accelerated titration with sentinel dosing, 18 to 30 subjects and a protocol-defined DLT. Build the IND so that FDA has nothing to ask and the study can start on day 30.',
    design: { p1_dose: 'noael', p1_escalation: 'accelerated', p1_population: 'healthy', p1_n: 'small', p1_dlt: 'prespecified' },
    score: (s) => Math.max(0, 100 - 15 * s.requests - 40 * s.holdCycles),
  },
  {
    id: 'clear-hold', kind: 'ind', region: 'US', title: 'Clear a clinical hold in one cycle', scenarioId: 'tregolimab',
    brief: 'Tregolimab (TGL-11) is a fictional agonist antibody with a high first-in-human risk. A colleague locked the Phase I protocol with a NOAEL-based starting dose and accelerated titration. Submit the IND, then answer FDA so that the hold is lifted after a single complete response.',
    design: { p1_dose: 'noael', p1_escalation: 'accelerated', p1_population: 'patients', p1_n: 'small', p1_dlt: 'prespecified' },
    score: (s) => (s.proceedDay < 0 ? 0 : s.holdCycles <= 1 ? 100 - 10 * s.requests : Math.max(0, 100 - 35 * (s.holdCycles - 1) - 10 * s.requests)),
  },
  {
    id: 'exempt', kind: 'quiz', region: 'US', title: 'IND or exempt?',
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
    id: 'ectd', kind: 'quiz', region: 'US', title: 'File the IND in eCTD',
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
  {
    id: 'eu-startup', kind: 'eu', region: 'EU', title: 'Run a three-country EU start-up', scenarioId: 'vasclarin',
    brief: 'Vasclarin (VSC-9) will start its first-in-human trial at fictional units in Germany, Spain and the Netherlands. Build one CTIS application so that all three countries authorise the trial by day 60, with no request for information and the right transparency category.',
    design: { p1_dose: 'noael', p1_escalation: 'accelerated', p1_population: 'healthy', p1_n: 'small', p1_dlt: 'prespecified' },
    euInitial: { countries: ['DE', 'ES', 'NL'], rms: 'DE' },
    euScore: (s) => s.lapsed ? 0 : Math.max(0, 100 - 10 * s.rfis - 30 * s.refusals - (s.categoryOk ? 0 : 10) - Math.max(0, Math.round((s.firstPatientDay - 74) / 3))),
  },
  {
    id: 'part-i-ii', kind: 'quiz', region: 'EU', title: 'Part I or Part II?',
    brief: 'Under the CTR, Part I is assessed jointly for all member states, led by the reporting member state; Part II is assessed by each member state, with its ethics committee. Sort ten documents (CTR Annex I).',
    items: [
      ['The protocol', 'Part I (assessed jointly, led by the reporting member state)', 'Annex I, D: the protocol is the core of Part I.'],
      ["The investigator's brochure", 'Part I (assessed jointly, led by the reporting member state)', 'Annex I, E.'],
      ['The IMPD', 'Part I (assessed jointly, led by the reporting member state)', 'Annex I, G: quality, nonclinical and clinical data on the product.'],
      ['The labelling of the investigational medicinal product', 'Part I (assessed jointly, led by the reporting member state)', 'Annex I, J and Annex VI. The language is set by each country, but the content is assessed in Part I.'],
      ['Subject information and the informed consent form', 'Part II (assessed by each member state concerned)', 'Annex I, L: national, in the language of the subjects.'],
      ['Proof of insurance or indemnity', 'Part II (assessed by each member state concerned)', 'Annex I, O and Article 76: national law decides what is adequate.'],
      ['Suitability of the site, signed by the head of the institution', 'Part II (assessed by each member state concerned)', 'Annex I, N.'],
      ['Recruitment arrangements and advertisements', 'Part II (assessed by each member state concerned)', 'Annex I, K.'],
      ['Documentation of GMP compliance for the product', 'Part I (assessed jointly, led by the reporting member state)', 'Annex I, F.'],
      ['Payments to subjects and investigators', 'Part II (assessed by each member state concerned)', 'Annex I, P: financial and other arrangements.'],
    ].map(([doc, part, why], i) => ({ id: `pp${i}`, prompt: `Where is this assessed: ${doc}?`, options: ['Part I (assessed jointly, led by the reporting member state)', 'Part II (assessed by each member state concerned)'], answer: part, explain: why })),
  },
  {
    id: 'eu-clock', kind: 'quiz', region: 'EU', title: 'The CTR clock and transparency',
    brief: 'Answer six questions on the EU clock (CTR Articles 5 to 8 and 37) and on what CTIS publishes under the 2024 transparency rules.',
    items: [
      { id: 'c1', prompt: 'How long does the reporting member state have to validate the application?', options: ['5 days', '10 days', '26 days', '45 days'], answer: '10 days', explain: 'CTR Article 5(3). If the dossier is incomplete, the sponsor has 10 days to complete it and the RMS 5 more days to confirm.' },
      { id: 'c2', prompt: 'How long is the Part I assessment without questions?', options: ['30 days', '45 days', '60 days', '76 days'], answer: '45 days', explain: 'CTR Article 6(4): initial assessment 26 days, coordinated review 12 days, consolidation 7 days.' },
      { id: 'c3', prompt: 'A request for information can extend the assessment by up to how long, and how long does the sponsor have to answer?', options: ['31 days; 12 days to answer', '50 days; 30 days to answer', '15 days; 5 days to answer', 'No extension; 10 days to answer'], answer: '31 days; 12 days to answer', explain: 'CTR Article 6(8) and 7(2). Without an answer in time, the application lapses.' },
      { id: 'c4', prompt: 'How long is the longest standard clock, with questions at validation and assessment?', options: ['60 days', '76 days', '106 days', '150 days'], answer: '106 days', explain: '10 + 10 + 5 days of validation, 45 + 31 days of assessment and 5 days for the decision. Advanced therapies can add 50 days.' },
      { id: 'c5', prompt: 'A first-in-human trial in adults is in which CTIS transparency category?', options: ['Category 1', 'Category 2', 'Category 3'], answer: 'Category 1', explain: 'Phase I trials are category 1: the structured data are public at the decision, and the protocol and other documents 30 months after the trial ends (adult trials).' },
      { id: 'c6', prompt: 'When are the summary of results and the lay summary due?', options: ['Within 6 months of the decision', 'Within 12 months of the end of the trial', 'At the marketing authorisation', 'Only if the trial is positive'], answer: 'Within 12 months of the end of the trial', explain: 'CTR Article 37(4), whatever the outcome of the trial.' },
    ],
  },
  {
    id: 'india-cta', kind: 'india', region: 'IN', title: 'Start in India without a query', scenarioId: 'vasclarin',
    brief: 'Vasclarin (VSC-9), discovered outside India, will also run its first-in-human trial at a fictional unit in India. Apply on Form CT-04 so that CDSCO has nothing to ask, the site’s ethics committee approval is valid and the trial is in CTRI before the first participant: first participant by about day 147.',
    design: { p1_dose: 'noael', p1_escalation: 'accelerated', p1_population: 'healthy', p1_n: 'small', p1_dlt: 'prespecified' },
    inScore: (s) => s.firstPatientDay < 0 ? 0 : Math.max(0, 100 - 10 * s.queries - 30 * (s.rejected ? 1 : 0) - Math.max(0, Math.round((s.firstPatientDay - 147) / 3))),
  },
  {
    id: 'india-safety', kind: 'quiz', region: 'IN', title: 'India: safety, compensation and academic trials',
    brief: 'India’s Chapter VI sets deadlines for serious adverse events and a formula for compensation. Answer seven questions; the case is fictional.',
    items: [
      { id: 's1', prompt: 'How soon must the investigator report a serious adverse event to CDSCO, the sponsor and the ethics committee?', options: ['24 hours', '7 days', '14 days', '30 days'], answer: '24 hours', explain: 'NDCT Rules, rule 42. The report after due analysis follows within 14 days, and the ethics committee reports to CDSCO within 30 days.' },
      { id: 's2', prompt: 'After CDSCO orders compensation, how long does the sponsor have to pay?', options: ['7 days', '30 days', '90 days', 'Six months'], answer: '30 days', explain: 'CDSCO orders the amount within 90 days; the sponsor pays within 30 days of the order (rule 42).' },
      { id: 's3', prompt: `A 30-year-old healthy volunteer dies of a trial-related cause. Base amount Rs 8 lakh, age factor 207.98, risk factor 4. What is the compensation?`, options: [rupees(deathComp(30, 4)), rupees(deathComp(30, 1)), rupees(800000), rupees(Math.round(deathComp(30, 4) / 2))], answer: rupees(deathComp(30, 4)), explain: `Seventh Schedule: B × F × R / 99.37 = 8,00,000 × 207.98 × 4 / 99.37 = ${rupees(deathComp(30, 4))}. Healthy volunteers carry the highest risk factor, 4.` },
      { id: 's4', prompt: 'The same participant is left with a 40% permanent disability instead. What is the compensation?', options: [rupees(disabilityComp(deathComp(30, 4), 40)), rupees(Math.round(deathComp(30, 4) * 0.4)), rupees(deathComp(30, 4)), rupees(400000)], answer: rupees(disabilityComp(deathComp(30, 4), 40)), explain: `C × D × 90 / (100 × 100), with C the death compensation: ${rupees(deathComp(30, 4))} × 40 × 90 / 10,000 = ${rupees(disabilityComp(deathComp(30, 4), 40))}.` },
      { id: 's5', prompt: 'A participant is in hospital for 6 days with a reversible, trial-related injury. With a minimum daily wage of Rs 800 (a figure for this exercise), what is the compensation, on top of free medical management?', options: [rupees(injuryComp(800, 6)), rupees(800 * 6), rupees(injuryComp(800, 6) * 2), 'Nothing: medical management only'], answer: rupees(injuryComp(800, 6)), explain: 'Non-permanent injury: 2 × W × N = 2 × 800 × 6. Medical management is free and comes in addition (rule 40).' },
      { id: 's6', prompt: 'A hospital tests an approved drug by a new route, for a journal paper only, with ethics committee approval. Does it need CDSCO permission?', options: ['No: it is an academic clinical trial (rule 28)', 'Yes: every trial needs Form CT-04', 'Only if it has more than 100 participants', 'Only CTRI registration'], answer: 'No: it is an academic clinical trial (rule 28)', explain: 'An academic trial of an approved drug for a new indication, route, dose or dosage form, with ethics committee approval and results not used for approval or promotion, needs no permission. If the committee doubts whether it overlaps with a regulatory trial, it asks CDSCO, which answers within 30 working days.' },
      { id: 's7', prompt: 'How long is an ethics committee’s registration (Form CT-02) valid?', options: ['Two years', 'Three years', 'Five years', 'Without limit'], answer: 'Five years', explain: 'NDCT Rules, rule 9; renewal is applied for 90 days before it expires (rule 10).' },
    ],
  },
  {
    id: 'five-regions', kind: 'regions', region: 'MORE', title: 'Five more countries, one protocol', scenarioId: 'vasclarin',
    brief: 'Vasclarin (VSC-9) will also start in the UK, Canada, Australia, Japan and China. Apply in all five so that none raises a question, none objects and nothing blocks the first participant.',
    design: { p1_dose: 'noael', p1_escalation: 'accelerated', p1_population: 'healthy', p1_n: 'small', p1_dlt: 'prespecified' },
    regionsScore: (r) => Math.max(0, 100 - r.summaries.reduce((t, x) => t + 4 * x.questions + (x.objection ? 25 : 0) + (x.firstPatientDay < 0 ? 20 : 0), 0)),
  },
  {
    id: 'pick-route', kind: 'quiz', region: 'MORE', title: 'Pick the route and the clock',
    brief: 'Six questions on the routes and clocks of the UK, Canada, Australia, Japan and China.',
    items: [
      { id: 'r1', prompt: 'UK: may a first-in-human trial use the 14-day notifiable scheme?', options: ['No: it is for the lowest-risk trials, such as some phase 3 and 4 trials', 'Yes, if the ethics committee agrees', 'Yes, always', 'Only in Scotland'], answer: 'No: it is for the lowest-risk trials, such as some phase 3 and 4 trials', explain: 'The notifiable scheme covers the lowest-risk trials; everything else goes to the combined review: validation in 7 days and a decision within 30.' },
      { id: 'r2', prompt: 'UK: after a request for further information, how long do the sponsor and then the regulators have?', options: ['60 days to answer; a decision within 10 days', '12 days to answer; 31 more days', '30 days; 30 days', 'No limit'], answer: '60 days to answer; a decision within 10 days', explain: 'Under the regulations in force since 28 April 2026.' },
      { id: 'r3', prompt: 'Canada: when may a trial proceed?', options: ['If Health Canada does not object within 30 days of a complete application, with REB approval at each site', 'Only after a written approval letter, usually within 90 days', 'Immediately after REB approval', 'After 60 working days'], answer: 'If Health Canada does not object within 30 days of a complete application, with REB approval at each site', explain: 'Food and Drug Regulations, C.05.006; Health Canada usually sends a no objection letter.' },
      { id: 'r4', prompt: 'Australia: under the CTN scheme, who reviews the scientific data?', options: ['The HREC and the sponsor; the TGA is only notified', 'The TGA, in 50 working days', 'The site’s pharmacy', 'Nobody'], answer: 'The HREC and the sponsor; the TGA is only notified', explain: 'Under the CTA scheme the TGA evaluates the data; most trials use the CTN scheme.' },
      { id: 'r5', prompt: 'Japan: what happens after the first clinical trial notification for a product?', options: ['PMDA has 30 days to review before the trial may start', 'The trial may start the next day', 'MHLW approves within 90 days', 'Nothing: Japan has no notification'], answer: 'PMDA has 30 days to review before the trial may start', explain: 'PMD Act, article 80-2; later notifications for the product do not all trigger a new 30-day hold.' },
      { id: 'r6', prompt: 'China: what is the standard clock for a drug clinical trial application?', options: ['Implied approval if the CDE raises no objection within 60 working days', '30 calendar days', '90 days with an approval letter', '45 working days'], answer: 'Implied approval if the CDE raises no objection within 60 working days', explain: 'An expedited 30-working-day track exists for eligible innovative drugs (Announcement No. 86 of 2025).' },
    ],
  },
  {
    id: 'amendments', kind: 'quiz', region: 'ALL', title: 'Classify the changes',
    brief: 'Your phase 1 trial runs in the US, the EU and India. Six things happen. For each, decide what the rules require in the region named.',
    items: [pick('cohort', 'us'), pick('cohort', 'eu'), pick('site', 'us'), pick('site', 'eu'), pick('site', 'in'), pick('rsi', 'eu'), pick('typo', 'eu'), pick('liver', 'us'), pick('liver', 'eu'), pick('liver', 'in'), pick('age', 'us')],
  },
]

function pick(id: string, region: 'us' | 'eu' | 'in'): QuizItem {
  const c = CHANGES.find((x) => x.id === id)!
  const name = { us: 'the US', eu: 'the EU', in: 'India' }[region]
  return { id: `${id}-${region}`, prompt: `${c.text} What is needed in ${name}?`, options: region === 'us' ? US_OPTS : region === 'eu' ? EU_OPTS : IN_OPTS, answer: c[region], explain: c.why[region] }
}
