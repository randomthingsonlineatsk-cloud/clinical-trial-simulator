import type { Decision, Scenario, SizeBand } from './ct-types'

export function p1SizeBand(scenario: Scenario): 'small' | 'medium' {
  return scenario.platformGroup.startsWith('vaccine') ? 'medium' : 'small'
}

export function buildDecisions(scenario: Scenario, phase: 'p1' | 'p2' | 'p3'): Decision[] {
  if (phase === 'p1') return phase1(scenario)
  if (phase === 'p2') return phase2(scenario)
  return phase3(scenario)
}

function phase1(scenario: Scenario): Decision[] {
  const decisions: Decision[] = [
    {
      id: 'p1_dose', phase: 'p1', title: 'Starting dose strategy',
      prompt: `How do you justify the first dose of ${scenario.drug} ever given to a human?`,
      options: [
        { id: 'mabel', label: 'MABEL-anchored start', detail: 'Model the minimum anticipated biological effect level from human in vitro potency and receptor occupancy; start at minimal (~10%) target engagement.' },
        { id: 'noael', label: 'NOAEL-derived start (HED ÷ 10)', detail: 'Take the no-observed-adverse-effect level in the most sensitive species, convert to a human equivalent dose, and apply a 10-fold safety factor.' },
        { id: 'aggressive', label: 'Start at the projected therapeutic dose', detail: 'Skip the sub-therapeutic rungs and begin at the exposure predicted to be efficacious, to shorten the study.' },
      ],
    },
    {
      id: 'p1_escalation', phase: 'p1', title: 'Dose-escalation design',
      prompt: 'Which escalation framework governs how you move between dose levels?',
      options: [
        { id: 'three_plus_three', label: 'Traditional 3+3', detail: 'Three subjects per level; expand to six on one DLT; stop when two of six experience a DLT.' },
        { id: 'accelerated', label: 'Accelerated titration', detail: 'Single-subject cohorts with large dose increments in the low range, converting to expanded cohorts on first toxicity.' },
        { id: 'bayesian_crm', label: 'Bayesian model-based (CRM / BLRM with overdose control)', detail: 'A dose-toxicity model updated after every cohort, recommending the dose closest to the target toxicity rate.' },
        { id: 'fixed_cohort', label: 'Fixed dose levels with staggered sentinel cohorts', detail: 'Pre-defined dose/antigen levels, sentinel first administration, full safety review between levels. No MTD sought.' },
      ],
    },
    {
      id: 'p1_population', phase: 'p1', title: 'Study population',
      prompt: 'Who receives the first human exposure?',
      options: [
        { id: 'healthy', label: 'Healthy volunteers', detail: 'Clean pharmacokinetics, no concomitant medication, fast recruitment — but no possibility of benefit to offset risk.' },
        { id: 'patients', label: `Patients with the target indication`, detail: 'Slower, noisier pharmacokinetics under concomitant therapy — but the only population for whom real risk can be offset by a prospect of benefit.' },
      ],
    },
    {
      id: 'p1_n', phase: 'p1', title: 'Sample size',
      prompt: 'How many subjects do you commit to the first-in-human study?',
      options: [
        { id: 'small', label: '18-30 subjects', detail: 'Typical single/multiple ascending-dose footprint: enough for 4-6 dose levels plus a small expansion.' },
        { id: 'medium', label: '60-100 subjects', detail: 'Larger multi-cohort study allowing age strata, schedule comparisons, or an early pharmacodynamic read-out.' },
        { id: 'large', label: '200+ subjects', detail: 'A Phase I of near-Phase-II size; exposes many people before the dose-toxicity relationship is understood.' },
      ],
    },
    {
      id: 'p1_dlt', phase: 'p1', title: 'DLT definition and stopping rule',
      prompt: 'How is a dose-limiting toxicity defined, and what halts the study?',
      options: [
        { id: 'prespecified', label: 'Protocol-defined DLT with an explicit observation window and halting rule', detail: 'Graded toxicity criteria, a defined DLT assessment window, mandatory staggering, and pre-specified rules that pause enrollment.' },
        { id: 'investigator', label: 'Investigator judgment, case by case', detail: 'Each site decides whether an event is dose-limiting; the sponsor reviews periodically.' },
        { id: 'loose', label: 'Any grade 4 event only; escalate otherwise', detail: 'Only life-threatening events count as dose-limiting, so escalation continues through grade 3 toxicity.' },
      ],
    },
  ]
  if (scenario.special) {
    decisions.push({
      id: scenario.special.id, phase: 'p1', title: scenario.special.title, prompt: scenario.special.prompt,
      options: scenario.special.options.map((o) => ({ id: o.id, label: o.label, detail: o.detail })),
    })
  }
  return decisions
}

