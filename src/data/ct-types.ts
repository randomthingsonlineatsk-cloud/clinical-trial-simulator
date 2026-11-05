// ---------------------------------------------------------------------------
// Shared types for the trial-design simulation engine.
// ---------------------------------------------------------------------------

export type FihRisk = 'low' | 'moderate' | 'high'
export type Population = 'healthy' | 'patients'
export type DoseBasis = 'mabel' | 'noael'
export type Escalation = 'three_plus_three' | 'accelerated' | 'bayesian_crm' | 'fixed_cohort'
export type P2Endpoint = 'surrogate' | 'clinical' | 'pd'
export type P2Comparator = 'placebo' | 'placebo_addon' | 'active' | 'single_arm'
export type P2Blinding = 'double_blind' | 'open_label' | 'open_unblinded'
export type P3Design = 'superiority' | 'non_inferiority' | 'ni_placebo'
export type SizeBand = 'small' | 'medium' | 'large'

export interface P3EndpointOption {
  id: string
  label: string
  correct: boolean
  why: string
}

export interface SpecialDecisionOption {
  id: string
  label: string
  detail: string
}

export interface SpecialDecision {
  id: string
  title: string
  prompt: string
  options: SpecialDecisionOption[]
  correctOptionId: string
  correctWhy: string
  wrongWhy: string
}

export interface Scenario {
  id: string
  code: string
  drug: string
  modality: string
  platformGroup: string
  indication: string
  area: string
  moa: string
  preclinical: string
  known: string
  unknown: string
  fihRisk: FihRisk
  p1Population: Population
  p1PopulationWhy: string
  startingDoseBasis: DoseBasis
  startingDoseWhy: string
  escalation: Escalation
  escalationWhy: string
  socExists: boolean
  soc: string
  validSurrogate: boolean
  surrogate: string
  p2Endpoint: P2Endpoint
  p2EndpointWhy: string
  p2Comparator: P2Comparator
  p2ComparatorWhy: string
  p2Blinding: P2Blinding
  p2BlindingWhy: string
  p3Endpoints: P3EndpointOption[]
  p3Design: P3Design
  p3DesignWhy: string
  p3SizeBand: SizeBand
  p3SizeWhy: string
  events: string[]
  acceleratedEligible: boolean
  special?: SpecialDecision
}

export type Choices = Record<string, string>

export interface DecisionOption {
  id: string
  label: string
  detail: string
}

export interface Decision {
  id: string
  phase: 'p1' | 'p2' | 'p3'
  title: string
  prompt: string
  options: DecisionOption[]
}

export type GradeVerdict = 'best' | 'acceptable' | 'poor'

export interface Grade {
  decisionId: string
  phase: 'p1' | 'p2' | 'p3'
  title: string
  chosenLabel: string
  verdict: GradeVerdict
  points: number
  maxPoints: number
  reference: string
  explanation: string
}

export interface PatientFlow {
  phase: 'p1' | 'p2' | 'p3'
  enrolled: number
  completed: number
  discontinued: number
  reasons: { label: string; n: number }[]
}

export interface PhaseOutcome {
  phase: 'p1' | 'p2' | 'p3'
  headline: string
  status: 'success' | 'mixed' | 'failure'
  narrative: string[]
  regulatoryNote: string
  flow: PatientFlow
  flags: string[]
  metrics: { label: string; value: string }[]
}

export type FinalVerdict = 'approvable' | 'provisional' | 'complete_response' | 'refuse_to_file' | 'terminated'

export interface FinalReport {
  verdict: FinalVerdict
  verdictLabel: string
  verdictSummary: string
  deficiencies: string[]
  strengths: string[]
  score: number
  maxScore: number
  grades: Grade[]
  authorityKey: string
}
