import { buildDecisions, p1SizeBand } from './ct-decisions'
import { getRegulator } from './ct-regulators'
import type { Choices, FinalReport, FinalVerdict, Grade, PatientFlow, PhaseOutcome, Scenario } from './ct-types'

// ---------------------------------------------------------------------------
// Deterministic seeded RNG
// ---------------------------------------------------------------------------
export function makeSeed(): number {
  return Math.floor(Math.random() * 2_147_483_646) + 1
}
function rng(seed: number, salt: number) {
  let s = (seed * 1103515245 + salt * 12345 + 7) % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const REF = {
  e6: 'ICH E6 (R2) GCP §2 — risk/benefit and subject protection',
  e8: 'ICH E8 (R1) — general considerations for clinical studies',
  e9: 'ICH E9 — statistical principles for clinical trials',
  e10: 'ICH E10 — choice of control group',
  fih: 'First-in-human risk-mitigation principles (MABEL, sentinel dosing, staggering)',
  e4: 'ICH E4 — dose-response information',
  platform: 'Platform-specific vaccine science',
}

function pts(v: Grade['verdict']) {
  return v === 'best' ? 2 : v === 'acceptable' ? 1 : 0
}

export function gradePhase(scenario: Scenario, phase: 'p1' | 'p2' | 'p3', choices: Choices): Grade[] {
  const decisions = buildDecisions(scenario, phase)
  const out: Grade[] = []
  for (const d of decisions) {
    const chosen = choices[d.id]
    if (!chosen) continue
    const option = d.options.find((o) => o.id === chosen)
    const { verdict, explanation, reference } = judge(scenario, d.id, chosen, choices)
    out.push({ decisionId: d.id, phase, title: d.title, chosenLabel: option?.label ?? chosen, verdict, points: pts(verdict), maxPoints: 2, reference, explanation })
  }
  return out
}

function judge(s: Scenario, id: string, c: string, all: Choices): { verdict: Grade['verdict']; explanation: string; reference: string } {
  if (s.special && id === s.special.id) {
    if (c === s.special.correctOptionId) return { verdict: 'best', reference: REF.platform, explanation: s.special.correctWhy }
    return { verdict: 'poor', reference: REF.platform, explanation: s.special.wrongWhy }
  }

  switch (id) {
    case 'p1_dose': {
      if (c === 'aggressive') return { verdict: 'poor', reference: REF.fih, explanation: 'Starting at the projected therapeutic dose removes the entire safety margin a first-in-human study exists to establish, with no dose-escalation data below it to interpret the first serious toxicity.' }
      if (c === s.startingDoseBasis) return { verdict: 'best', reference: REF.fih, explanation: s.startingDoseWhy }
      if (s.startingDoseBasis === 'mabel') return { verdict: 'poor', reference: REF.fih, explanation: `A NOAEL-derived dose is the wrong anchor here. ${s.startingDoseWhy}` }
      return { verdict: 'acceptable', reference: REF.fih, explanation: `A MABEL-anchored start is not wrong, just more conservative than this risk profile requires. ${s.startingDoseWhy}` }
    }
    case 'p1_escalation': {
      if (c === s.escalation) return { verdict: 'best', reference: REF.e4, explanation: s.escalationWhy }
      if (s.platformGroup.startsWith('vaccine') && c !== 'fixed_cohort') return { verdict: 'poor', reference: REF.e4, explanation: `Applying a toxicity-seeking dose-escalation design to a vaccine is conceptually mismatched — there is no maximum tolerated dose being sought. ${s.escalationWhy}` }
      if (c === 'accelerated' && s.fihRisk === 'high') return { verdict: 'poor', reference: REF.fih, explanation: `Accelerated titration with single-subject cohorts and large increments is the wrong structure for a high-risk agent. ${s.escalationWhy}` }
      return { verdict: 'acceptable', reference: REF.e4, explanation: `Defensible, but not the best fit here. ${s.escalationWhy}` }
    }
    case 'p1_population': {
      if (c === s.p1Population) return { verdict: 'best', reference: REF.e6, explanation: s.p1PopulationWhy }
      if (s.p1Population === 'patients') return { verdict: 'poor', reference: REF.e6, explanation: `Ethical design error. ${s.p1PopulationWhy} An ethics committee would be expected to challenge this protocol.` }
      return { verdict: 'acceptable', reference: REF.e6, explanation: `Not unethical, but scientifically inefficient: concomitant medication and disease physiology confound the read-out Phase I exists to give you. ${s.p1PopulationWhy}` }
    }
    case 'p1_n': {
      const want = p1SizeBand(s)
      if (c === want) return { verdict: 'best', reference: REF.e8, explanation: want === 'medium' ? 'A first-in-human vaccine study needs enough participants across dose levels to characterize reactogenicity and immunogenicity.' : 'The conventional footprint: enough subjects for several dose levels without exposing more people than necessary before the dose-toxicity relationship is known.' }
      if (c === 'large') return { verdict: 'poor', reference: REF.e6, explanation: 'Exposing 200+ subjects in Phase I violates the principle of minimizing exposure before the dose-toxicity relationship is characterized.' }
      return { verdict: 'acceptable', reference: REF.e8, explanation: 'Workable, but not matched to what this design actually needs.' }
    }
    case 'p1_dlt': {
      if (c === 'prespecified') return { verdict: 'best', reference: REF.e9, explanation: 'A dose-limiting toxicity must be defined before the first subject is dosed — which toxicities count, at what grade, within what window — or the recommended dose cannot be reconstructed or defended.' }
      if (c === 'investigator') return { verdict: 'poor', reference: REF.e6, explanation: 'Leaving DLT adjudication to per-site judgment produces inconsistent escalation decisions and an MTD that cannot be reconstructed from the data.' }
      return { verdict: 'poor', reference: REF.e6, explanation: 'Counting only grade 4 events lets escalation continue straight through severe but non-life-threatening toxicity.' }
    }
    case 'p2_endpoint': {
      if (c === 'pd') return { verdict: 'poor', reference: REF.e8, explanation: 'Target engagement is a Phase I pharmacodynamic question, not a Phase II decision endpoint — a trial can succeed here while the drug does nothing for patients.' }
      if (c === s.p2Endpoint) return { verdict: 'best', reference: REF.e8, explanation: s.p2EndpointWhy }
      if (c === 'clinical') return { verdict: 'acceptable', reference: REF.e8, explanation: `Never wrong to measure clinical benefit directly, but inefficient here. ${s.p2EndpointWhy}` }
      return { verdict: 'poor', reference: REF.e8, explanation: `The surrogate is not the one accepted in this indication. ${s.p2EndpointWhy}` }
    }
    case 'p2_comparator': {
      if (c === s.p2Comparator) return { verdict: 'best', reference: REF.e10, explanation: s.p2ComparatorWhy }
      if (c === 'placebo' && s.socExists) return { verdict: 'poor', reference: REF.e10, explanation: `Ethical design error: an effective standard of care exists (${s.soc}) and this design withholds it. ${s.p2ComparatorWhy}` }
      if (c === 'single_arm' && s.p2Comparator !== 'single_arm') return { verdict: 'poor', reference: REF.e10, explanation: `A single-arm design cannot be interpreted here without a control to attribute any change to the drug. ${s.p2ComparatorWhy}` }
      return { verdict: 'acceptable', reference: REF.e10, explanation: s.p2ComparatorWhy }
    }
    case 'p2_blinding': {
      if (c === 'open_unblinded') return { verdict: 'poor', reference: REF.e9, explanation: 'An investigator-assessed endpoint in an unblinded trial is the classic recipe for an inflated effect estimate that a reviewer will discount.' }
      if (c === s.p2Blinding) return { verdict: 'best', reference: REF.e9, explanation: s.p2BlindingWhy }
      if (c === 'double_blind') return { verdict: 'acceptable', reference: REF.e9, explanation: `Never a scientific error, but adds burden without addressing the main bias here. ${s.p2BlindingWhy}` }
      return { verdict: 'poor', reference: REF.e9, explanation: `Open-label is not adequate for this endpoint. ${s.p2BlindingWhy}` }
    }
    case 'p2_ratio': {
      const singleArm = all['p2_comparator'] === 'single_arm'
      if (singleArm) return c === 'single_arm_na' ? { verdict: 'best', reference: REF.e9, explanation: 'Consistent with the single-arm design — no allocation to specify.' } : { verdict: 'poor', reference: REF.e9, explanation: 'Internally inconsistent: a randomization ratio was specified for a trial with no control arm.' }
      if (c === 'single_arm_na') return { verdict: 'poor', reference: REF.e9, explanation: 'A controlled design was chosen, then the randomization was removed — the protocol contradicts itself.' }
      if (c === '1_1') return { verdict: 'best', reference: REF.e9, explanation: '1:1 allocation maximizes power for a given total sample size.' }
      if (c === '2_1') return { verdict: 'acceptable', reference: REF.e9, explanation: '2:1 costs roughly 12% of the power of an equivalent 1:1 trial — a rational trade for a larger safety database if justified in the protocol.' }
      return { verdict: 'poor', reference: REF.e9, explanation: '3:1 allocation sacrifices real power (roughly a quarter of the effective sample size) for recruitment appeal alone.' }
    }
    case 'p2_size': {
      if (c === 'realistic') return { verdict: 'best', reference: REF.e9, explanation: 'Powering on the minimum clinically important difference gives a defensible effect estimate you can legitimately carry into Phase III sizing.' }
      if (c === 'optimistic') return { verdict: 'poor', reference: REF.e9, explanation: 'Animal-model effect magnitudes almost never translate intact — powering on them produces a false-negative-prone, uninterpretable trial.' }
      return { verdict: 'acceptable', reference: REF.e9, explanation: 'You will not miss a real effect, but you have built a Phase III-sized trial before knowing whether the drug works.' }
    }
    case 'p2_adaptive': {
      if (c === 'futility') return { verdict: 'best', reference: REF.e9, explanation: 'A non-binding futility interim protects patients and budget from a dead program without spending type I error.' }
      if (c === 'efficacy_alpha') return { verdict: 'acceptable', reference: REF.e9, explanation: 'Legitimate when pre-specified, but an early efficacy stop leaves a small, upward-biased effect estimate — a poor basis for sizing Phase III.' }
      if (c === 'none') return { verdict: 'acceptable', reference: REF.e9, explanation: 'Statistically clean, at the cost of running a futile trial to completion.' }
      return { verdict: 'poor', reference: REF.e9, explanation: 'Repeated unadjusted testing inflates the real false-positive rate well above 5%.' }
    }
    case 'p3_endpoint': {
      const ep = s.p3Endpoints.find((e) => e.id === c)
      return { verdict: ep?.correct ? 'best' : 'poor', reference: REF.e9, explanation: ep?.why ?? '' }
    }
    case 'p3_design': {
      if (c === 'ni_placebo') return { verdict: 'poor', reference: REF.e10, explanation: 'Non-inferiority to placebo is a logical impossibility as an efficacy claim — succeeding means only that the drug is no worse than nothing.' }
      if (c === s.p3Design) return { verdict: 'best', reference: REF.e10, explanation: s.p3DesignWhy }
      if (c === 'non_inferiority') return { verdict: 'poor', reference: REF.e10, explanation: `Non-inferiority is not defensible here and requires a margin justified from historical data plus demonstrated assay sensitivity. ${s.p3DesignWhy}` }
      return { verdict: 'acceptable', reference: REF.e10, explanation: `Superiority is always interpretable, though a harder bar than this program needs. ${s.p3DesignWhy}` }
    }
    case 'p3_size': {
      if (c === 'discounted') return { verdict: 'best', reference: REF.e9, explanation: 'Phase II effect estimates are systematically optimistic; discounting and adding attrition is the most reliable way to avoid an underpowered confirmatory trial.' }
      if (c === 'point_estimate') return { verdict: 'acceptable', reference: REF.e9, explanation: 'Common practice, but treats a noisy estimate as truth — if Phase II was even slightly optimistic, Phase III is underpowered.' }
      return { verdict: 'poor', reference: REF.e9, explanation: 'Sizing on an effect larger than anything observed is a design error a statistical reviewer finds immediately.' }
    }
    case 'p3_interim': {
      if (c === 'alpha_spending') return { verdict: 'best', reference: REF.e9, explanation: 'A pre-specified group-sequential plan with alpha-spending allows early looks without inflating the false-positive rate.' }
      if (c === 'single_final') return { verdict: 'acceptable', reference: REF.e9, explanation: 'Type I error is fully protected, at the cost of forgoing an early stop for benefit or futility.' }
      return { verdict: 'poor', reference: REF.e9, explanation: 'Unadjusted multiple looks plus co-primary endpoints leave the family-wise error rate uncontrolled.' }
    }
    case 'p3_inclusion': {
      if (c === 'broad') return { verdict: 'best', reference: REF.e8, explanation: 'The confirmatory population should resemble the people who will actually receive the drug, or the label cannot be written for them.' }
      if (c === 'enriched') return { verdict: 'acceptable', reference: REF.e8, explanation: 'Legitimate when the predictive marker is validated, but narrows the eventual label to the enriched population.' }
      return { verdict: 'poor', reference: REF.e8, explanation: 'An unrepresentative population undermines external validity to real clinical practice.' }
    }
  }
  return { verdict: 'acceptable', explanation: '', reference: REF.e8 }
}

function pickEvent(scenario: Scenario, u: number): string {
  const i = Math.floor(u * scenario.events.length)
  return scenario.events[i] ?? scenario.events[0] ?? ''
}

// ---------------------------------------------------------------------------
// Phase I
// ---------------------------------------------------------------------------
export function runPhase1(scenario: Scenario, c: Choices, seed: number): PhaseOutcome {
  const r = rng(seed, 11)
  const flags: string[] = []
  const narrative: string[] = []

  const doseTooHigh = c['p1_dose'] === 'aggressive' || (scenario.startingDoseBasis === 'mabel' && c['p1_dose'] === 'noael')
  const wrongPop = c['p1_population'] !== scenario.p1Population
  const weakDlt = c['p1_dlt'] !== 'prespecified'
  const escalationMismatch = c['p1_escalation'] !== scenario.escalation
  const nBand = c['p1_n'] ?? 'small'
  const want = p1SizeBand(scenario)
  const specialWrong = scenario.special ? c[scenario.special.id] !== scenario.special.correctOptionId : false

  let enrolled = nBand === 'small' ? 24 + Math.floor(r() * 7) : nBand === 'medium' ? 72 + Math.floor(r() * 21) : 210 + Math.floor(r() * 30)
  let discPct = 0.08 + r() * 0.05

  if (doseTooHigh) {
    flags.push('p1_toxicity_hold')
    discPct += 0.22
    narrative.push(`The first cohort is dosed with no human precedent for safety margin. Within 48 hours, multiple subjects develop severe, unanticipated toxicity. Enrollment is suspended and the program is placed on clinical hold.`)
    narrative.push(`This is the recurring historical lesson of first-in-human dosing: when the first dose is chosen for speed rather than a defensible safety margin, the trial's first signal is a serious adverse event rather than a pharmacokinetic curve.`)
    narrative.push('After a regulatory meeting, the protocol is rewritten with a far lower starting dose and mandatory staggering. Development continues, months late, with a permanent safety question on the file.')
  }
  if (wrongPop) {
    flags.push('p1_population_flag')
    discPct += scenario.p1Population === 'patients' ? 0.14 : 0.06
    narrative.push(scenario.p1Population === 'patients'
      ? `The ethics committee challenges the risk/benefit justification for exposing healthy volunteers. The protocol proceeds only after amendment, and the finding stays on the file.`
      : `Enrolling patients rather than healthy volunteers means concomitant medication and disease physiology sit on top of every pharmacokinetic sample, blurring the recommended dose.`)
  }
  if (weakDlt) {
    flags.push('p1_dlt_weak')
    discPct += 0.07
    narrative.push(c['p1_dlt'] === 'investigator' ? 'Without a protocol definition, two sites classify the same event differently, making the escalation record unreconstructable.' : 'Because only grade 4 events halt escalation, several subjects experience severe grade 3 toxicity while dosing continues upward.')
  }
  if (escalationMismatch) {
    flags.push('p1_escalation_suboptimal')
    narrative.push(`The escalation design works, but imprecisely for this agent. ${scenario.escalationWhy}`)
  }
  if (specialWrong && scenario.special) {
    flags.push('p1_special_flag')
    narrative.push(scenario.special.wrongWhy)
  }
  if (nBand !== want) flags.push('p1_size_mismatch')

  if (flags.length === 0) {
    narrative.push('Escalation proceeds cleanly through the pre-defined levels with a defensible exposure rationale, and pharmacodynamic sampling confirms the intended effect at the selected dose.')
  } else if (!doseTooHigh) {
    narrative.push('A recommended Phase II dose is ultimately declared, but with wider uncertainty than the program would like.')
  }
  narrative.push(pickEvent(scenario, r()))

  discPct = Math.min(discPct, 0.55)
  const discontinued = Math.round(enrolled * discPct)
  const completed = enrolled - discontinued
  const aeN = Math.max(1, Math.round(discontinued * (doseTooHigh ? 0.7 : 0.4)))
  const wdN = Math.max(1, Math.round(discontinued * 0.25))
  const reasons: { label: string; n: number }[] = [{ label: 'Adverse events', n: aeN }, { label: 'Withdrawal / lost to follow-up', n: wdN }]
  const other = Math.max(0, discontinued - aeN - wdN)
  if (other > 0) reasons.push({ label: 'Protocol deviation / eligibility', n: other })

  const status: PhaseOutcome['status'] = doseTooHigh ? 'failure' : flags.length ? 'mixed' : 'success'

  return {
    phase: 'p1', status,
    headline: doseTooHigh ? 'Clinical hold — unanticipated serious toxicity' : flags.length ? 'RP2D declared, with design findings on record' : 'MTD/RP2D successfully determined',
    narrative,
    regulatoryNote: doseTooHigh ? 'The first-in-human dose justification was inadequate; all subsequent dosing requires review of the revised plan.' : flags.length ? 'Dose selection is acceptable but identified weaknesses will be revisited at the end-of-Phase-II meeting.' : 'Dose selection, escalation and safety monitoring are adequate to support Phase II.',
    flow: { phase: 'p1', enrolled, completed, discontinued, reasons },
    flags,
    metrics: [
      { label: 'Dose levels', value: doseTooHigh ? '2 (halted)' : '5' },
      { label: 'DLTs observed', value: doseTooHigh ? '6' : weakDlt ? '1 (adjudication disputed)' : '2' },
      { label: 'RP2D confidence', value: doseTooHigh ? 'Low' : flags.length ? 'Moderate' : 'High' },
    ],
  }
}

// ---------------------------------------------------------------------------
// Phase II
// ---------------------------------------------------------------------------
export interface Phase2Result extends PhaseOutcome {
  hit: boolean
  pValue: number
  effectDescriptor: string
  effectInflated: boolean
  observedEffectQuality: 'robust' | 'fragile' | 'uninterpretable'
}

export function runPhase2(scenario: Scenario, c: Choices, p1: PhaseOutcome, seed: number): Phase2Result {
  const r = rng(seed, 29)
  const flags: string[] = []
  const narrative: string[] = []

  const endpointMechanistic = c['p2_endpoint'] === 'pd'
  const comparatorUnethical = c['p2_comparator'] === 'placebo' && scenario.socExists
  const comparatorUninterpretable = c['p2_comparator'] === 'single_arm' && scenario.p2Comparator !== 'single_arm'
  const unblindedBias = c['p2_blinding'] === 'open_unblinded' || (c['p2_blinding'] === 'open_label' && scenario.p2Blinding === 'double_blind')
  const ratioInconsistent = (c['p2_comparator'] === 'single_arm' && c['p2_ratio'] !== 'single_arm_na') || (c['p2_comparator'] !== 'single_arm' && c['p2_ratio'] === 'single_arm_na')
  const underpowered = c['p2_size'] === 'optimistic'
  const multiplicityAbuse = c['p2_adaptive'] === 'efficacy_no_alpha'

  let power = 0.66
  if (c['p2_size'] === 'realistic') power += 0.16
  if (underpowered) power -= 0.3
  if (c['p2_size'] === 'oversized') power += 0.1
  if (c['p2_endpoint'] === scenario.p2Endpoint) power += 0.07
  if (endpointMechanistic) power -= 0.1
  if (c['p2_ratio'] === '3_1') power -= 0.06
  if (c['p2_ratio'] === '2_1') power -= 0.02
  if (unblindedBias) power += 0.08
  if (multiplicityAbuse) power += 0.1
  if (p1.flags.includes('p1_toxicity_hold')) power -= 0.14
  if (p1.flags.includes('p1_dlt_weak')) power -= 0.07
  if (p1.flags.includes('p1_population_flag')) power -= 0.07
  power = Math.max(0.06, Math.min(0.95, power))

  const hit = r() < power
  const pValue = hit ? Number((0.0004 + r() * 0.042).toFixed(4)) : Number((0.06 + r() * 0.3).toFixed(3))

  let discPct = 0.12 + r() * 0.06
  if (p1.flags.includes('p1_toxicity_hold')) { discPct += 0.16; flags.push('p2_carryover_dose'); narrative.push('Because Phase I never characterized the dose-toxicity relationship properly, the dose carried into Phase II is an educated guess, and adverse-event discontinuation runs well above what the design assumed.') }
  if (p1.flags.includes('p1_population_flag')) { discPct += 0.06; flags.push('p2_carryover_population'); narrative.push('The tolerability profile from the wrong Phase I population does not hold in the target patients; titration slows and early dropout clusters in the first weeks.') }
  if (p1.flags.includes('p1_dlt_weak')) discPct += 0.04

  const enrolled = c['p2_size'] === 'optimistic' ? 48 + Math.floor(r() * 24) : c['p2_size'] === 'realistic' ? 180 + Math.floor(r() * 90) : 420 + Math.floor(r() * 120)

  let quality: Phase2Result['observedEffectQuality'] = 'robust'
  if (endpointMechanistic || comparatorUninterpretable || ratioInconsistent) quality = 'uninterpretable'
  else if (unblindedBias || multiplicityAbuse || underpowered) quality = 'fragile'

  if (endpointMechanistic) { flags.push('p2_endpoint_mechanistic'); narrative.push('The trial meets its primary endpoint — target engagement is unambiguous — but nothing in the dataset says whether patients are better off, and there is no clinical effect size to size a confirmatory trial on.') }
  if (comparatorUnethical) { flags.push('p2_ethics'); narrative.push(`Withholding ${scenario.soc} from the control arm draws an ethics objection; affected site data are excluded from the primary analysis.`) }
  if (comparatorUninterpretable) { flags.push('p2_no_control'); narrative.push('With no control arm where the endpoint can move on its own, the observed change cannot be attributed to the drug.') }
  if (unblindedBias) { flags.push('p2_bias'); narrative.push('The observed treatment difference is larger than blinded sensitivity analyses support; a reviewer will discount it.') }
  if (multiplicityAbuse) { flags.push('p2_multiplicity'); narrative.push('Significance is reached at the third unadjusted look — the true false-positive rate for this analysis is closer to one in six than one in twenty.') }
  if (underpowered && !hit) { flags.push('p2_underpowered'); narrative.push('The point estimate moves the right direction but the confidence interval crosses no-effect — a design failure, not necessarily a drug failure.') }
  if (c['p2_adaptive'] === 'futility') narrative.push(hit ? 'The pre-planned futility interim passes comfortably.' : 'The futility interim catches the flat trajectory early and the DMC recommends stopping, avoiding roughly 40% of the planned exposure.')

  const safetySignal = r() < (p1.flags.includes('p1_toxicity_hold') ? 0.62 : 0.24)
  if (safetySignal) { flags.push('p2_safety_signal'); narrative.push('A dose-related imbalance in adverse events of special interest appears in the active arm — not statistically definitive, but a defined safety topic Phase III must characterize.') }

  narrative.push(pickEvent(scenario, r()))

  const discontinued = Math.round(enrolled * Math.min(discPct, 0.5))
  const completed = enrolled - discontinued
  const effectDescriptor = endpointMechanistic ? 'Target engagement confirmed (no clinical effect measured)' : hit ? `Treatment difference favoring ${scenario.drug}${unblindedBias ? ', likely inflated' : ', consistent across sensitivity analyses'}` : 'Treatment difference smaller than assumed; confidence interval includes no effect'
  const status: PhaseOutcome['status'] = quality === 'uninterpretable' ? 'failure' : hit ? (quality === 'fragile' ? 'mixed' : 'success') : 'failure'

  if (hit && quality === 'robust' && !endpointMechanistic) narrative.unshift(`Phase II reads out positive on the pre-specified primary endpoint (p = ${pValue}), holding in every sensitivity analysis.`)
  else if (hit) narrative.unshift(`The primary analysis reaches nominal significance (p = ${pValue}), but the result is fragile for the reasons below.`)
  else narrative.unshift(`The primary endpoint is not met (p = ${pValue}).`)

  return {
    phase: 'p2', status, hit, pValue, effectDescriptor, effectInflated: unblindedBias || multiplicityAbuse, observedEffectQuality: quality,
    headline: quality === 'uninterpretable' ? 'Phase II complete — result uninterpretable' : hit ? (quality === 'fragile' ? 'Primary endpoint met — but the estimate will not survive review' : 'Primary endpoint met with a robust effect estimate') : 'Primary endpoint not met',
    narrative,
    regulatoryNote: quality === 'uninterpretable' ? 'End-of-Phase-II position: the trial does not support a confirmatory design.' : hit && quality === 'robust' ? 'End-of-Phase-II position: the effect estimate and safety database can support a confirmatory design.' : hit ? 'End-of-Phase-II position: the nominal result is acknowledged, but the effect estimate is unreliable for powering a confirmatory trial.' : 'End-of-Phase-II position: no demonstrated effect; proceeding requires a defensible explanation.',
    flow: { phase: 'p2', enrolled, completed, discontinued, reasons: [
      { label: 'Adverse events', n: Math.max(1, Math.round(discontinued * (p1.flags.includes('p1_toxicity_hold') ? 0.6 : 0.35))) },
      { label: 'Lack of efficacy / withdrawal', n: Math.max(1, Math.round(discontinued * 0.4)) },
      { label: 'Lost to follow-up', n: Math.max(0, discontinued - Math.max(1, Math.round(discontinued * (p1.flags.includes('p1_toxicity_hold') ? 0.6 : 0.35))) - Math.max(1, Math.round(discontinued * 0.4))) },
    ] },
    flags,
    metrics: [
      { label: 'Randomized', value: String(enrolled) },
      { label: 'Primary p-value', value: String(pValue) },
      { label: 'Effect estimate', value: quality === 'robust' ? 'Reliable' : quality === 'fragile' ? 'Biased / fragile' : 'Not estimable' },
    ],
  }
}

// ---------------------------------------------------------------------------
// Regulatory meeting (optional, between Phase II and Phase III)
// ---------------------------------------------------------------------------
export interface MeetingFeedback { concerns: string[]; supportive: string[] }

export function runRegulatoryMeeting(scenario: Scenario, proposedP3Choices: Choices): MeetingFeedback {
  const grades = gradePhase(scenario, 'p3', proposedP3Choices)
  const concerns = grades.filter((g) => g.verdict === 'poor').map((g) => `${g.title}: ${g.explanation}`)
  const supportive = grades.filter((g) => g.verdict === 'best').map((g) => `${g.title}: agreed.`)
  return { concerns, supportive }
}

// ---------------------------------------------------------------------------
// Phase III + authority-dependent verdict
// ---------------------------------------------------------------------------
export interface Phase3Result extends PhaseOutcome { hit: boolean; pValue: number }

export function runPhase3(scenario: Scenario, c: Choices, p1: PhaseOutcome, p2: Phase2Result, seed: number): Phase3Result {
  const r = rng(seed, 53)
  const flags: string[] = []
  const narrative: string[] = []

  const endpointOk = scenario.p3Endpoints.find((e) => e.id === c['p3_endpoint'])?.correct ?? false
  const niPlacebo = c['p3_design'] === 'ni_placebo'
  const niWithoutActive = c['p3_design'] === 'non_inferiority' && scenario.p3Design !== 'non_inferiority'
  const sizeChoice = c['p3_size']
  const multiplicityOk = c['p3_interim'] !== 'unadjusted'
  const inclusion = c['p3_inclusion']

  let power = 0.7
  if (sizeChoice === 'discounted') power += 0.16
  if (sizeChoice === 'point_estimate') power -= 0.06
  if (sizeChoice === 'inflated') power -= 0.3
  if (!endpointOk) power -= 0.06
  if (p2.effectInflated && sizeChoice !== 'discounted') { power -= 0.2; flags.push('p3_inconsistent_with_p2') }
  if (!p2.hit) power -= 0.18
  if (p2.observedEffectQuality === 'uninterpretable') power -= 0.22
  if (p1.flags.includes('p1_toxicity_hold')) power -= 0.1
  if (inclusion === 'restrictive') power += 0.06
  if (inclusion === 'enriched') power += 0.08
  power = Math.max(0.05, Math.min(0.94, power))

  const hit = r() < power
  const pValue = hit ? Number((0.0001 + r() * 0.04).toFixed(4)) : Number((0.055 + r() * 0.35).toFixed(3))

  const baseEnrolled = scenario.p3SizeBand === 'small'
    ? 30 + Math.floor(r() * 60)
    : scenario.p3SizeBand === 'large'
      ? (scenario.platformGroup.startsWith('vaccine') ? 22000 : 760) + Math.floor(r() * (scenario.platformGroup.startsWith('vaccine') ? 6000 : 240))
      : 420 + Math.floor(r() * 260)
  const sizeMultiplier = sizeChoice === 'inflated' ? 0.45 : sizeChoice === 'point_estimate' ? 0.8 : 1
  const finalEnrolled = Math.round(baseEnrolled * sizeMultiplier)

  let discPct = 0.13 + r() * 0.07
  if (p1.flags.includes('p1_toxicity_hold')) discPct += 0.1
  if (p2.flags.includes('p2_safety_signal')) discPct += 0.05
  if (inclusion === 'restrictive') discPct -= 0.05
  if (inclusion === 'broad') discPct += 0.02

  narrative.push(hit ? `The confirmatory trial meets its primary endpoint (p = ${pValue}), consistent across pre-specified subgroups.` : `The confirmatory trial misses its primary endpoint (p = ${pValue}).`)
  if (sizeChoice === 'inflated') { flags.push('p3_underpowered'); narrative.push('The sample size was justified against an effect larger than the program ever observed — the trial simply lacked the power to resolve the true, smaller effect.') }
  if (flags.includes('p3_inconsistent_with_p2')) narrative.push('The Phase III effect is substantially smaller than the Phase II estimate used to power it, the predictable consequence of carrying forward a biased estimate.')
  if (!endpointOk) { flags.push('p3_endpoint_invalid'); narrative.push(`The chosen primary endpoint is not accepted as evidence of benefit in this indication. ${scenario.p3Endpoints.find((e) => e.id === c['p3_endpoint'])?.why ?? ''}`) }
  if (niPlacebo) { flags.push('p3_design_invalid'); narrative.push('The design framework is internally invalid: non-inferiority against placebo cannot demonstrate efficacy even when it succeeds.') }
  else if (niWithoutActive) { flags.push('p3_design_invalid'); narrative.push('The non-inferiority margin cannot be justified from existing data and the trial contains no internal evidence of assay sensitivity.') }
  if (!multiplicityOk) { flags.push('p3_multiplicity'); narrative.push('With unadjusted interim looks and co-primary endpoints, family-wise type I error is uncontrolled.') }
  if (inclusion === 'restrictive') { flags.push('p3_generalisability'); narrative.push('The enrolled population is markedly narrower than the intended treatment population; any approval would carry a narrower indication than requested.') }
  if (p2.flags.includes('p2_safety_signal')) narrative.push('The safety topic raised in Phase II is now quantified in a larger database and requires a risk-management commitment regardless of the efficacy result.')
  narrative.push(pickEvent(scenario, r()))

  const discontinued = Math.round(finalEnrolled * Math.max(0.05, Math.min(discPct, 0.42)))
  const completed = finalEnrolled - discontinued

  return {
    phase: 'p3', status: hit && flags.filter((f) => f !== 'p3_generalisability').length === 0 ? 'success' : hit ? 'mixed' : 'failure',
    hit, pValue, headline: hit ? 'Primary endpoint met' : 'Primary endpoint not met', narrative,
    regulatoryNote: 'Submission compiled; see the review verdict below.',
    flow: { phase: 'p3', enrolled: finalEnrolled, completed, discontinued, reasons: [
      { label: 'Adverse events', n: Math.max(1, Math.round(discontinued * 0.32)) },
      { label: 'Withdrawal / lack of efficacy', n: Math.max(1, Math.round(discontinued * 0.38)) },
      { label: 'Lost to follow-up / other', n: Math.max(0, discontinued - Math.round(discontinued * 0.32) - Math.round(discontinued * 0.38)) },
    ] },
    flags,
    metrics: [
      { label: 'Randomized', value: finalEnrolled.toLocaleString() },
      { label: 'Primary p-value', value: String(pValue) },
      { label: 'Design integrity', value: flags.some((f) => f.includes('invalid') || f === 'p3_multiplicity') ? 'Compromised' : 'Intact' },
    ],
  }
}

export function reviewVerdict(scenario: Scenario, c: Choices, p1: PhaseOutcome, p2: Phase2Result, p3: Phase3Result, grades: Grade[], authorityKey: string, useAcceleratedPathway: boolean): FinalReport {
  const authority = getRegulator(authorityKey)
  const deficiencies: string[] = []
  const strengths: string[] = []
  const fatal: string[] = []

  if (p3.flags.includes('p3_endpoint_invalid')) fatal.push(`The primary endpoint of the pivotal trial is not accepted as a measure of clinical benefit in ${scenario.indication.toLowerCase()}.`)
  if (p3.flags.includes('p3_design_invalid')) fatal.push('The pivotal trial\u2019s design framework cannot demonstrate efficacy as constructed.')
  if (p3.flags.includes('p3_multiplicity')) fatal.push('The statistical analysis plan does not control the family-wise type I error rate.')
  if (p2.observedEffectQuality === 'uninterpretable') fatal.push('The Phase II program did not produce an interpretable effect estimate, so the pivotal trial\u2019s design has no empirical basis.')

  if (!p3.hit) deficiencies.push(`The pivotal trial did not meet its primary endpoint (p = ${p3.pValue}).`)
  if (p3.flags.includes('p3_underpowered')) deficiencies.push('The sample size assumed an effect larger than any observed in the program.')
  if (p3.flags.includes('p3_inconsistent_with_p2')) deficiencies.push('The Phase III sample size is not logically consistent with a Phase II estimate generated under biased conditions.')
  if (p1.flags.includes('p1_toxicity_hold')) deficiencies.push('The first-in-human dose justification was inadequate and led to serious unanticipated toxicity.')
  if (p1.flags.includes('p1_population_flag') && scenario.p1Population === 'patients') deficiencies.push('Healthy volunteers were exposed to an agent with no prospect of benefit and material risk — a GCP risk/benefit finding.')
  if (p1.flags.includes('p1_dlt_weak')) deficiencies.push('Dose-limiting toxicity was not pre-specified, so the recommended dose is not adequately justified.')
  if (p1.flags.includes('p1_special_flag') && scenario.special) deficiencies.push(`Platform-specific risk not adequately managed: ${scenario.special.title.toLowerCase()}.`)
  if (p2.flags.includes('p2_ethics')) deficiencies.push('Standard of care was withheld from a control arm where an effective therapy exists.')
  if (p2.flags.includes('p2_bias')) deficiencies.push('The Phase II effect estimate was generated without adequate blinding and is discounted.')
  if (p3.flags.includes('p3_generalisability')) deficiencies.push('The pivotal population is not representative of the intended treatment population.')
  if (p2.flags.includes('p2_safety_signal') && p3.hit) deficiencies.push('A dose-related safety signal requires a risk-management plan and likely a post-authorization commitment.')

  // Authority divergence
  if (authority.requiresTwoTrials) {
    deficiencies.push(`${authority.name} generally expects two independent adequate and well-controlled trials for full approval; this program submitted only one pivotal trial.`)
  }
  if (authority.surrogateStrictness === 'strict' && c['p2_endpoint'] === 'surrogate' && !scenario.validSurrogate) {
    deficiencies.push(`${authority.name} applies strict scrutiny to surrogate endpoints; this program\u2019s surrogate has not been independently validated as a correlate of protection/benefit.`)
  }
  if (authority.niStrictness === 'strict' && c['p3_design'] === 'non_inferiority') {
    deficiencies.push(`${authority.name} applies strict scrutiny to non-inferiority margins and assay sensitivity; this claim would face additional justification requirements.`)
  }

  if (p1.flags.length === 0) strengths.push('First-in-human dose selection, escalation design and population were all appropriate to the agent\u2019s risk profile.')
  if (c['p2_comparator'] === scenario.p2Comparator) strengths.push('The Phase II control construct was both ethical and interpretable.')
  if (c['p2_size'] === 'realistic') strengths.push('Phase II was powered on a clinically meaningful difference rather than the preclinical signal.')
  if (c['p3_size'] === 'discounted') strengths.push('The pivotal sample size discounted the Phase II estimate and allowed for attrition.')
  if (c['p3_interim'] === 'alpha_spending') strengths.push('A pre-specified group-sequential plan with alpha-spending kept type I error controlled.')
  if (c['p3_inclusion'] === 'broad') strengths.push('The pivotal population was broad and representative, supporting a label matching clinical practice.')
  if (p3.hit && p2.hit) strengths.push('Effect direction and magnitude were consistent between Phase II and the pivotal trial.')
  if (scenario.special && c[scenario.special.id] === scenario.special.correctOptionId) strengths.push(`The platform-specific risk (${scenario.special.title.toLowerCase()}) was correctly managed.`)

  const score = grades.reduce((a, g) => a + g.points, 0)
  const maxScore = grades.reduce((a, g) => a + g.maxPoints, 0)

  let verdict: FinalVerdict
  const twoTrialDeficiencyOnly = authority.requiresTwoTrials && fatal.length === 0 && p3.hit && deficiencies.length === 1
  if (fatal.length > 0) verdict = 'refuse_to_file'
  else if (twoTrialDeficiencyOnly && useAcceleratedPathway === false) verdict = 'complete_response'
  else if (p3.hit && deficiencies.length === 0) verdict = 'approvable'
  else if (p3.hit && !authority.requiresTwoTrials && deficiencies.length <= 2 && !p1.flags.includes('p1_toxicity_hold')) verdict = 'approvable'
  else if (useAcceleratedPathway && authority.acceleratedPathway && p2.hit && scenario.acceleratedEligible && fatal.length === 0) verdict = 'provisional'
  else if (!p3.hit && deficiencies.length >= 3) verdict = 'terminated'
  else verdict = 'complete_response'

  const verdictLabel = verdict === 'approvable' ? 'Approvable' : verdict === 'provisional' ? 'Provisional (accelerated) approval' : verdict === 'complete_response' ? 'Complete Response — deficiencies to address' : verdict === 'refuse_to_file' ? 'Refuse to File' : 'Program terminated'

  const verdictSummary = verdict === 'approvable'
    ? `${authority.name}\u2019s review considers the application for ${scenario.drug} (${scenario.code}) approvable for ${scenario.indication.toLowerCase()}. The pivotal trial was adequate and well-controlled, the primary endpoint was clinically meaningful and pre-specified, and the safety database supports the proposed use.${deficiencies.length ? ' The points below are to be addressed in labeling or as post-authorization commitments.' : ''}`
    : verdict === 'provisional'
      ? `${authority.name} grants a provisional approval for ${scenario.drug} based on the Phase II surrogate result, contingent on completing the required confirmatory Phase IV trial within the committed timeline. Failure to confirm benefit converts this into a withdrawal.`
      : verdict === 'complete_response'
        ? `${authority.name} cannot approve the application for ${scenario.drug} in its present form. The deficiencies below are specific to decisions made in this program and would need to be resolved before a further review cycle.`
        : verdict === 'refuse_to_file'
          ? `${authority.name} refuses filing for ${scenario.drug}. One or more design choices mean the submission contains no interpretable evidence of effectiveness.`
          : `Development of ${scenario.drug} is terminated. The pivotal trial failed and the accumulated design deficiencies mean a further trial could not be justified on the existing dataset.`

  return { verdict, verdictLabel, verdictSummary, deficiencies: fatal.concat(deficiencies), strengths, score, maxScore, grades, authorityKey }
}