function phase2(scenario: Scenario): Decision[] {
  return [
    {
      id: 'p2_endpoint', phase: 'p2', title: 'Primary endpoint',
      prompt: 'What does Phase II actually measure?',
      options: [
        { id: 'surrogate', label: `Surrogate / intermediate endpoint — ${scenario.surrogate.split('(')[0]?.trim() ?? scenario.surrogate}`, detail: 'Reads out early and cheaply; its value depends entirely on whether it is regulatorily accepted in this indication.' },
        { id: 'clinical', label: 'Validated clinical endpoint', detail: 'Directly measures how the patient feels, functions or survives. Slower and larger, but unambiguous.' },
        { id: 'pd', label: 'Mechanistic pharmacodynamic biomarker', detail: 'Proves the drug engages its target. Says nothing about whether engaging the target helps the patient.' },
      ],
    },
    {
      id: 'p2_comparator', phase: 'p2', title: 'Control / comparator',
      prompt: `Standard of care in this indication: ${scenario.soc}.`,
      options: [
        { id: 'placebo', label: 'Placebo-controlled, no background therapy', detail: 'Cleanest contrast — only acceptable where no effective therapy is being withheld.' },
        { id: 'placebo_addon', label: 'Add-on placebo-controlled (all patients keep standard of care)', detail: 'Randomize investigational drug versus matching placebo on top of stable background therapy.' },
        { id: 'active', label: 'Active comparator, head to head', detail: 'Direct comparison against an approved agent; informative but large and expensive at Phase II.' },
        { id: 'single_arm', label: 'Single-arm, all participants treated', detail: 'No internal control; interpretation rests on historical outcome data and a blinded central endpoint.' },
      ],
    },
    {
      id: 'p2_blinding', phase: 'p2', title: 'Blinding',
      prompt: 'How is assessment bias controlled?',
      options: [
        { id: 'double_blind', label: 'Double-blind', detail: 'Neither participant nor investigator knows allocation; matched placebo or double-dummy.' },
        { id: 'open_label', label: 'Open-label with blinded independent central review', detail: 'Allocation is known, but the primary endpoint is adjudicated by a blinded external committee.' },
        { id: 'open_unblinded', label: 'Open-label, investigator-assessed endpoint', detail: 'Fastest and cheapest; the treating investigator also judges the outcome.' },
      ],
    },
    {
      id: 'p2_ratio', phase: 'p2', title: 'Randomization ratio',
      prompt: 'How are participants allocated?',
      options: [
        { id: '1_1', label: '1:1', detail: 'Maximum statistical efficiency for a fixed total sample size.' },
        { id: '2_1', label: '2:1 in favor of active', detail: 'Sacrifices a little power for a larger safety database and better recruitment appeal.' },
        { id: '3_1', label: '3:1 in favor of active', detail: 'Strongly recruitment-driven; power falls off noticeably for the same total N.' },
        { id: 'single_arm_na', label: 'Not applicable — single-arm design', detail: 'No randomization; everyone receives the investigational product.' },
      ],
    },
    {
      id: 'p2_size', phase: 'p2', title: 'Sample size and effect-size assumption',
      prompt: 'Which effect size do you power on?',
      options: [
        { id: 'optimistic', label: 'Power on the full preclinical effect (smallest trial)', detail: 'Assume the animal-model magnitude translates intact to humans.' },
        { id: 'realistic', label: 'Power on a conservative, clinically meaningful effect at 80-90% power', detail: 'Assume a smaller difference than the preclinical signal and size for the minimum clinically important difference.' },
        { id: 'oversized', label: 'Power to detect a very small difference (largest trial)', detail: 'A Phase II sized like a Phase III; will detect differences too small to be clinically relevant.' },
      ],
    },
    {
      id: 'p2_adaptive', phase: 'p2', title: 'Adaptive element',
      prompt: 'Do you build in an interim analysis?',
      options: [
        { id: 'futility', label: 'Pre-specified non-binding futility interim (DMC-reviewed)', detail: 'One planned look; stop early for futility if conditional power collapses. Does not spend type I error.' },
        { id: 'efficacy_alpha', label: 'Interim for efficacy with an alpha-spending function', detail: 'Allows early success declaration, with the significance threshold adjusted so overall type I error stays at 5%.' },
        { id: 'efficacy_no_alpha', label: 'Look at efficacy at several time points, unadjusted', detail: 'Repeated unadjusted testing of the primary endpoint until it reaches p < 0.05.' },
        { id: 'none', label: 'No interim analysis', detail: 'A single final analysis at full information.' },
      ],
    },
  ]
}

