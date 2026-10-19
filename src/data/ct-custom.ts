import type { DoseBasis, Escalation, FihRisk, P2Comparator, P3Design, Population, Scenario, SizeBand } from './ct-types'

// ---------------------------------------------------------------------------
// "Build Your Own Study" — instead of picking a pre-written scenario, the
// user characterizes their own real (or hypothetical) compound by answering
// a handful of FACTUAL questions about it — not by stating what the "right"
// trial design answer is. Those facts are then run through the same
// rule-based derivation used to write every curated scenario above (risk
// profile → dose basis, ethics → comparator choice, evidence base →
// endpoint), producing a full Scenario object that plugs into the exact
// same Phase I-III engine and grading logic. The correctness of the
// resulting design decisions is only ever as good as the facts entered —
// this is a teaching tool for practicing trial-design reasoning against a
// self-described compound, not a real regulatory assessment of any actual
// molecule.
// ---------------------------------------------------------------------------

export interface CustomCompoundInputs {
  drugName: string
  modality: 'small-molecule' | 'biologic' | 'cell-gene' | 'vaccine'
  vaccinePlatform: string // used only if modality === 'vaccine'; free text label
  indication: string
  area: string
  noBenefitRiskInHealthy: boolean // Q: no prospect of benefit + meaningful risk to a healthy person (cytotoxic, genotoxic, immune agonist, living cell product)?
  exaggeratedPharmacology: boolean // Q: is the risk mechanism primarily pharmacological (agonism, cytokine pathway, cell expansion) rather than simple dose-related organ toxicity?
  socExists: boolean // Q: does an effective standard of care already exist that would be unethical to withhold?
  socName: string
  singleArmDefensible: boolean // Q: is the natural history/disease setting so poor, consistent, and well-documented (or manufacturing so constrained) that a single-arm trial is scientifically defensible?
  hasValidatedSurrogate: boolean // Q: is there a validated surrogate/biomarker with an established link to clinical outcome in this indication?
  surrogateName: string
  hasEstablishedActiveComparator: boolean // Q: is there a well-established active comparator this could be non-inferior to?
  activeComparatorName: string
  seriousUnmetNeed: boolean // Q: serious/life-threatening condition with unmet need, where an accelerated pathway might apply?
}

export const DEFAULT_CUSTOM_INPUTS: CustomCompoundInputs = {
  drugName: '', modality: 'small-molecule', vaccinePlatform: '',
  indication: '', area: '',
  noBenefitRiskInHealthy: false, exaggeratedPharmacology: false,
  socExists: false, socName: '',
  singleArmDefensible: false,
  hasValidatedSurrogate: false, surrogateName: '',
  hasEstablishedActiveComparator: false, activeComparatorName: '',
  seriousUnmetNeed: false,
}

const GENERIC_EVENTS = [
  'A planned interim safety review proceeds with no new findings.',
  'Site-level variability in outcome assessment prompts a mid-study rater retraining.',
  'A protocol amendment clarifies an ambiguous eligibility criterion after early enrollment questions.',
  'An unplanned regulatory inspection of the lead site concludes with no major findings.',
  'A supply-chain delay at one manufacturing site briefly slows enrollment.',
  'A planned data safety monitoring board review recommends continuing the study without modification.',
]

