// ---------------------------------------------------------------------------
// The 21 reviewing authorities used across this teaching-app portfolio.
// Names/regions match the other apps in the series for consistency. Here
// they act as fictional review-authority PROFILES for a simulated
// submission — the divergence rules below are simplified, defensible
// teaching approximations of real regulatory review conventions (two
// pivotal trials vs one, non-inferiority margin strictness, surrogate
// acceptance, accelerated-pathway availability), not a claim about any
// specific real decision.
// ---------------------------------------------------------------------------

export type Strictness = 'strict' | 'moderate' | 'lenient'

export interface Regulator {
  key: string
  name: string
  region: string
  color: string
  requiresTwoTrials: boolean // true: generally expects two independent adequate & well-controlled trials; false: one pivotal + strong supportive evidence can suffice
  acceleratedPathway: boolean // supports an accelerated/conditional approval route based on a surrogate, with a mandatory confirmatory post-marketing trial
  niStrictness: Strictness // how strictly the margin/assay-sensitivity justification for non-inferiority is scrutinized
  surrogateStrictness: Strictness // how readily a non-fully-validated surrogate is accepted as a primary endpoint
  note: string
}

export const REGULATORS: Regulator[] = [
  { key: 'FDA', name: 'FDA', region: 'North America', color: 'hsl(190 80% 55%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Can accept a single adequate, well-controlled trial plus strong confirmatory evidence, and operates an accelerated-approval pathway for serious conditions based on a reasonably likely surrogate, with a mandatory post-marketing confirmatory trial.' },
  { key: 'HC', name: 'Health Canada', region: 'North America', color: 'hsl(0 70% 62%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Similar flexibility to FDA on trial number, with a Notice of Compliance with conditions pathway analogous to accelerated approval for promising but unconfirmed evidence.' },
  { key: 'EMA', name: 'EMA', region: 'Europe', color: 'hsl(258 70% 65%)', requiresTwoTrials: true, acceleratedPathway: true, niStrictness: 'strict', surrogateStrictness: 'strict', note: 'Generally expects two independent pivotal trials unless a single trial is exceptionally robust and the condition is rare; conditional marketing authorization is available but reserved for unmet medical need with a strict post-authorization confirmatory commitment. Non-inferiority margins are scrutinized heavily for assay sensitivity.' },
  { key: 'MHRA', name: 'MHRA', region: 'Europe', color: 'hsl(220 70% 60%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Post-Brexit UK review has moved toward accepting robust single-trial packages more readily than EMA, while broadly sharing EMA-era scientific conventions.' },
  { key: 'SWISSMEDIC', name: 'Swissmedic', region: 'Europe', color: 'hsl(0 65% 55%)', requiresTwoTrials: true, acceleratedPathway: false, niStrictness: 'strict', surrogateStrictness: 'strict', note: 'Conservative, EMA-aligned scientific standards; no distinct accelerated pathway modeled here, so surrogate-only submissions face a harder review.' },
  { key: 'TGA', name: 'TGA', region: 'Asia-Pacific', color: 'hsl(152 55% 48%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'A provisional registration pathway exists for promising but incomplete data, similar in spirit to accelerated approval.' },
  { key: 'PMDA', name: 'PMDA', region: 'Asia-Pacific', color: 'hsl(340 65% 60%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'strict', surrogateStrictness: 'moderate', note: 'A conditional early approval system exists for serious conditions, but non-inferiority margin justification is scrutinized rigorously.' },
  { key: 'NMPA', name: 'NMPA', region: 'Asia-Pacific', color: 'hsl(38 92% 55%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Conditional approval pathway available for unmet medical need based on surrogate endpoints, with mandated confirmatory studies.' },
  { key: 'CDSCO', name: 'CDSCO', region: 'Asia-Pacific', color: 'hsl(30 80% 55%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Accelerated approval provisions exist for unmet medical need; local clinical data requirements can also apply depending on the product.' },
  { key: 'HSA', name: 'HSA', region: 'Asia-Pacific', color: 'hsl(190 70% 50%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Often relies on reference-agency review reports alongside its own assessment; no distinct accelerated route modeled here.' },
  { key: 'MFDS', name: 'MFDS', region: 'Asia-Pacific', color: 'hsl(265 60% 60%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Conditional approval available for serious/rare disease products based on surrogate data with confirmatory commitments.' },
  { key: 'BPOM', name: 'BPOM', region: 'Asia-Pacific', color: 'hsl(15 75% 55%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'lenient', note: 'Generally pragmatic review standards; a distinct accelerated pathway is not modeled here.' },
  { key: 'ANVISA', name: 'ANVISA', region: 'Latin America', color: 'hsl(142 55% 45%)', requiresTwoTrials: false, acceleratedPathway: true, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Priority review and conditional registration provisions exist for unmet medical need.' },
  { key: 'COFEPRIS', name: 'Cofepris', region: 'Latin America', color: 'hsl(150 45% 42%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'lenient', note: 'Frequently leverages reference-agency approvals; no distinct accelerated pathway modeled here.' },
  { key: 'ANMAT', name: 'ANMAT', region: 'Latin America', color: 'hsl(200 55% 48%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'lenient', note: 'Pragmatic review standards; no distinct accelerated pathway modeled here.' },
  { key: 'SFDA', name: 'SFDA', region: 'Middle East', color: 'hsl(158 50% 45%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Often reviews alongside reference-agency decisions; no distinct accelerated pathway modeled here.' },
  { key: 'UAE_MOHAP', name: 'UAE MOHAP', region: 'Middle East', color: 'hsl(175 55% 45%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Often reviews alongside reference-agency decisions; no distinct accelerated pathway modeled here.' },
  { key: 'SAHPRA', name: 'SAHPRA', region: 'Africa', color: 'hsl(90 45% 45%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'moderate', note: 'Standard full review; no distinct accelerated pathway modeled here.' },
  { key: 'NAFDAC', name: 'NAFDAC', region: 'Africa', color: 'hsl(120 45% 42%)', requiresTwoTrials: false, acceleratedPathway: false, niStrictness: 'moderate', surrogateStrictness: 'lenient', note: 'Standard full review; no distinct accelerated pathway modeled here.' },
  { key: 'AMA', name: 'AMA', region: 'Africa', color: 'hsl(45 70% 50%)', requiresTwoTrials: true, acceleratedPathway: false, niStrictness: 'strict', surrogateStrictness: 'moderate', note: 'As a continental harmonizing body coordinating across African Union member states, its model review standard here leans conservative, favoring more complete evidence packages.' },
  { key: 'WHO_PQ', name: 'WHO Prequalification', region: 'Global', color: 'hsl(210 15% 55%)', requiresTwoTrials: true, acceleratedPathway: false, niStrictness: 'strict', surrogateStrictness: 'moderate', note: 'A distinct global public-health mechanism (not a national regulator) focused on quality, safety and efficacy for products intended for procurement by UN agencies — it expects a complete, well-documented evidence package and does not offer an accelerated route in this model.' },
]

export function getRegulator(key: string): Regulator {
  return REGULATORS.find((r) => r.key === key) ?? REGULATORS[0]
}
