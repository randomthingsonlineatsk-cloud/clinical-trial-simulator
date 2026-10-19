import { SCENARIOS } from './ct-scenarios'
import type { Scenario } from './ct-types'

// ---------------------------------------------------------------------------
// Endless Practice generator. Trial-design correctness has many interacting
// rules (population, dose basis, escalation, endpoint, comparator, blinding,
// design, sizing) where an internally inconsistent auto-generated "correct
// answer" would actively teach something wrong. Rather than risk that, this
// generator takes each of the 13 validated scenario archetypes — whose
// correct-answer fields have been individually reasoned through — and
// reskins them with a fresh procedurally-generated drug name/code and
// randomly selected flavor-text variants (preclinical signal, unknowns, and
// event pool), so the surface narrative varies every time while the
// underlying grading logic is always exactly the validated one. This is an
// intentional accuracy/variety tradeoff: real, useful variety without
// invented correctness rules.
// ---------------------------------------------------------------------------

const NAME_PREFIXES = ['Vel', 'Ost', 'Ned', 'Cera', 'Lymph', 'Atten', 'Inacto', 'Zephyr', 'Toxi', 'Conju', 'Vector', 'mRNA', 'Plasmi', 'Kestr', 'Sola', 'Vasc', 'Tregol', 'Zenith', 'Corvin', 'Haldor']
const NAME_SUFFIXES = ['imab', 'inib', 'olan', 'ivax', 'ashield', 'apyra', 'acel', 'exin', 'ogard', 'uvax', 'irin', 'avex', 'oclor']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateDrugName(): { drug: string; code: string } {
  const drug = randomFrom(NAME_PREFIXES) + randomFrom(NAME_SUFFIXES)
  const letters = drug.slice(0, 3).toUpperCase()
  const num = 1 + Math.floor(Math.random() * 90)
  return { drug: drug.charAt(0).toUpperCase() + drug.slice(1), code: `${letters}-${num}` }
}

const PRECLINICAL_VARIANTS: Record<string, string[]> = {
  'small-molecule': [
    'Strong efficacy signal in the primary animal model, with a dose-toxicity relationship characterized across two species.',
    'Consistent efficacy across two independent animal models, with a wide margin between the efficacious and toxic dose in the more sensitive species.',
  ],
  biologic: [
    'Robust target engagement and downstream biological effect in the relevant animal model, though the model\u2019s pharmacological relevance to humans is imperfect.',
    'Clear mechanism-of-action confirmation preclinically, with a toxicology package limited by the animal species\u2019 partial cross-reactivity to the human target.',
  ],
  'cell-gene': [
    'Strong anti-disease activity in a humanized animal model, with the caveat that such models poorly predict the immune-mediated toxicities seen with living, expanding cell products in humans.',
    'Durable target-cell clearance in preclinical models, with limited ability to predict human-specific immune activation risk.',
  ],
  vaccine: [
    'Strong immunogenicity and protection against challenge in the relevant animal model, with a preclinical safety profile consistent with this vaccine platform.',
    'Reproducible immune response and protection in two independent animal challenge studies, with standard platform-typical local reactogenicity in toxicology.',
  ],
}

function preclinicalFor(scenario: Scenario): string {
  const key = scenario.platformGroup.startsWith('vaccine') ? 'vaccine' : scenario.platformGroup
  const options = PRECLINICAL_VARIANTS[key] ?? PRECLINICAL_VARIANTS['small-molecule']
  return randomFrom(options)
}

export function generateScenario(): Scenario {
  const template = randomFrom(SCENARIOS)
  const { drug, code } = generateDrugName()
  const shuffledEvents = [...template.events].sort(() => Math.random() - 0.5)
  return {
    ...template,
    id: `gen-${template.id}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    drug,
    code,
    preclinical: preclinicalFor(template),
    events: shuffledEvents,
  }
}

export const GENERATOR_ARCHETYPE_COUNT = SCENARIOS.length