export function buildCustomScenario(inputs: CustomCompoundInputs): Scenario {
  const isCellGene = inputs.modality === 'cell-gene'
  const isVaccine = inputs.modality === 'vaccine'
  const isBiologic = inputs.modality === 'biologic'

  const fihRisk: FihRisk = isCellGene || (inputs.noBenefitRiskInHealthy && inputs.exaggeratedPharmacology)
    ? 'high'
    : (inputs.noBenefitRiskInHealthy || inputs.exaggeratedPharmacology)
      ? 'moderate'
      : 'low'

  const p1Population: Population = isVaccine ? 'healthy' : inputs.noBenefitRiskInHealthy ? 'patients' : 'healthy'

  const startingDoseBasis: DoseBasis = isVaccine ? 'noael' : (inputs.exaggeratedPharmacology || isCellGene) ? 'mabel' : 'noael'

  const escalation: Escalation = isVaccine
    ? 'fixed_cohort'
    : fihRisk === 'high'
      ? 'bayesian_crm'
      : p1Population === 'patients'
        ? 'three_plus_three'
        : 'accelerated'

  const p2Comparator: P2Comparator = inputs.singleArmDefensible ? 'single_arm' : inputs.socExists ? 'placebo_addon' : 'placebo'
  const p2Blinding = inputs.singleArmDefensible ? 'open_label' : 'double_blind'

  const validSurrogate = inputs.hasValidatedSurrogate
  const p2Endpoint = validSurrogate ? 'surrogate' : 'clinical'

  const p3Design: P3Design = inputs.hasEstablishedActiveComparator ? 'non_inferiority' : 'superiority'

  const p3SizeBand: SizeBand = inputs.singleArmDefensible
    ? 'small'
    : (!validSurrogate || isVaccine)
      ? 'large'
      : 'medium'

  const acceleratedEligible = inputs.seriousUnmetNeed && validSurrogate

  const surrogateLabel = inputs.surrogateName.trim() || 'the validated surrogate/biomarker you identified'
  const correctEndpointLabel = validSurrogate
    ? `Validated surrogate endpoint: ${surrogateLabel}`
    : 'A validated, patient-relevant clinical outcome measure (e.g., survival, symptom resolution, or functional improvement) appropriate to this indication'

  const drug = inputs.drugName.trim() || 'Investigational Compound'
  const modalityLabel = isVaccine
    ? `Vaccine — ${inputs.vaccinePlatform.trim() || 'platform not specified'}`
    : inputs.modality === 'small-molecule' ? 'Small molecule' : inputs.modality === 'biologic' ? 'Biologic' : 'Advanced therapy (cell/gene)'
  const platformGroup = isVaccine ? `vaccine-${(inputs.vaccinePlatform.trim() || 'other').toLowerCase().replace(/\s+/g, '-')}` : inputs.modality

  const socLine = inputs.socExists ? (inputs.socName.trim() || 'An existing standard of care') : 'No effective standard of care'
  const activeComparatorLine = inputs.hasEstablishedActiveComparator ? (inputs.activeComparatorName.trim() || 'an established active comparator') : ''

  return {
    id: `custom-${Date.now()}`,
    code: 'CUSTOM',
    drug,
    modality: modalityLabel,
    platformGroup,
    indication: inputs.indication.trim() || 'Unspecified indication (as characterized by you)',
    area: inputs.area.trim() || 'Unspecified',
    moa: `Mechanism as characterized by you for ${drug} — this build-your-own mode evaluates your trial-design decisions against the compound characteristics you provided, rather than modeling a specific molecular mechanism in detail.`,
    preclinical: 'Preclinical detail is not separately modeled in this mode — the simulation focuses entirely on whether your Phase I-III design choices are defensible given the risk profile, evidence base, and ethical constraints you specified.',
    known: inputs.socExists ? `An existing standard of care (${socLine}) is available for this indication, as you specified.` : 'No effective standard of care currently exists for this indication, as you specified.',
    unknown: 'Full efficacy and long-term safety in humans remain unknown until your trial program is complete — establishing that is exactly what this program exists to do.',
    fihRisk,
    p1Population,
    p1PopulationWhy: p1Population === 'patients'
      ? 'You indicated this compound carries meaningful risk with no prospect of benefit to a healthy person, so patients with the target condition — who may benefit — are the only ethically justifiable first-in-human population.'
      : 'You indicated this compound does not carry the kind of risk that would preclude healthy volunteers, so healthy adults give the cleanest pharmacokinetic and safety read-out, uncomplicated by disease physiology or concomitant medication.',
    startingDoseBasis,
    startingDoseWhy: startingDoseBasis === 'mabel'
      ? "You indicated the risk here is primarily pharmacological (exaggerated pharmacology or a living/expanding cell product) rather than simple organ toxicity, so the first dose must anchor to MABEL (minimal anticipated biological effect), not an animal NOAEL — the central lesson of historical immune-agonist and cell-therapy first-in-human risk."
      : 'You indicated risk here is conventional, toxicology-driven risk, so a NOAEL-derived human equivalent dose with a standard safety factor is the correct, defensible anchor.',
    escalation,
    escalationWhy: isVaccine
      ? 'Vaccines are evaluated at fixed antigen/organism-content dose levels with staggered sentinel cohorts — there is no maximum tolerated dose being sought, so a toxicity-seeking escalation design is the wrong structure entirely.'
      : fihRisk === 'high'
        ? 'A model-based design (Bayesian/CRM) that uses all accumulated data and handles a high-risk, possibly delayed toxicity profile is the best fit for the risk profile you described.'
        : p1Population === 'patients'
          ? 'A rule-based 3+3 remains defensible and transparent for an agent with this risk profile in a patient population.'
          : 'An accelerated titration design with sentinel dosing reaches the pharmacologically relevant range efficiently for this lower-risk profile.',
    socExists: inputs.socExists,
    soc: socLine,
    validSurrogate,
    surrogate: validSurrogate ? surrogateLabel : 'No validated surrogate endpoint for this indication, as you specified',
    p2Endpoint,
    p2EndpointWhy: validSurrogate
      ? `You identified a validated surrogate (${surrogateLabel}) with an established link to clinical outcome in this indication — using it is the efficient, defensible Phase II decision endpoint.`
      : 'You indicated no validated surrogate exists here, so only a real clinical or functional outcome measure can serve as a genuine go/no-go endpoint — a mechanistic biomarker alone would say nothing about patient benefit.',
    p2Comparator,
    p2ComparatorWhy: inputs.singleArmDefensible
      ? 'You indicated the natural history or disease setting is well-documented and severe enough (or manufacturing/logistics constrained enough) that a single-arm design compared against external/historical data is scientifically and ethically defensible here.'
      : inputs.socExists
        ? `An effective standard of care exists (${socLine}) as you specified, so it cannot ethically be withheld — randomize on top of it (add-on placebo-controlled design).`
        : 'You indicated no effective standard of care exists, so a placebo-controlled design withholds nothing and is both ethical and the cleanest comparison.',
    p2Blinding: p2Blinding as 'double_blind' | 'open_label',
    p2BlindingWhy: inputs.singleArmDefensible
      ? 'Blinding a single-arm design against external/historical data is not meaningful; bias is instead controlled through objective, ideally centrally-adjudicated outcome assessment.'
      : 'Double-blind assessment controls for the expectation effects that affect both adverse-event reporting and any subjective component of the outcome measure.',
    p3Endpoints: [
      { id: 'correct', label: correctEndpointLabel, correct: true, why: validSurrogate ? `This is the validated surrogate you identified for this compound — accepted because you described a real, established link to clinical benefit.` : 'You indicated no validated surrogate exists here, so a real, patient-relevant clinical outcome measure is required to support a benefit claim.' },
      { id: 'pd', label: 'A pharmacodynamic/target-engagement biomarker with no established link to clinical benefit', correct: false, why: 'Confirms the compound hits its target, but says nothing about whether patients benefit — a Phase I/II mechanistic read-out, not a registration endpoint.' },
      { id: 'early_signal', label: 'An early, uncontrolled efficacy signal carried forward without further validation', correct: false, why: 'An early signal is a reason to proceed to a properly designed confirmatory trial, not a substitute for running one.' },
      { id: 'narrow_secondary', label: 'A narrow secondary measure not representative of overall patient benefit', correct: false, why: 'A narrow, non-representative measure risks a statistically positive trial that does not reflect meaningful benefit to patients.' },
    ],
    p3Design,
    p3DesignWhy: inputs.hasEstablishedActiveComparator
      ? `You identified an established active comparator (${activeComparatorLine}), making a non-inferiority claim against it a legitimate, defensible design.`
      : 'With no established active comparator identified, superiority against the appropriate control is the only construct that actually demonstrates this compound works.',
    p3SizeBand,
    p3SizeWhy: inputs.singleArmDefensible
      ? 'You described a setting where enrollment itself is fundamentally constrained (an ultra-rare population or similarly limited eligible pool), so the confirmatory study realistically enrolls close to the entire available population rather than a large powered sample.'
      : (!validSurrogate || isVaccine)
        ? 'Without a validated surrogate (or for a vaccine\u2019s case-driven efficacy endpoint), a large, event-driven confirmatory trial is needed to generate an interpretable result.'
        : 'A validated surrogate endpoint allows a moderately sized confirmatory trial rather than a very large disease-outcome trial.',
    events: GENERIC_EVENTS,
    acceleratedEligible,
  }
}