function phase3(scenario: Scenario): Decision[] {
  return [
    {
      id: 'p3_endpoint', phase: 'p3', title: 'Primary endpoint',
      prompt: 'Which primary endpoint will the confirmatory trial stand or fall on?',
      options: scenario.p3Endpoints.map((e) => ({ id: e.id, label: e.label, detail: e.correct ? 'A patient-relevant, pre-specified measure of benefit in this indication.' : 'Plausible on the surface — consider what a regulator will accept as evidence of benefit.' })),
    },
    {
      id: 'p3_design', phase: 'p3', title: 'Design framework',
      prompt: 'Superiority or non-inferiority?',
      options: [
        { id: 'superiority', label: 'Superiority', detail: 'Demonstrate the new treatment is better than the control on the primary endpoint.' },
        { id: 'non_inferiority', label: 'Non-inferiority versus an active comparator', detail: 'Show the new treatment is not worse than an effective comparator by more than a justified margin.' },
        { id: 'ni_placebo', label: 'Non-inferiority versus placebo', detail: 'Show the new treatment is not meaningfully worse than placebo.' },
      ],
    },
    {
      id: 'p3_size', phase: 'p3', title: 'Sample size justification',
      prompt: 'Your Phase II produced an observed effect. How do you size the confirmatory trial?',
      options: [
        { id: 'discounted', label: 'Power on a discounted Phase II effect, with dropout allowance', detail: 'Shrink the observed Phase II estimate for regression-to-the-mean and winner\u2019s curse, then add attrition.' },
        { id: 'point_estimate', label: 'Power exactly on the Phase II point estimate', detail: 'Assume the observed Phase II effect is the truth and size accordingly.' },
        { id: 'inflated', label: 'Assume a larger effect than Phase II showed (smallest trial)', detail: 'Size on an effect bigger than anything yet observed, to save cost and time.' },
      ],
    },
    {
      id: 'p3_interim', phase: 'p3', title: 'Interim analysis and multiplicity',
      prompt: 'How is overall type I error controlled?',
      options: [
        { id: 'alpha_spending', label: 'Group-sequential design with alpha-spending and hierarchical secondary testing', detail: 'Pre-specified interim looks spend a fraction of the 5% alpha; secondaries tested in a fixed hierarchy.' },
        { id: 'single_final', label: 'No interim; a single final analysis of one primary endpoint', detail: 'Simple, fully protected type I error — no opportunity to stop early.' },
        { id: 'unadjusted', label: 'Multiple interim looks plus several co-primary endpoints, unadjusted', detail: 'Test everything at 5% and report whichever result comes out significant.' },
      ],
    },
    {
      id: 'p3_inclusion', phase: 'p3', title: 'Inclusion / exclusion breadth',
      prompt: 'How representative is the enrolled population?',
      options: [
        { id: 'broad', label: 'Broad and representative, with pre-specified subgroups', detail: 'Include older adults, relevant comorbidity, and a demographically representative population.' },
        { id: 'enriched', label: 'Enriched for likely responders', detail: 'Restrict to the biomarker-positive or most responsive subgroup to maximize the chance of a positive trial.' },
        { id: 'restrictive', label: 'Highly restrictive: young, single-comorbidity, high-adherence patients', detail: 'Minimizes noise and dropout; produces a population unlike real clinical practice.' },
      ],
    },
  ]
}

export function totalDecisionCount(scenario: Scenario): number {
  return buildDecisions(scenario, 'p1').length + buildDecisions(scenario, 'p2').length + buildDecisions(scenario, 'p3').length
}
