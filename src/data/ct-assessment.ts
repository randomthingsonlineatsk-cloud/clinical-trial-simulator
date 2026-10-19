import { REGULATORS, type Regulator } from './ct-regulators'

// ---------------------------------------------------------------------------
// Regulatory Assessment tool — a standalone, one-shot assessment of a
// program's likely pathway fit and filing readiness, separate from running
// a full Phase I-III simulation. It reuses the same authority divergence
// data (two-trial requirements, accelerated-pathway availability,
// non-inferiority/surrogate strictness) as the trial simulator, plus two
// well-documented, real orphan-designation population thresholds:
// the US Orphan Drug Act's <200,000-patients standard and the EU orphan
// regulation's <5-in-10,000-prevalence standard. This is a reasoning aid
// for practicing pathway assessment against a self-described program, not
// a real regulatory determination for any actual product.
// ---------------------------------------------------------------------------

export type DevelopmentStage = 'preclinical' | 'phase1_done' | 'phase2_done' | 'phase3_done'
export type SafetyDatabaseSize = 'small' | 'moderate' | 'large'

export interface AssessmentInputs {
  programName: string
  indication: string
  developmentStage: DevelopmentStage
  seriousUnmetNeed: boolean
  fewerThan200kUS: boolean
  fewerThan5in10kEU: boolean
  hasValidatedSurrogate: boolean
  safetyDatabaseSize: SafetyDatabaseSize
}

export const DEFAULT_ASSESSMENT_INPUTS: AssessmentInputs = {
  programName: '', indication: '',
  developmentStage: 'preclinical',
  seriousUnmetNeed: false,
  fewerThan200kUS: false,
  fewerThan5in10kEU: false,
  hasValidatedSurrogate: false,
  safetyDatabaseSize: 'small',
}

export interface AuthorityAssessment {
  authority: Regulator
  orphanEligible: boolean
  orphanNote: string
  expeditedEligible: boolean
  expeditedNote: string
  pivotalTrialsNote: string
  readinessLabel: string
  readinessNote: string
  safetyDatabaseNote: string
}

const STAGE_LABEL: Record<DevelopmentStage, string> = {
  preclinical: 'Preclinical only',
  phase1_done: 'Phase I complete',
  phase2_done: 'Phase II complete',
  phase3_done: 'Phase III complete',
}
export const STAGE_OPTIONS: { id: DevelopmentStage; label: string }[] = [
  { id: 'preclinical', label: STAGE_LABEL.preclinical },
  { id: 'phase1_done', label: STAGE_LABEL.phase1_done },
  { id: 'phase2_done', label: STAGE_LABEL.phase2_done },
  { id: 'phase3_done', label: STAGE_LABEL.phase3_done },
]

export function assessForAuthority(inputs: AssessmentInputs, authority: Regulator): AuthorityAssessment {
  const orphanEligible = inputs.fewerThan200kUS || inputs.fewerThan5in10kEU
  const orphanNote = orphanEligible
    ? `Likely eligible for an orphan-type designation: you indicated the population is ${inputs.fewerThan200kUS ? 'under the US threshold of 200,000 patients' : ''}${inputs.fewerThan200kUS && inputs.fewerThan5in10kEU ? ' and ' : ''}${inputs.fewerThan5in10kEU ? 'under the EU threshold of 5 per 10,000 prevalence' : ''}. Exact criteria and the specific incentives (market exclusivity, fee waivers, protocol assistance) differ by authority, but rare-disease programs of some form exist widely.`
    : 'Not indicated as eligible for an orphan-type designation based on the population size you specified.'

  const expeditedEligible = inputs.seriousUnmetNeed && inputs.hasValidatedSurrogate && authority.acceleratedPathway
  const expeditedNote = !authority.acceleratedPathway
    ? `${authority.name} is not modeled here as offering a distinct accelerated/conditional pathway, so a full standard evidence package is the expected route.`
    : expeditedEligible
      ? `You indicated a serious/life-threatening condition with unmet need and a validated surrogate — this combination is exactly what accelerated/conditional pathways are designed for at ${authority.name}, contingent on a confirmatory post-marketing trial commitment.`
      : !inputs.seriousUnmetNeed
        ? `${authority.name} offers an accelerated pathway in principle, but you did not indicate a serious/life-threatening condition with unmet need, which is normally the threshold requirement.`
        : `${authority.name} offers an accelerated pathway in principle, but without a validated surrogate endpoint there is no basis to seek approval ahead of full confirmatory efficacy data.`

  const pivotalTrialsNote = authority.requiresTwoTrials
    ? `${authority.name} generally expects two independent adequate and well-controlled pivotal trials for full approval, unless a single trial is exceptionally robust and the condition is rare.`
    : `${authority.name} can accept a single adequate, well-controlled pivotal trial plus strong supportive evidence for full approval.`

  let readinessLabel: string
  let readinessNote: string
  if (inputs.developmentStage === 'preclinical') {
    readinessLabel = 'Not ready to file'
    readinessNote = 'No clinical data yet exists. Phase I (safety/PK), Phase II (proof of concept/dose-finding) and Phase III (confirmatory) are all still needed before a standard filing — or Phase II data alone if pursuing an eligible accelerated pathway.'
  } else if (inputs.developmentStage === 'phase1_done') {
    readinessLabel = 'Not ready to file'
    readinessNote = 'Phase I safety and pharmacokinetics are established, but no efficacy data exists yet. Phase II proof-of-concept and Phase III confirmatory data are both still needed.'
  } else if (inputs.developmentStage === 'phase2_done') {
    if (expeditedEligible) {
      readinessLabel = 'Potentially ready for an accelerated/provisional filing'
      readinessNote = `With Phase II surrogate data in hand and the accelerated-pathway criteria you described met, a provisional filing at ${authority.name} may be possible, contingent on a binding confirmatory Phase IV trial commitment. A standard (non-accelerated) filing still requires Phase III confirmatory data.`
    } else {
      readinessLabel = 'Not ready for standard filing'
      readinessNote = 'Phase II proof-of-concept is complete, but Phase III confirmatory data is still needed for a standard filing, and the accelerated-pathway criteria are not indicated as met.'
    }
  } else {
    readinessLabel = pivotalTrialsNote.includes('two independent') ? 'Potentially ready, pending pivotal trial count' : 'Potentially ready to file'
    readinessNote = authority.requiresTwoTrials
      ? `Phase III is complete. Confirm whether your program includes the two independent pivotal trials ${authority.name} generally expects, or whether your single trial is robust enough (and the condition rare enough) to be an exception.`
      : `Phase III is complete and this authority can accept a single well-controlled pivotal trial with strong supportive evidence — assess whether your safety database and overall package are adequate below.`
  }

  const safetyDatabaseNote = inputs.safetyDatabaseSize === 'small'
    ? 'A small safety database (roughly under 100 exposed subjects) is very unlikely to be adequate for any filing, standard or accelerated — rare but serious adverse events are unlikely to have been observed yet.'
    : inputs.safetyDatabaseSize === 'moderate'
      ? 'A moderate safety database may be workable for an accelerated/provisional pathway with post-marketing surveillance commitments, but is often considered thin for a standard full-approval safety package.'
      : 'A large safety database is generally adequate to characterize the common and moderately rare adverse event profile expected for a standard filing.'

  return { authority, orphanEligible, orphanNote, expeditedEligible, expeditedNote, pivotalTrialsNote, readinessLabel, readinessNote, safetyDatabaseNote }
}

export function assessAllAuthorities(inputs: AssessmentInputs): AuthorityAssessment[] {
  return REGULATORS.map((r) => assessForAuthority(inputs, r))
}
