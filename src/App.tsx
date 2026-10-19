import { useEffect, useMemo, useRef, useState } from 'react'
import { submitEntry, topEntries } from '@/lib/local-leaderboard'
import IndStep, { type IndSummary } from './application/IndStep'
import IndMissions from './application/IndMissions'
import EuStep, { StartupTimeline, indRow, type EuSummary } from './application/EuStep'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SCENARIOS, getScenario, PLATFORM_GROUPS } from './data/ct-scenarios'
import { generateScenario, GENERATOR_ARCHETYPE_COUNT } from './data/ct-generator'
import { REGULATORS, getRegulator } from './data/ct-regulators'
import { buildDecisions } from './data/ct-decisions'
import {
  gradePhase, makeSeed, runPhase1, runPhase2, runPhase3, reviewVerdict, runRegulatoryMeeting,
  type Phase2Result, type Phase3Result, type MeetingFeedback,
} from './data/ct-engine'
import { buildCustomScenario, DEFAULT_CUSTOM_INPUTS, type CustomCompoundInputs } from './data/ct-custom'
import {
  assessAllAuthorities, assessForAuthority, DEFAULT_ASSESSMENT_INPUTS, STAGE_OPTIONS,
  type AssessmentInputs, type AuthorityAssessment,
} from './data/ct-assessment'
import type { Choices, FinalReport, Grade, PhaseOutcome, Scenario } from './data/ct-types'
import { GLOSSARY, RMP_NOTE, REMS_NOTE, PHASE_IV_EVENTS, type PhaseIvEvent } from './data/ct-reference'
import {
  Activity, FlaskConical, Syringe, ShieldCheck, ShieldAlert, CheckCircle2, CircleAlert, CircleSlash,
  Trophy, RotateCcw, ArrowRight, ArrowLeft, Microscope, Dna, Globe2, BookOpen, History as HistoryIcon, Users, X, Download, Sparkles, ClipboardCheck,
} from 'lucide-react'


// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const PLATFORM_ICON: Record<string, typeof FlaskConical> = {
  'small-molecule': FlaskConical,
  biologic: ShieldAlert,
  'cell-gene': Dna,
}
function platformIcon(group: string) {
  if (group.startsWith('vaccine')) return Syringe
  return PLATFORM_ICON[group] ?? Microscope
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon?: typeof Activity; children: React.ReactNode }) {
  return (
    <Button onClick={onClick} variant="outline" size="sm" className={`border-2 font-mono text-xs gap-1.5 ${active ? 'border-lab-cyan text-lab-cyan glow-cyan' : 'border-lab-line text-lab-text-muted'}`}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </Button>
  )
}

function GradeRow({ grade }: { grade: Grade }) {
  const tone = grade.verdict === 'best' ? { border: 'border-lab-emerald', bg: 'bg-lab-emerald-soft', text: 'text-lab-emerald', label: 'Best practice', Icon: CheckCircle2 }
    : grade.verdict === 'acceptable' ? { border: 'border-lab-gold', bg: 'bg-lab-gold-soft', text: 'text-lab-gold', label: 'Defensible', Icon: CircleAlert }
    : { border: 'border-lab-red', bg: 'bg-lab-red-soft', text: 'text-lab-red', label: 'Design error', Icon: CircleSlash }
  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} p-3`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-lab-text">{grade.title}</span>
        <span className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider ${tone.text}`}><tone.Icon className="size-3" />{tone.label} · {grade.points}/{grade.maxPoints}</span>
      </div>
      <p className="mt-1 font-mono text-xs text-lab-text-muted">You chose: {grade.chosenLabel}</p>
      <p className="mt-2 text-sm leading-relaxed text-lab-text">{grade.explanation}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-lab-text-muted/70">{grade.reference}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Progress tracker
// ---------------------------------------------------------------------------

function phaseNumberOf(step: Step): number {
  if (step === 'brief' || step === 'p1' || step === 'ind' || step === 'eu' || step === 'p1r') return 1
  if (step === 'p2' || step === 'p2r' || step === 'meeting') return 2
  if (step === 'p3' || step === 'p3r') return 3
  if (step === 'phaseIV') return 4
  if (step === 'report') return 5
  return 0
}

function ProgressTracker({ step }: { step: Step }) {
  const current = phaseNumberOf(step)
  if (current === 0) return null
  const nodes = [
    { n: 1, label: 'Phase I' },
    { n: 2, label: 'Phase II' },
    { n: 3, label: 'Phase III' },
    { n: 4, label: 'Phase IV' },
    { n: 5, label: 'Review' },
  ]
  return (
    <div className="flex items-center">
      {nodes.map((node, i) => {
        const done = current > node.n
        const isCurrent = current === node.n
        return (
          <div key={node.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex items-center justify-center size-6 rounded-full border-2 font-mono text-[10px] shrink-0 transition-all ${done ? 'border-lab-emerald bg-lab-emerald-soft text-lab-emerald' : isCurrent ? 'border-lab-cyan bg-lab-cyan-soft text-lab-cyan glow-cyan' : 'border-lab-line text-lab-text-muted'}`}>
                {done ? <CheckCircle2 className="size-3.5" /> : node.n}
              </div>
              <span className={`text-[8px] font-mono uppercase whitespace-nowrap ${isCurrent ? 'text-lab-cyan' : done ? 'text-lab-emerald' : 'text-lab-text-muted'}`}>{node.label}</span>
            </div>
            {i < nodes.length - 1 && <div className={`h-0.5 flex-1 mx-1 mb-4 ${current > node.n ? 'bg-lab-emerald' : 'bg-lab-line'}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Patient flow diagram — rendered as SVG so it can be exported as an image
// ---------------------------------------------------------------------------

const FLOW_SVG_COLORS = { bg: '#0f1524', text: '#eef2f7', muted: '#9aa5b8', track: '#1c2438', trackBorder: '#39445c', bar: '#38e0f0' }

function PatientFlowDiagram({ flows }: { flows: PhaseOutcome['flow'][] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  if (flows.length === 0) return null
  const max = Math.max(...flows.map((f) => f.enrolled))
  const phaseLabel: Record<string, string> = { p1: 'Phase I', p2: 'Phase II', p3: 'Phase III' }
  const W = 560
  const rowH = 62
  const H = flows.length * rowH + 16
  const barMaxW = W - 20

  function downloadImage() {
    if (!svgRef.current) return
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const source = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([source], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'patient-flow-diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="bg-lab-panel/80 border-lab-line glow-cyan">
      <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-cyan flex items-center gap-2"><Users className="size-4" />Patient Flow</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded border border-lab-line">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
            <rect x={0} y={0} width={W} height={H} fill={FLOW_SVG_COLORS.bg} />
            {flows.map((f, i) => {
              const y = 8 + i * rowH
              const barW = Math.max(30, (f.enrolled / max) * barMaxW)
              const completedPct = f.completed / f.enrolled
              return (
                <g key={f.phase}>
                  <text x={10} y={y + 14} fill={FLOW_SVG_COLORS.text} fontSize={13} fontFamily="monospace" fontWeight="bold">{phaseLabel[f.phase]}</text>
                  <text x={10} y={y + 30} fill={FLOW_SVG_COLORS.muted} fontSize={10} fontFamily="monospace">{f.enrolled.toLocaleString()} enrolled · {Math.round((1 - completedPct) * 100)}% discontinued</text>
                  <rect x={10} y={y + 36} width={barW} height={16} rx={3} fill={FLOW_SVG_COLORS.track} stroke={FLOW_SVG_COLORS.trackBorder} />
                  <rect x={10} y={y + 36} width={barW * completedPct} height={16} rx={3} fill={FLOW_SVG_COLORS.bar} />
                </g>
              )
            })}
          </svg>
        </div>
        <div className="space-y-1">
          {flows.map((f) => (
            <div key={f.phase} className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-lab-text-muted">
              <span className="text-lab-text font-bold">{phaseLabel[f.phase]}:</span>
              {f.reasons.filter((r) => r.n > 0).map((r) => <span key={r.label}>{r.label.toLowerCase()}: <span className="text-lab-text">{r.n.toLocaleString()}</span></span>)}
            </div>
          ))}
        </div>
        <Button onClick={downloadImage} variant="outline" size="sm" className="w-full border-2 border-lab-line font-mono gap-1.5"><Download className="size-3.5" />Save diagram as image (SVG)</Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Authority comparison — reruns the verdict engine on the same locked-in
// data with a different reviewing authority.
// ---------------------------------------------------------------------------

function AuthorityComparisonCard({
  scenario, choices, p1, p2, p3, grades, useAccelerated, primaryAuthorityKey,
}: {
  scenario: Scenario; choices: Choices; p1: PhaseOutcome; p2: Phase2Result; p3: Phase3Result; grades: Grade[]; useAccelerated: boolean; primaryAuthorityKey: string
}) {
  const [compareKey, setCompareKey] = useState<string | null>(null)
  const compareReport = useMemo(() => {
    if (!compareKey) return null
    return reviewVerdict(scenario, choices, p1, p2, p3, grades, compareKey, useAccelerated)
  }, [compareKey, scenario, choices, p1, p2, p3, grades, useAccelerated])

  const options = REGULATORS.filter((r) => r.key !== primaryAuthorityKey)

  return (
    <Card className="bg-lab-panel/80 border-lab-line">
      <CardHeader className="pb-2">
        <CardTitle className="font-mono text-sm text-lab-violet flex items-center gap-2"><Globe2 className="size-4" />Compare with another authority</CardTitle>
        <CardDescription className="text-xs text-lab-text-muted">Same locked-in trial data, reviewed under a different authority's conventions — no re-running the trial.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {options.map((r) => (
            <Button key={r.key} onClick={() => setCompareKey(r.key)} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${compareKey === r.key ? 'border-lab-violet text-lab-violet glow-violet' : 'border-lab-line text-lab-text-muted'}`}>{r.name}</Button>
          ))}
        </div>
        {compareReport && compareKey && (
          <div className="rounded border-2 border-lab-violet bg-lab-violet-soft p-3 space-y-2" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            <p className="font-mono font-bold text-lab-violet">{getRegulator(compareKey).name}: {compareReport.verdictLabel}</p>
            <p className="text-sm text-lab-text">{compareReport.verdictSummary}</p>
            {compareReport.deficiencies.length > 0 && (
              <ul className="text-xs text-lab-text-muted list-disc list-inside space-y-0.5">
                {compareReport.deficiencies.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Build Your Own Study — a short, factual characterization wizard that
// derives a full Scenario from the user's own compound description.
// ---------------------------------------------------------------------------

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <Button onClick={() => onChange(true)} variant="outline" size="sm" className={`flex-1 border-2 font-mono ${value ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted'}`}>Yes</Button>
      <Button onClick={() => onChange(false)} variant="outline" size="sm" className={`flex-1 border-2 font-mono ${!value ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted'}`}>No</Button>
    </div>
  )
}

const MODALITY_OPTIONS: { id: CustomCompoundInputs['modality']; label: string }[] = [
  { id: 'small-molecule', label: 'Small molecule' },
  { id: 'biologic', label: 'Biologic' },
  { id: 'cell-gene', label: 'Cell/gene therapy' },
  { id: 'vaccine', label: 'Vaccine' },
]

function CustomStudyWizard({ onBuild }: { onBuild: (s: Scenario) => void }) {
  const [inputs, setInputs] = useState<CustomCompoundInputs>(DEFAULT_CUSTOM_INPUTS)
  function set<K extends keyof CustomCompoundInputs>(key: K, value: CustomCompoundInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }
  const ready = inputs.drugName.trim().length > 0 && inputs.indication.trim().length > 0

  return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-violet border-2 glow-violet">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-lab-violet flex items-center gap-2"><Sparkles className="size-4" />Build Your Own Study</CardTitle>
          <CardDescription className="text-xs text-lab-text-muted">Characterize your own compound with a handful of factual questions — not "what's the right answer," just facts about the drug and indication. The correct trial-design logic is derived from what you enter, and your Phase I-III decisions are graded against it exactly like a curated program. This is a reasoning aid for practicing trial-design judgment against a self-described compound — <span className="text-lab-gold font-medium">not a real regulatory assessment of an actual molecule.</span> For that, no automated tool (including this one) substitutes for qualified regulatory affairs, clinical, and biostatistics expertise reviewing your actual data.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-lab-panel/80 border-lab-line">
        <CardContent className="pt-4 space-y-3">
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1">Compound name</p>
            <Input value={inputs.drugName} onChange={(e) => set('drugName', e.target.value)} placeholder="Your compound's name or code" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono" />
          </div>
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1">Modality</p>
            <div className="grid grid-cols-2 gap-2">
              {MODALITY_OPTIONS.map((m) => (
                <Button key={m.id} onClick={() => set('modality', m.id)} variant="outline" size="sm" className={`border-2 font-mono text-xs ${inputs.modality === m.id ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted'}`}>{m.label}</Button>
              ))}
            </div>
          </div>
          {inputs.modality === 'vaccine' && (
            <div>
              <p className="text-xs font-mono text-lab-text-muted mb-1">Vaccine platform (e.g. mRNA, viral vector, protein subunit)</p>
              <Input value={inputs.vaccinePlatform} onChange={(e) => set('vaccinePlatform', e.target.value)} placeholder="Platform name" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono" />
            </div>
          )}
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1">Indication</p>
            <Input value={inputs.indication} onChange={(e) => set('indication', e.target.value)} placeholder="e.g. moderate-to-severe plaque psoriasis" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono" />
          </div>
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1">Therapeutic area</p>
            <Input value={inputs.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Dermatology" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-text">Risk profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-lab-text mb-1.5">Does this compound carry meaningful risk with no prospect of benefit to a healthy person (e.g. cytotoxic, genotoxic, an immune agonist, or a living/expanding cell product)?</p>
            <YesNoToggle value={inputs.noBenefitRiskInHealthy} onChange={(v) => set('noBenefitRiskInHealthy', v)} />
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Is the risk mechanism primarily pharmacological (an agonist, a cytokine pathway, or cell expansion) rather than simple dose-related organ toxicity?</p>
            <YesNoToggle value={inputs.exaggeratedPharmacology} onChange={(v) => set('exaggeratedPharmacology', v)} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-text">Comparator &amp; evidence base</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-lab-text mb-1.5">Does an effective standard of care already exist for this indication that would be unethical to withhold?</p>
            <YesNoToggle value={inputs.socExists} onChange={(v) => set('socExists', v)} />
            {inputs.socExists && <Input value={inputs.socName} onChange={(e) => set('socName', e.target.value)} placeholder="Name it (optional)" className="mt-2 bg-lab-panel-strong border-lab-line text-lab-text font-mono" />}
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Is the natural history/disease setting so poor, consistent, and well-documented (or is manufacturing so constrained) that a single-arm trial without a control group would be scientifically defensible?</p>
            <YesNoToggle value={inputs.singleArmDefensible} onChange={(v) => set('singleArmDefensible', v)} />
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Is there a validated surrogate/biomarker endpoint with an established link to clinical outcome in this indication?</p>
            <YesNoToggle value={inputs.hasValidatedSurrogate} onChange={(v) => set('hasValidatedSurrogate', v)} />
            {inputs.hasValidatedSurrogate && <Input value={inputs.surrogateName} onChange={(e) => set('surrogateName', e.target.value)} placeholder="Name it (optional)" className="mt-2 bg-lab-panel-strong border-lab-line text-lab-text font-mono" />}
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Is there a well-established active comparator this compound could be tested against for a non-inferiority claim?</p>
            <YesNoToggle value={inputs.hasEstablishedActiveComparator} onChange={(v) => set('hasEstablishedActiveComparator', v)} />
            {inputs.hasEstablishedActiveComparator && <Input value={inputs.activeComparatorName} onChange={(e) => set('activeComparatorName', e.target.value)} placeholder="Name it (optional)" className="mt-2 bg-lab-panel-strong border-lab-line text-lab-text font-mono" />}
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Is this for a serious/life-threatening condition with unmet need, where regulators might accept an accelerated pathway?</p>
            <YesNoToggle value={inputs.seriousUnmetNeed} onChange={(v) => set('seriousUnmetNeed', v)} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => onBuild(buildCustomScenario(inputs))} disabled={!ready} className="w-full bg-lab-violet text-lab-bg hover:bg-lab-violet/90 font-mono gap-1.5">
        {ready ? 'Build my study' : 'Enter a compound name and indication to continue'}
        {ready && <ArrowRight className="size-4" />}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Regulatory Assessment — a standalone pathway/readiness tool, separate
// from running a full trial simulation.
// ---------------------------------------------------------------------------

function AssessmentResultCard({ result }: { result: AuthorityAssessment }) {
  return (
    <Card className="bg-lab-panel/80 border-lab-line">
      <CardHeader className="pb-2">
        <CardTitle className="font-mono text-sm flex items-center gap-2" style={{ color: result.authority.color }}><Globe2 className="size-4" />{result.authority.name}</CardTitle>
        <CardDescription className="text-xs font-mono uppercase tracking-wide text-lab-emerald">{result.readinessLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm text-lab-text">
        <p><span className="font-mono text-[10px] text-lab-cyan uppercase tracking-wide">Readiness — </span>{result.readinessNote}</p>
        <p><span className="font-mono text-[10px] text-lab-gold uppercase tracking-wide">Orphan designation — </span>{result.orphanNote}</p>
        <p><span className="font-mono text-[10px] text-lab-emerald uppercase tracking-wide">Expedited pathway — </span>{result.expeditedNote}</p>
        <p><span className="font-mono text-[10px] text-lab-blue uppercase tracking-wide">Pivotal trials — </span>{result.pivotalTrialsNote}</p>
        <p><span className="font-mono text-[10px] text-lab-violet uppercase tracking-wide">Safety database — </span>{result.safetyDatabaseNote}</p>
      </CardContent>
    </Card>
  )
}

function AssessmentTab() {
  const [inputs, setInputs] = useState<AssessmentInputs>(DEFAULT_ASSESSMENT_INPUTS)
  const [compareAll, setCompareAll] = useState(false)
  const [authorityKey, setAuthorityKey] = useState('FDA')
  function set<K extends keyof AssessmentInputs>(key: K, value: AssessmentInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }
  const ready = inputs.programName.trim().length > 0 && inputs.indication.trim().length > 0

  const singleResult = useMemo(() => (ready ? assessForAuthority(inputs, getRegulator(authorityKey)) : null), [inputs, authorityKey, ready])
  const allResults = useMemo(() => (ready && compareAll ? assessAllAuthorities(inputs) : null), [inputs, compareAll, ready])

  return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-emerald border-2 glow-emerald">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-lab-emerald flex items-center gap-2"><ClipboardCheck className="size-4" />Regulatory Assessment</CardTitle>
          <CardDescription className="text-xs text-lab-text-muted">A standalone pathway and readiness assessment — no need to run a full trial. Characterize your program's current state and see which pathways and designations might fit, and whether you're ready to file, against any authority. This is a reasoning aid, not a real regulatory determination for any actual product.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-lab-panel/80 border-lab-line">
        <CardContent className="pt-4 space-y-3">
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1">Program name</p>
            <Input value={inputs.programName} onChange={(e) => set('programName', e.target.value)} placeholder="Your compound or program name" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono" />
          </div>
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1">Indication</p>
            <Input value={inputs.indication} onChange={(e) => set('indication', e.target.value)} placeholder="e.g. relapsed acute myeloid leukemia" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono" />
          </div>
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1">Development stage</p>
            <div className="grid grid-cols-2 gap-2">
              {STAGE_OPTIONS.map((s) => (
                <Button key={s.id} onClick={() => set('developmentStage', s.id)} variant="outline" size="sm" className={`border-2 font-mono text-xs ${inputs.developmentStage === s.id ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted'}`}>{s.label}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-text">Program characteristics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-lab-text mb-1.5">Is this a serious/life-threatening condition with unmet medical need?</p>
            <YesNoToggle value={inputs.seriousUnmetNeed} onChange={(v) => set('seriousUnmetNeed', v)} />
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Fewer than 200,000 patients affected in the US (the US orphan drug threshold)?</p>
            <YesNoToggle value={inputs.fewerThan200kUS} onChange={(v) => set('fewerThan200kUS', v)} />
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Prevalence under 5 in 10,000 in the EU (the EU orphan designation threshold)?</p>
            <YesNoToggle value={inputs.fewerThan5in10kEU} onChange={(v) => set('fewerThan5in10kEU', v)} />
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Is there a validated surrogate/biomarker endpoint accepted as evidence of benefit in this indication?</p>
            <YesNoToggle value={inputs.hasValidatedSurrogate} onChange={(v) => set('hasValidatedSurrogate', v)} />
          </div>
          <div>
            <p className="text-sm text-lab-text mb-1.5">Safety database size so far</p>
            <div className="flex gap-2">
              {(['small', 'moderate', 'large'] as const).map((sz) => (
                <Button key={sz} onClick={() => set('safetyDatabaseSize', sz)} variant="outline" size="sm" className={`flex-1 border-2 font-mono text-xs capitalize ${inputs.safetyDatabaseSize === sz ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted'}`}>{sz}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="text-xs font-mono text-lab-text-muted mb-1.5">Assess against</p>
        <div className="flex gap-2 mb-2">
          <Button onClick={() => setCompareAll(false)} variant="outline" size="sm" className={`flex-1 border-2 font-mono ${!compareAll ? 'border-lab-cyan text-lab-cyan glow-cyan' : 'border-lab-line text-lab-text-muted'}`}>Single authority</Button>
          <Button onClick={() => setCompareAll(true)} variant="outline" size="sm" className={`flex-1 border-2 font-mono ${compareAll ? 'border-lab-violet text-lab-violet glow-violet' : 'border-lab-line text-lab-text-muted'}`}>Compare all 21</Button>
        </div>
        {!compareAll && (
          <div className="flex flex-wrap gap-1.5">
            {REGULATORS.map((r) => (
              <Button key={r.key} onClick={() => setAuthorityKey(r.key)} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${authorityKey === r.key ? 'border-lab-violet text-lab-violet glow-violet' : 'border-lab-line text-lab-text-muted'}`}>{r.name}</Button>
            ))}
          </div>
        )}
      </div>

      {!ready && <p className="text-xs text-lab-text-muted font-mono text-center">Enter a program name and indication to see the assessment.</p>}
      {ready && !compareAll && singleResult && <AssessmentResultCard result={singleResult} />}
      {ready && compareAll && allResults && (
        <div className="space-y-2">
          {allResults.map((r) => <AssessmentResultCard key={r.authority.key} result={r} />)}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// History / badges / sync
// ---------------------------------------------------------------------------

const HISTORY_KEY = 'cts_history_v1'

interface RunEntry { ts: number; scenarioId: string; scenarioName: string; authorityKey: string; verdict: string; score: number; maxScore: number; platformGroup: string }

function loadHistory(): RunEntry[] {
  try { const raw = localStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
function saveHistory(h: RunEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-300))) } catch { /* ignore */ }
}
function appendHistory(entry: RunEntry) {
  const h = loadHistory(); h.push(entry); saveHistory(h)
}
interface Badge { key: string; label: string; icon: string; earned: boolean; hint: string }
function computeBadges(history: RunEntry[]): Badge[] {
  const runs = history.length
  const approvals = history.filter((h) => h.verdict === 'approvable' || h.verdict === 'provisional').length
  const platformsTried = new Set(history.map((h) => h.platformGroup)).size
  const authoritiesApprovedFor = new Set(history.filter((h) => h.verdict === 'approvable' || h.verdict === 'provisional').map((h) => h.authorityKey)).size
  return [
    { key: 'first_run', label: 'First Run', icon: '🧪', earned: runs >= 1, hint: 'Complete 1 full run' },
    { key: 'first_approval', label: 'First Approval', icon: '✅', earned: approvals >= 1, hint: 'Get one Approvable/Provisional verdict' },
    { key: 'all_platforms', label: 'Platform Completionist', icon: '🧬', earned: platformsTried >= PLATFORM_GROUPS.length, hint: `Try every platform group (${platformsTried}/${PLATFORM_GROUPS.length})` },
    { key: 'diplomat', label: 'Regulatory Diplomat', icon: '🌍', earned: authoritiesApprovedFor >= 3, hint: `Get approvable verdicts from 3+ authorities (${authoritiesApprovedFor}/3)` },
    { key: 'ten_runs', label: 'Ten Programs', icon: '📁', earned: runs >= 10, hint: `Complete 10 runs (${runs}/10)` },
  ]
}

function HistoryTab() {
  const [history, setHistory] = useState<RunEntry[]>(() => (typeof window !== 'undefined' ? loadHistory() : []))
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  function handleExport() {
    downloadTextFile(`trial-simulator-history-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ kind: 'clinical-trial-simulator/history', schema: 1, runs: loadHistory() }, null, 2))
  }
  async function handleImport(file: File) {
    try {
      const data = JSON.parse(await file.text())
      if (data?.kind !== 'clinical-trial-simulator/history' || !Array.isArray(data.runs)) throw new Error('not a history file')
      const known = new Set(loadHistory().map((h) => h.ts))
      const merged = loadHistory().concat((data.runs as RunEntry[]).filter((r) => !known.has(r.ts))).sort((a, b) => a.ts - b.ts)
      saveHistory(merged); setHistory(merged)
      setSyncMessage(`Loaded ${merged.length} runs.`)
    } catch { setSyncMessage('That file is not a Clinical Trial Simulator history file.') }
  }

  const badges = computeBadges(history)
  const approvals = history.filter((h) => h.verdict === 'approvable' || h.verdict === 'provisional').length

  return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-line glow-cyan">
        <CardContent className="pt-4 grid grid-cols-2 gap-3">
          <div><p className="text-xs font-mono text-lab-text-muted">Programs completed</p><p className="text-2xl font-mono text-lab-cyan">{history.length}</p></div>
          <div><p className="text-xs font-mono text-lab-text-muted">Approvals achieved</p><p className="text-2xl font-mono text-lab-cyan">{approvals}</p></div>
        </CardContent>
      </Card>
      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-text-muted flex items-center gap-2"><Trophy className="size-4 text-lab-gold" />Achievements</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {badges.map((b) => (
              <div key={b.key} className={`rounded-md border p-2 text-center ${b.earned ? 'border-lab-gold bg-lab-gold-soft glow-gold' : 'border-lab-line opacity-40'}`} title={b.hint}>
                <div className="text-xl">{b.icon}</div>
                <p className="text-[10px] font-mono text-lab-text mt-1">{b.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-text-muted">Sync across devices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-lab-text-muted">No account needed: download your history here and load the file on another device.</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExport} size="sm" className="bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono">Download history file</Button>
            <label className="inline-flex items-center rounded-md border-2 border-lab-line px-3 h-8 text-sm font-mono cursor-pointer hover:border-lab-text-muted">Load history file
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImport(f) }} />
            </label>
          </div>
          {syncMessage && <p className="text-xs font-mono text-lab-text-muted">{syncMessage}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leaderboard tab
// ---------------------------------------------------------------------------

function LeaderboardTab() {
  const [filterScenario, setFilterScenario] = useState<string | 'all'>('all')
  const [filterAuthority, setFilterAuthority] = useState<string | 'all'>('all')
  const entries = topEntries({
    scenarioId: filterScenario !== 'all' ? filterScenario : undefined,
    authorityKey: filterAuthority !== 'all' ? filterAuthority : undefined,
  })

  return (
    <div className="space-y-4">
      <p className="text-xs font-mono text-lab-text-muted">Scores submitted on this device. A shared class leaderboard comes with classroom mode.</p>
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={() => setFilterScenario('all')} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${filterScenario === 'all' ? 'border-lab-cyan text-lab-cyan' : 'border-lab-line text-lab-text-muted'}`}>All programs</Button>
        {SCENARIOS.map((s) => (
          <Button key={s.id} onClick={() => setFilterScenario(s.id)} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${filterScenario === s.id ? 'border-lab-cyan text-lab-cyan' : 'border-lab-line text-lab-text-muted'}`}>{s.drug}</Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={() => setFilterAuthority('all')} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${filterAuthority === 'all' ? 'border-lab-violet text-lab-violet' : 'border-lab-line text-lab-text-muted'}`}>All authorities</Button>
        {REGULATORS.map((r) => (
          <Button key={r.key} onClick={() => setFilterAuthority(r.key)} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${filterAuthority === r.key ? 'border-lab-violet text-lab-violet' : 'border-lab-line text-lab-text-muted'}`}>{r.name}</Button>
        ))}
      </div>
      <Card className="bg-lab-panel/80 border-lab-line">
        <CardContent className="pt-4">
          {entries === undefined ? <p className="text-sm text-lab-text-muted">Loading…</p> : entries.length === 0 ? <p className="text-sm text-lab-text-muted">No runs submitted yet for this filter.</p> : (
            <ol className="space-y-1.5">
              {entries.map((e, i) => (
                <li key={e._id} className="flex justify-between text-sm font-mono">
                  <span className="text-lab-text-muted flex items-center gap-1.5">{i === 0 && <Trophy className="size-3.5 text-lab-gold" />}{i + 1}. {e.name} — {e.scenarioName} @ {e.authorityName}</span>
                  <span className={e.approved ? 'text-lab-emerald' : 'text-lab-text'}>{e.verdict.replace('_', ' ')} · {e.pct.toFixed(0)}%</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Glossary / About tab
// ---------------------------------------------------------------------------

function GlossaryTab() {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const filtered = GLOSSARY.filter((g) => g.term.toLowerCase().includes(q.toLowerCase()) || g.body.toLowerCase().includes(q.toLowerCase()))
    const map = new Map<string, typeof GLOSSARY>()
    for (const e of filtered) map.set(e.group, [...(map.get(e.group) ?? []), e])
    return [...map.entries()]
  }, [q])
  return (
    <div className="space-y-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter terms…" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono" />
      {groups.map(([group, entries]) => (
        <Card key={group} className="bg-lab-panel/80 border-lab-line">
          <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-cyan">{group}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {entries.map((e) => (
              <div key={e.term}><p className="font-mono font-bold text-lab-text text-sm">{e.term}</p><p className="text-sm text-lab-text-muted mt-1">{e.body}</p></div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-blue">Risk Management Plan (RMP)</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-lab-text">{RMP_NOTE}</p></CardContent>
      </Card>
      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-emerald">REMS-style Risk Mitigation</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-lab-text">{REMS_NOTE}</p></CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Play tab — the main simulation flow
// ---------------------------------------------------------------------------

type Step = 'select' | 'brief' | 'p1' | 'ind' | 'eu' | 'p1r' | 'p2' | 'p2r' | 'meeting' | 'p3' | 'p3r' | 'report' | 'phaseIV'
type Difficulty = 'guided' | 'expert'
type PlayMode = 'curated' | 'endless' | 'custom'

interface SavedRun {
  mode: PlayMode
  difficulty: Difficulty
  authorityKey: string
  scenario: Scenario
  step: Step
  choices: Choices
  p1: PhaseOutcome | null
  p2: Phase2Result | null
  p3: Phase3Result | null
  grades: Grade[]
  report: FinalReport | null
  meetingTaken: boolean
  meetingFeedback: MeetingFeedback | null
  redesignCount: number
  useAccelerated: boolean
  phaseIvEvent: PhaseIvEvent
  phaseIvOutcomeNote: string | null
}
const ACTIVE_RUN_KEY = 'cts_active_run_v1'
function saveActiveRun(run: SavedRun) {
  try { localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(run)) } catch { /* ignore */ }
}
function loadActiveRun(): SavedRun | null {
  try { const raw = localStorage.getItem(ACTIVE_RUN_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
function clearActiveRun() {
  try { localStorage.removeItem(ACTIVE_RUN_KEY) } catch { /* ignore */ }
}

interface DecisionFormProps {
  scenario: Scenario
  phase: 'p1' | 'p2' | 'p3'
  choices: Choices
  setChoices: (c: Choices) => void
  difficulty: Difficulty
  onSubmit: () => void
  submitLabel: string
  onBack?: () => void
  backLabel?: string
}

function DecisionForm({ scenario, phase, choices, setChoices, difficulty, onSubmit, submitLabel, onBack, backLabel }: DecisionFormProps) {
  const decisions = useMemo(() => buildDecisions(scenario, phase), [scenario, phase])
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const complete = decisions.every((d) => choices[d.id])

  function select(decisionId: string, optionId: string) {
    setChoices({ ...choices, [decisionId]: optionId })
    if (difficulty === 'expert') setRevealed((r) => ({ ...r, [decisionId]: true }))
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <Button onClick={onBack} variant="ghost" size="sm" className="text-lab-text-muted font-mono gap-1.5 -mb-1">
          <ArrowLeft className="size-3.5" />{backLabel ?? 'Back'}
        </Button>
      )}
      {decisions.map((d, i) => (
        <Card key={d.id} className="bg-lab-panel/80 border-lab-line" style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.03}s both` }}>
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono text-lab-text-muted uppercase">Decision {i + 1}</span>
            <CardTitle className="font-mono text-sm text-lab-text">{d.title}</CardTitle>
            <CardDescription className="text-xs text-lab-text-muted">{d.prompt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.options.map((o) => {
              const active = choices[d.id] === o.id
              const showDetail = difficulty === 'guided' || revealed[d.id]
              return (
                <Button key={o.id} onClick={() => select(d.id, o.id)} variant="outline" className={`w-full h-auto justify-start text-left border-2 font-mono ${active ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft glow-cyan' : 'border-lab-line text-lab-text-muted'}`}>
                  <span className="flex flex-col items-start gap-1 py-1">
                    <span className="text-sm text-lab-text whitespace-normal">{o.label}</span>
                    {showDetail && <span className="text-xs text-lab-text-muted whitespace-normal font-sans">{o.detail}</span>}
                  </span>
                </Button>
              )
            })}
          </CardContent>
        </Card>
      ))}
      <Button onClick={onSubmit} disabled={!complete} className="w-full bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5">
        {complete ? submitLabel : 'Answer every decision to continue'}
        {complete && <ArrowRight className="size-4" />}
      </Button>
    </div>
  )
}

function PhaseResultView({ outcome, flows, grades, onNext, nextLabel, extra, extraAfter }: { outcome: PhaseOutcome; flows: PhaseOutcome['flow'][]; grades: Grade[]; onNext: () => void; nextLabel: string; extra?: React.ReactNode; extraAfter?: React.ReactNode }) {
  const tone = outcome.status === 'success' ? { border: 'border-lab-emerald', glow: 'glow-emerald', Icon: CheckCircle2, color: 'text-lab-emerald' }
    : outcome.status === 'mixed' ? { border: 'border-lab-gold', glow: 'glow-gold', Icon: CircleAlert, color: 'text-lab-gold' }
    : { border: 'border-lab-red', glow: 'glow-red', Icon: CircleSlash, color: 'text-lab-red' }
  return (
    <div className="space-y-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
      <Card className={`bg-lab-panel/80 border-2 ${tone.border} ${tone.glow}`}>
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-base text-lab-text flex items-center gap-2"><tone.Icon className={`size-5 ${tone.color}`} />{outcome.headline}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {outcome.metrics.map((m) => (
              <div key={m.label} className="rounded border border-lab-line bg-lab-panel-strong px-3 py-1.5">
                <p className="text-[10px] font-mono text-lab-text-muted uppercase">{m.label}</p>
                <p className="text-sm font-mono text-lab-cyan">{m.value}</p>
              </div>
            ))}
          </div>
          {outcome.narrative.map((n, i) => <p key={i} className="text-sm text-lab-text leading-relaxed">{n}</p>)}
          <p className="rounded border border-lab-line bg-lab-panel-strong p-3 text-sm text-lab-text">{outcome.regulatoryNote}</p>
        </CardContent>
      </Card>
      <PatientFlowDiagram flows={flows} />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest font-mono text-lab-violet">Decision review — this phase</p>
        {grades.map((g) => <GradeRow key={g.decisionId} grade={g} />)}
      </div>
      {extra}
      {extraAfter}
      <p className="text-center text-[10px] font-mono text-lab-text-muted">This phase is locked in — like a real trial, results can't be undone, only built on.</p>
      <Button onClick={onNext} className="w-full bg-lab-gold text-lab-bg hover:bg-lab-gold/90 font-mono gap-1.5">{nextLabel} <ArrowRight className="size-4" /></Button>
    </div>
  )
}

function PlayTab() {
  const [mode, setMode] = useState<PlayMode>('curated')
  const [difficulty, setDifficulty] = useState<Difficulty>('guided')
  const [appRegions, setAppRegions] = useState<'us' | 'eu' | 'both' | 'none'>('us')
  const indGate = appRegions === 'us' || appRegions === 'both'
  const euGate = appRegions === 'eu' || appRegions === 'both'
  const [indSummary, setIndSummary] = useState<IndSummary | null>(null)
  const [euSummary, setEuSummary] = useState<EuSummary | null>(null)
  const [authorityKey, setAuthorityKey] = useState('FDA')
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [choices, setChoices] = useState<Choices>({})
  const [p1, setP1] = useState<PhaseOutcome | null>(null)
  const [p2, setP2] = useState<Phase2Result | null>(null)
  const [p3, setP3] = useState<Phase3Result | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [seed] = useState(() => makeSeed())
  const [report, setReport] = useState<FinalReport | null>(null)
  const [meetingTaken, setMeetingTaken] = useState(false)
  const [meetingFeedback, setMeetingFeedback] = useState<MeetingFeedback | null>(null)
  const [redesignCount, setRedesignCount] = useState(0)
  const [useAccelerated, setUseAccelerated] = useState(false)
  const [phaseIvEvent, setPhaseIvEvent] = useState<PhaseIvEvent>(() => PHASE_IV_EVENTS[Math.floor(Math.random() * PHASE_IV_EVENTS.length)])
  const [phaseIvOutcomeNote, setPhaseIvOutcomeNote] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [resumeAvailable, setResumeAvailable] = useState<SavedRun | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = loadActiveRun()
    return saved && saved.step !== 'select' ? saved : null
  })

  const submitScore = async (e: Parameters<typeof submitEntry>[0]) => submitEntry(e)
  const flows = useMemo(() => [p1?.flow, p2?.flow, p3?.flow].filter(Boolean) as PhaseOutcome['flow'][], [p1, p2, p3])

  // Persist the in-progress run so it can be resumed after closing the tab.
  useEffect(() => {
    if (typeof window === 'undefined' || !scenario || step === 'select') return
    saveActiveRun({ mode, difficulty, authorityKey, scenario, step, choices, p1, p2, p3, grades, report, meetingTaken, meetingFeedback, redesignCount, useAccelerated, phaseIvEvent, phaseIvOutcomeNote })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, step, choices, p1, p2, p3, grades, report, meetingTaken, meetingFeedback, redesignCount, useAccelerated, phaseIvEvent, phaseIvOutcomeNote])

  function resumeSavedRun() {
    if (!resumeAvailable) return
    const r = resumeAvailable
    setMode(r.mode); setDifficulty(r.difficulty); setAuthorityKey(r.authorityKey); setScenario(r.scenario); setStep(r.step); setChoices(r.choices)
    setP1(r.p1); setP2(r.p2); setP3(r.p3); setGrades(r.grades); setReport(r.report)
    setMeetingTaken(r.meetingTaken); setMeetingFeedback(r.meetingFeedback); setRedesignCount(r.redesignCount); setUseAccelerated(r.useAccelerated)
    setPhaseIvEvent(r.phaseIvEvent); setPhaseIvOutcomeNote(r.phaseIvOutcomeNote)
    setResumeAvailable(null)
  }
  function discardSavedRun() {
    clearActiveRun()
    setResumeAvailable(null)
  }

  function pickScenario(s: Scenario) {
    setScenario(s); setStep('brief'); setChoices({}); setP1(null); setP2(null); setP3(null); setGrades([]); setReport(null)
    setMeetingTaken(false); setMeetingFeedback(null); setRedesignCount(0); setUseAccelerated(false); setPhaseIvOutcomeNote(null); setScoreSubmitted(false); setIndSummary(null)
  }
  function pickCurated(id: string) { const s = getScenario(id); if (s) pickScenario(s) }
  function pickGenerated() { pickScenario(generateScenario()) }
  function startNewProgram() {
    clearActiveRun()
    setScenario(null); setStep('select'); setChoices({}); setP1(null); setP2(null); setP3(null); setGrades([]); setReport(null)
    setMeetingTaken(false); setMeetingFeedback(null); setRedesignCount(0); setUseAccelerated(false); setPhaseIvOutcomeNote(null); setScoreSubmitted(false)
  }

  function submitP1() {
    if (!scenario) return
    const g = gradePhase(scenario, 'p1', choices)
    setGrades((prev) => [...prev.filter((x) => x.phase !== 'p1'), ...g])
    setIndSummary(null); setEuSummary(null)
    if (indGate) { setStep('ind'); return }
    if (euGate) { setStep('eu'); return }
    setP1(runPhase1(scenario, choices, seed))
    setStep('p1r')
  }
  // After the IND: changes made to answer FDA apply to the protocol that is run; the original
  // choices stay graded.
  function afterInd(corrected: Choices, summary: IndSummary) {
    if (!scenario) return
    const next = { ...choices, ...corrected }
    setChoices(next); setIndSummary(summary)
    if (euGate) { setStep('eu'); return }
    setP1(runPhase1(scenario, next, seed))
    setStep('p1r')
  }
  // After the EU application: answers to the reviewers' questions change the protocol that is run.
  function afterEu(corrected: Choices, summary: EuSummary) {
    if (!scenario) return
    const next = { ...choices, ...corrected }
    setChoices(next); setEuSummary(summary)
    setP1(runPhase1(scenario, next, seed))
    setStep('p1r')
  }
  function submitP2() {
    if (!scenario || !p1) return
    const g = gradePhase(scenario, 'p2', choices)
    setGrades((prev) => [...prev.filter((x) => x.phase !== 'p2'), ...g])
    setP2(runPhase2(scenario, choices, p1, seed))
    setStep('p2r')
  }
  function requestMeeting() {
    if (!scenario) return
    setMeetingFeedback(runRegulatoryMeeting(scenario, choices))
    setMeetingTaken(true)
    setStep('meeting')
  }
  function submitP3() {
    if (!scenario || !p1 || !p2) return
    const g = gradePhase(scenario, 'p3', choices)
    const allGrades = [...grades.filter((x) => x.phase !== 'p3'), ...g]
    setGrades(allGrades)
    const result = runPhase3(scenario, choices, p1, p2, seed)
    setP3(result)
    const finalReport = reviewVerdict(scenario, choices, p1, p2, result, allGrades, authorityKey, useAccelerated)
    setReport(finalReport)
    setStep('p3r')
    if (typeof window !== 'undefined') {
      appendHistory({ ts: Date.now(), scenarioId: scenario.id, scenarioName: scenario.drug, authorityKey, verdict: finalReport.verdict, score: finalReport.score, maxScore: finalReport.maxScore, platformGroup: scenario.platformGroup })
    }
  }
  function redesignP3() {
    setStep('p3'); setRedesignCount((n) => n + 1)
  }

  function goToPhaseIVOrReport() {
    if (report && (report.verdict === 'approvable' || report.verdict === 'provisional')) setStep('phaseIV')
    else setStep('report')
  }

  function resolvePhaseIV(goodResponse: boolean) {
    if (!report) return
    if (report.verdict === 'provisional') {
      setPhaseIvOutcomeNote(goodResponse ? 'The confirmatory trial completes successfully and on time — the provisional approval converts to a full approval.' : 'The confirmatory trial is late or fails to verify the surrogate\u2019s predicted benefit — the provisional approval is withdrawn.')
    } else {
      setPhaseIvOutcomeNote(goodResponse ? phaseIvEvent.goodResponseNote : phaseIvEvent.badResponseNote)
    }
    setStep('report')
  }

  async function handleSubmitScore() {
    if (!scenario || !report) return
    const name = playerName.trim()
    if (!name || scoreSubmitted) return
    setScoreSubmitted(true)
    const authority = getRegulator(authorityKey)
    try {
      await submitScore({ name, scenarioId: scenario.id, scenarioName: scenario.drug, authorityKey, authorityName: authority.name, verdict: report.verdict, approved: report.verdict === 'approvable' || report.verdict === 'provisional', score: report.score, maxScore: report.maxScore })
    } catch { setScoreSubmitted(false) }
  }

  function downloadReport() {
    if (!scenario || !report) return
    const lines: string[] = []
    lines.push(`Clinical Trial Simulator — Development Program Report`)
    lines.push(`${scenario.drug} (${scenario.code}) — ${scenario.indication}`)
    lines.push(`Reviewing authority: ${getRegulator(authorityKey).name}`)
    lines.push(`Verdict: ${report.verdictLabel}`)
    lines.push(`Score: ${report.score}/${report.maxScore}`)
    lines.push('')
    lines.push(report.verdictSummary)
    lines.push('')
    if (report.deficiencies.length) { lines.push('Deficiencies:'); report.deficiencies.forEach((d) => lines.push(`  - ${d}`)); lines.push('') }
    if (report.strengths.length) { lines.push('Strengths:'); report.strengths.forEach((d) => lines.push(`  - ${d}`)); lines.push('') }
    lines.push('Decisions:')
    report.grades.forEach((g) => { lines.push(`  [${g.phase.toUpperCase()}] ${g.title}: ${g.chosenLabel} — ${g.verdict} (${g.points}/${g.maxPoints})`); lines.push(`    ${g.explanation}`) })
    if (indSummary) { lines.push(''); lines.push('US IND:'); lines.push(`  Study could proceed on day ${indSummary.proceedDay}; first patient in on day ${indSummary.firstPatientDay}; clinical hold cycles: ${indSummary.holdCycles}; information requests: ${indSummary.requests}.`); indSummary.findings.forEach((f) => lines.push(`  - ${f}`)) }
    if (euSummary) { lines.push(''); lines.push('EU clinical trial application (Regulation (EU) No 536/2014):'); euSummary.countries.forEach((c) => lines.push(`  ${c.name}: ${c.status}${c.status === 'authorised' ? ` on day ${c.decisionDay}, first subject day ${c.firstPatientDay}` : ''}`)); lines.push(`  Reviewer questions: ${euSummary.rfis}; refusals: ${euSummary.refusals}; transparency category ${euSummary.category}.`) }
    if (phaseIvOutcomeNote) { lines.push(''); lines.push('Phase IV outcome:'); lines.push(`  ${phaseIvOutcomeNote}`) }
    lines.push('')
    lines.push('All drugs, vaccines, and scenarios are entirely fictional, for educational use only.')
    lines.push('built by Khan Gulrez Shagufa Fazal Ahmed')
    downloadTextFile(`clinical-trial-simulator-${scenario.id}-report.txt`, lines.join('\n'))
  }

  const canSubmitScore = !!report
  const midRun = step !== 'select'

  // Small persistent "abandon run" control shown above every in-progress step.
  const abandonControl = midRun && step !== 'report' ? (
    <div className="flex justify-end">
      <Button onClick={startNewProgram} variant="ghost" size="sm" className="text-lab-text-muted font-mono gap-1.5 h-7">
        <X className="size-3.5" />Abandon &amp; start over
      </Button>
    </div>
  ) : null

  const progressBar = midRun ? <ProgressTracker step={step} /> : null

  // -------------------- select --------------------
  if (step === 'select' || !scenario) {
    return (
      <div className="space-y-4">
        {resumeAvailable && (
          <Card className="bg-lab-panel/80 border-2 border-lab-gold glow-gold">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm text-lab-text flex items-center gap-2"><HistoryIcon className="size-4 text-lab-gold shrink-0" />You have an in-progress program: <span className="font-mono font-bold">{resumeAvailable.scenario.drug}</span> ({resumeAvailable.scenario.code}). Resume where you left off?</p>
              <div className="flex gap-2">
                <Button onClick={resumeSavedRun} className="flex-1 bg-lab-gold text-lab-bg hover:bg-lab-gold/90 font-mono">Resume</Button>
                <Button onClick={discardSavedRun} variant="outline" className="border-2 border-lab-line font-mono">Discard</Button>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => setMode('curated')} variant="outline" className={`border-2 font-mono text-[11px] gap-1 h-auto py-2 flex-col ${mode === 'curated' ? 'border-lab-cyan text-lab-cyan glow-cyan' : 'border-lab-line text-lab-text-muted'}`}><BookOpen className="size-3.5" />Curated ({SCENARIOS.length})</Button>
          <Button onClick={() => setMode('endless')} variant="outline" className={`border-2 font-mono text-[11px] gap-1 h-auto py-2 flex-col ${mode === 'endless' ? 'border-lab-violet text-lab-violet glow-violet' : 'border-lab-line text-lab-text-muted'}`}><Dna className="size-3.5" />Endless Practice</Button>
          <Button onClick={() => setMode('custom')} variant="outline" className={`border-2 font-mono text-[11px] gap-1 h-auto py-2 flex-col ${mode === 'custom' ? 'border-lab-gold text-lab-gold glow-gold' : 'border-lab-line text-lab-text-muted'}`}><Sparkles className="size-3.5" />Build Your Own</Button>
        </div>

        {mode !== 'custom' && (
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1.5 flex items-center gap-1.5"><Globe2 className="size-3.5" />Reviewing authority (affects verdict conventions)</p>
            <div className="flex flex-wrap gap-1.5">
              {REGULATORS.map((r) => (
                <Button key={r.key} onClick={() => setAuthorityKey(r.key)} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${authorityKey === r.key ? 'border-lab-violet text-lab-violet glow-violet' : 'border-lab-line text-lab-text-muted'}`}>{r.name}</Button>
              ))}
            </div>
            <p className="text-xs text-lab-text-muted mt-1.5">{getRegulator(authorityKey).note}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-mono text-lab-text-muted mb-1.5">Trial application before first patient in</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([['us', 'US IND'], ['eu', 'EU (CTIS)'], ['both', 'US and EU'], ['none', 'Skip (classic game)']] as const).map(([k, l]) => (
              <Button key={k} onClick={() => setAppRegions(k)} variant="outline" size="sm" className={`border-2 font-mono ${appRegions === k ? 'border-lab-cyan text-lab-cyan glow-cyan' : 'border-lab-line text-lab-text-muted'}`}>{l}</Button>
            ))}
          </div>
        </div>

        {mode !== 'custom' && (
          <div>
            <p className="text-xs font-mono text-lab-text-muted mb-1.5">Difficulty</p>
            <div className="flex gap-2">
              <Button onClick={() => setDifficulty('guided')} variant="outline" size="sm" className={`flex-1 border-2 font-mono ${difficulty === 'guided' ? 'border-lab-cyan text-lab-cyan glow-cyan' : 'border-lab-line text-lab-text-muted'}`}>Guided (hints visible)</Button>
              <Button onClick={() => setDifficulty('expert')} variant="outline" size="sm" className={`flex-1 border-2 font-mono ${difficulty === 'expert' ? 'border-lab-cyan text-lab-cyan glow-cyan' : 'border-lab-line text-lab-text-muted'}`}>Expert (hints hidden until chosen)</Button>
            </div>
          </div>
        )}

        {mode === 'curated' && (
          <div className="grid gap-3">
            {PLATFORM_GROUPS.map((group) => {
              const Icon = platformIcon(group)
              return (
                <div key={group}>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-lab-text-muted mb-1.5 flex items-center gap-1.5"><Icon className="size-3.5 text-lab-cyan" />{group}</p>
                  <div className="grid gap-2">
                    {SCENARIOS.filter((s) => s.platformGroup === group).map((s) => (
                      <Card key={s.id} className="bg-lab-panel/80 border-lab-line cursor-pointer transition-all hover:border-lab-cyan hover:glow-cyan" onClick={() => pickCurated(s.id)}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <p className="font-mono font-bold text-lab-text flex items-center gap-1.5"><Icon className="size-4 text-lab-cyan" />{s.drug} <span className="text-lab-text-muted text-xs">{s.code}</span></p>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lab-panel-strong text-lab-cyan">{s.fihRisk} FIH risk</span>
                          </div>
                          <p className="text-xs text-lab-text-muted mt-1">{s.indication}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {mode === 'endless' && (
          <Card className="bg-lab-panel/80 border-lab-violet border-2 glow-violet">
            <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-violet flex items-center gap-2"><Dna className="size-4" />Endless Practice</CardTitle>
              <CardDescription className="text-xs text-lab-text-muted">Generated from the {GENERATOR_ARCHETYPE_COUNT} validated archetypes above, with a fresh procedurally-generated drug name and randomized flavor text each time — the grading logic is always the fully validated one, never guessed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={pickGenerated} className="w-full bg-lab-violet text-lab-bg hover:bg-lab-violet/90 font-mono gap-1.5">Generate a new program <ArrowRight className="size-4" /></Button>
            </CardContent>
          </Card>
        )}

        {mode === 'custom' && (
          <>
            <div>
              <p className="text-xs font-mono text-lab-text-muted mb-1.5 flex items-center gap-1.5"><Globe2 className="size-3.5" />Reviewing authority (affects verdict conventions)</p>
              <div className="flex flex-wrap gap-1.5">
                {REGULATORS.map((r) => (
                  <Button key={r.key} onClick={() => setAuthorityKey(r.key)} variant="outline" size="sm" className={`border-2 font-mono text-[11px] ${authorityKey === r.key ? 'border-lab-violet text-lab-violet glow-violet' : 'border-lab-line text-lab-text-muted'}`}>{r.name}</Button>
                ))}
              </div>
            </div>
            <CustomStudyWizard onBuild={pickScenario} />
          </>
        )}
      </div>
    )
  }

  // -------------------- brief --------------------
  if (step === 'brief') {
    const Icon = platformIcon(scenario.platformGroup)
    return (
      <div className="space-y-4">
        {progressBar}
        {abandonControl}
        <Card className="bg-lab-panel/80 border-lab-line glow-cyan">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono text-lab-text-muted uppercase">Investigator's brochure summary (fictional)</span>
            <CardTitle className="font-mono text-lg text-lab-text flex items-center gap-2"><Icon className="size-5 text-lab-cyan" />{scenario.drug} <span className="text-sm text-lab-text-muted">{scenario.code}</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-mono text-lab-text-muted text-xs uppercase">Modality: </span>{scenario.modality}</p>
            <p><span className="font-mono text-lab-text-muted text-xs uppercase">Indication: </span>{scenario.indication}</p>
            <p><span className="font-mono text-lab-text-muted text-xs uppercase">Mechanism: </span>{scenario.moa}</p>
            <p><span className="font-mono text-lab-text-muted text-xs uppercase">Preclinical: </span>{scenario.preclinical}</p>
            <p><span className="font-mono text-lab-text-muted text-xs uppercase">Known: </span>{scenario.known}</p>
            <p><span className="font-mono text-lab-text-muted text-xs uppercase">Unknown: </span>{scenario.unknown}</p>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button onClick={startNewProgram} variant="outline" className="border-2 border-lab-line font-mono gap-1.5"><ArrowLeft className="size-4" />Choose a different program</Button>
          <Button onClick={() => setStep('p1')} className="flex-1 bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5">Begin Phase I design <ArrowRight className="size-4" /></Button>
        </div>
      </div>
    )
  }

  if (step === 'p1') return (
    <div className="space-y-4">
      {progressBar}
      {abandonControl}
      <DecisionForm scenario={scenario} phase="p1" choices={choices} setChoices={setChoices} difficulty={difficulty} onSubmit={submitP1} submitLabel={indGate ? 'Lock protocol and prepare the IND' : euGate ? 'Lock protocol and prepare the EU application' : 'Lock protocol and run Phase I'} onBack={() => setStep('brief')} backLabel="Back to program brief" />
    </div>
  )
  if (step === 'ind') return (
    <div className="space-y-4">
      {progressBar}
      {abandonControl}
      <IndStep scenario={scenario} choices={choices} onBack={() => setStep('p1')} onDone={afterInd} doneLabel={euGate ? 'Go to the EU application' : undefined} />
    </div>
  )
  if (step === 'eu') return (
    <div className="space-y-4">
      {progressBar}
      {abandonControl}
      <EuStep scenario={scenario} choices={choices} onBack={() => setStep(indGate ? 'ind' : 'p1')} onDone={afterEu} extraRows={indSummary ? [indRow(indSummary)] : []} />
    </div>
  )
  if (step === 'p1r' && p1) return <div className="space-y-4">{progressBar}<PhaseResultView outcome={p1} flows={flows} grades={grades.filter((g) => g.phase === 'p1')} onNext={() => setStep('p2')} nextLabel="Design Phase II" extra={indSummary ? (
    <Card className={`bg-lab-panel/80 border-2 ${indSummary.holdCycles ? 'border-lab-red' : 'border-lab-emerald'}`}>
      <CardContent className="pt-4 space-y-1">
        <p className="font-mono text-sm text-lab-text">US IND: the study could proceed on day {indSummary.proceedDay}; first patient in on day {indSummary.firstPatientDay}.</p>
        <p className="text-xs text-lab-text-muted">{indSummary.holdCycles ? `${indSummary.holdCycles} clinical hold cycle${indSummary.holdCycles > 1 ? 's' : ''} cost ${indSummary.proceedDay - 30} days.` : 'No clinical hold.'}{indSummary.requests ? ` ${indSummary.requests} information request${indSummary.requests > 1 ? 's' : ''}.` : ''}{indSummary.corrected.length ? ` Protocol changed to answer FDA: ${indSummary.corrected.join(', ')}.` : ''}</p>
      </CardContent>
    </Card>
  ) : undefined} extraAfter={euSummary ? (
    <div className="space-y-3">
      <Card className={`bg-lab-panel/80 border-2 ${euSummary.refusals ? 'border-lab-red' : 'border-lab-emerald'}`}>
        <CardContent className="pt-4 space-y-1">
          <p className="font-mono text-sm text-lab-text">EU (CTR, CTIS): {euSummary.countries.map((c) => `${c.name} ${c.status === 'authorised' ? `day ${c.decisionDay}` : c.status}`).join(' · ')}; first subject in on day {euSummary.firstPatientDay}.</p>
          <p className="text-xs text-lab-text-muted">{euSummary.rfis ? `${euSummary.rfis} reviewer question${euSummary.rfis > 1 ? 's' : ''}.` : 'No reviewer questions.'}{euSummary.refusals ? ` ${euSummary.refusals} refusal${euSummary.refusals > 1 ? 's' : ''}.` : ''} Transparency category {euSummary.category}{euSummary.categoryOk ? '' : ' (a phase I trial is category 1)'}.{euSummary.corrected.length ? ` Protocol changed to answer the reviewers: ${euSummary.corrected.join(', ')}.` : ''}</p>
        </CardContent>
      </Card>
      <StartupTimeline rows={[...(indSummary ? [indRow(indSummary)] : []), ...euSummary.rows]} />
    </div>
  ) : undefined} /></div>
  if (step === 'p2') return (
    <div className="space-y-4">
      {progressBar}
      {abandonControl}
      <DecisionForm scenario={scenario} phase="p2" choices={choices} setChoices={setChoices} difficulty={difficulty} onSubmit={submitP2} submitLabel="Lock protocol and run Phase II" onBack={() => setStep('p1r')} backLabel="Back to Phase I results" />
    </div>
  )
  if (step === 'p2r' && p2) return (
    <div className="space-y-4">
      {progressBar}
      <PhaseResultView outcome={p2} flows={flows} grades={grades.filter((g) => g.phase === 'p2')} onNext={() => setStep('p3')} nextLabel="Design Phase III"
        extra={!meetingTaken ? (
          <Card className="bg-lab-panel/80 border-lab-line">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm text-lab-text">Optional: request a regulatory meeting to discuss your Phase III plan before locking it in.</p>
              <Button onClick={() => setStep('p3')} variant="outline" className="w-full border-2 border-lab-line font-mono">Skip meeting, design Phase III directly</Button>
            </CardContent>
          </Card>
        ) : undefined} />
    </div>
  )

  if (step === 'p3') {
    return (
      <div className="space-y-4">
        {progressBar}
        {abandonControl}
        {!meetingTaken && (
          <Card className="bg-lab-panel/80 border-2 border-lab-blue glow-cyan">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm text-lab-text flex items-center gap-2"><Users className="size-4 text-lab-blue shrink-0" />You can request a regulatory meeting once you've drafted answers below, to get feedback before locking the protocol.</p>
              <Button onClick={requestMeeting} disabled={!buildDecisions(scenario, 'p3').every((d) => choices[d.id])} variant="outline" className="w-full border-2 border-lab-blue text-lab-blue font-mono">Request regulatory meeting on current draft</Button>
            </CardContent>
          </Card>
        )}
        {scenario.acceleratedEligible && getRegulator(authorityKey).acceleratedPathway && p2?.hit && (
          <Card className="bg-lab-panel/80 border-2 border-lab-gold glow-gold">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm text-lab-text">This authority offers an accelerated pathway for this program based on your Phase II surrogate result, with a mandatory Phase IV confirmatory trial commitment.</p>
              <Button onClick={() => setUseAccelerated((v) => !v)} variant="outline" className={`w-full border-2 font-mono ${useAccelerated ? 'border-lab-gold text-lab-gold' : 'border-lab-line text-lab-text-muted'}`}>{useAccelerated ? '✓ Pursuing accelerated pathway' : 'Pursue accelerated pathway instead of standard Phase III'}</Button>
            </CardContent>
          </Card>
        )}
        <DecisionForm scenario={scenario} phase="p3" choices={choices} setChoices={setChoices} difficulty={difficulty} onSubmit={submitP3} submitLabel="Lock protocol and run Phase III" onBack={() => setStep('p2r')} backLabel="Back to Phase II results" />
      </div>
    )
  }

  if (step === 'meeting' && meetingFeedback) {
    return (
      <div className="space-y-4">
        {progressBar}
        <Card className="bg-lab-panel/80 border-2 border-lab-blue glow-cyan">
          <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-blue flex items-center gap-2"><Users className="size-4" />Regulatory Meeting Feedback</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {meetingFeedback.concerns.length > 0 ? (
              <div>
                <p className="text-xs font-mono text-lab-red uppercase mb-1">Concerns raised</p>
                {meetingFeedback.concerns.map((c, i) => <p key={i} className="text-sm text-lab-text mb-1.5">{c}</p>)}
              </div>
            ) : <p className="text-sm text-lab-emerald flex items-center gap-1.5"><CheckCircle2 className="size-4" />No major concerns raised with your current draft.</p>}
            {meetingFeedback.supportive.length > 0 && (
              <div>
                <p className="text-xs font-mono text-lab-emerald uppercase mb-1">Agreement</p>
                {meetingFeedback.supportive.map((c, i) => <p key={i} className="text-sm text-lab-text mb-1.5">{c}</p>)}
              </div>
            )}
          </CardContent>
        </Card>
        <Button onClick={() => setStep('p3')} className="w-full bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5">Revise and finalize Phase III design <ArrowRight className="size-4" /></Button>
      </div>
    )
  }

  if (step === 'p3r' && p3 && report) {
    return (
      <div className="space-y-4">
        {progressBar}
        <PhaseResultView outcome={p3} flows={flows} grades={grades.filter((g) => g.phase === 'p3')} onNext={goToPhaseIVOrReport} nextLabel={report.verdict === 'approvable' || report.verdict === 'provisional' ? 'Open Phase IV / post-marketing' : 'Open regulatory review'} />
      </div>
    )
  }

  if (step === 'phaseIV' && report && (report.verdict === 'approvable' || report.verdict === 'provisional')) {
    return (
      <div className="space-y-4">
        {progressBar}
        <Card className="bg-lab-panel/80 border-2 border-lab-gold glow-gold">
          <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-gold flex items-center gap-2"><ShieldCheck className="size-4" />Phase IV — {report.verdict === 'provisional' ? 'Confirmatory trial commitment due' : phaseIvEvent.headline}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-lab-text">{report.verdict === 'provisional' ? 'Your provisional approval requires completing the committed confirmatory trial. How does the program respond?' : phaseIvEvent.description}</p>
            <div className="grid gap-2">
              <Button onClick={() => resolvePhaseIV(true)} variant="outline" className="border-2 border-lab-emerald text-lab-emerald font-mono h-auto py-2 whitespace-normal text-left justify-start">{report.verdict === 'provisional' ? 'Prioritize resources to complete the confirmatory trial rigorously and on time' : 'Conduct a prompt, thorough safety review with transparent communication'}</Button>
              <Button onClick={() => resolvePhaseIV(false)} variant="outline" className="border-2 border-lab-red text-lab-red font-mono h-auto py-2 whitespace-normal text-left justify-start">{report.verdict === 'provisional' ? 'Deprioritize the confirmatory trial in favor of other programs' : 'Downplay the signal and delay a formal response'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'report' && report) {
    const pct = Math.round((report.score / report.maxScore) * 100)
    const tone = report.verdict === 'approvable' || report.verdict === 'provisional' ? { border: 'border-lab-emerald', glow: 'glow-emerald', Icon: ShieldCheck }
      : report.verdict === 'complete_response' ? { border: 'border-lab-gold', glow: 'glow-gold', Icon: CircleAlert }
      : { border: 'border-lab-red', glow: 'glow-red', Icon: ShieldAlert }
    return (
      <div className="space-y-4">
        {progressBar}
        <Card className={`bg-lab-panel/80 border-2 ${tone.border} ${tone.glow}`}>
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono text-lab-text-muted uppercase flex items-center gap-1.5"><Globe2 className="size-3" />{getRegulator(authorityKey).name} — regulatory review decision</span>
            <CardTitle className="font-mono text-xl text-lab-text flex items-center gap-2"><tone.Icon className="size-6" />{report.verdictLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-lab-text leading-relaxed">{report.verdictSummary}</p>
            {phaseIvOutcomeNote && <p className="rounded border border-lab-gold bg-lab-gold-soft p-3 text-sm text-lab-text">{phaseIvOutcomeNote}</p>}
            {report.deficiencies.length > 0 && (
              <div>
                <p className="text-xs font-mono text-lab-red uppercase mb-2">Deficiencies cited</p>
                {report.deficiencies.map((d, i) => <p key={i} className="rounded border border-lab-red bg-lab-red-soft p-2.5 text-sm text-lab-text mb-2">{d}</p>)}
              </div>
            )}
            {report.strengths.length > 0 && (
              <div>
                <p className="text-xs font-mono text-lab-emerald uppercase mb-2">Strengths recognized</p>
                {report.strengths.map((d, i) => <p key={i} className="rounded border border-lab-emerald bg-lab-emerald-soft p-2.5 text-sm text-lab-text mb-2">{d}</p>)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-lab-panel/80 border-lab-line">
          <CardContent className="pt-4">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div><p className="text-xs font-mono text-lab-text-muted uppercase">Design score</p><p className="text-lg font-mono text-lab-text">{report.score}/{report.maxScore}</p></div>
              <div className="text-3xl font-mono text-lab-cyan">{pct}%</div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-lab-panel-strong overflow-hidden"><div className="h-full bg-gradient-to-r from-lab-cyan/60 to-lab-cyan" style={{ width: `${pct}%` }} /></div>
          </CardContent>
        </Card>

        <PatientFlowDiagram flows={flows} />

        {p1 && p2 && p3 && <AuthorityComparisonCard scenario={scenario} choices={choices} p1={p1} p2={p2} p3={p3} grades={report.grades} useAccelerated={useAccelerated} primaryAuthorityKey={authorityKey} />}

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest font-mono text-lab-violet">Full decision record</p>
          {report.grades.map((g) => <GradeRow key={g.decisionId} grade={g} />)}
        </div>

        {report.verdict === 'complete_response' && redesignCount < 2 && (
          <Card className="bg-lab-panel/80 border-2 border-lab-gold glow-gold">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm text-lab-text">You can revise your Phase III design and resubmit (up to {2 - redesignCount} more time{2 - redesignCount === 1 ? '' : 's'}).</p>
              <Button onClick={redesignP3} className="w-full bg-lab-gold text-lab-bg hover:bg-lab-gold/90 font-mono gap-1.5">Revise Phase III and resubmit <ArrowRight className="size-4" /></Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-lab-panel/80 border-lab-line">
          <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-text-muted flex items-center gap-2"><Trophy className="size-4 text-lab-gold" />Submit to leaderboard</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {scoreSubmitted ? <p className="text-sm text-lab-emerald">Recorded on this device. Check the Leaderboard tab.</p> : (
              <div className="flex gap-2">
                <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" maxLength={32} className="bg-lab-panel-strong border-lab-line text-lab-text" />
                <Button onClick={handleSubmitScore} disabled={!playerName.trim() || !canSubmitScore} className="bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono">Submit</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={downloadReport} variant="outline" className="flex-1 border-2 border-lab-line font-mono">⬇ Download report</Button>
          <Button onClick={startNewProgram} className="flex-1 bg-lab-violet text-lab-bg hover:bg-lab-violet/90 font-mono gap-1.5"><RotateCcw className="size-4" />New program</Button>
        </div>
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

type Tab = 'play' | 'ind' | 'assessment' | 'glossary' | 'leaderboard' | 'history'

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  return (
    <div className="min-h-screen bg-lab-bg text-lab-text">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border-2 border-lab-cyan bg-lab-cyan-soft text-lab-cyan glow-cyan animate-pulse-glow">
              <Activity className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest font-mono text-lab-cyan">Clinical Trial Simulator</p>
              <h1 className="text-xl font-mono font-bold text-lab-text">Design a program. Face the review.</h1>
            </div>
          </div>
          <p className="text-sm text-lab-text-muted">Take a fictional drug or vaccine from first-in-human through a Phase I-III program, choose your reviewing authority, and see a regulation-grounded verdict.</p>
        </header>

        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === 'play'} onClick={() => setTab('play')} icon={FlaskConical}>Play</TabButton>
          <TabButton active={tab === 'ind'} onClick={() => setTab('ind')} icon={ShieldCheck}>Application missions</TabButton>
          <TabButton active={tab === 'assessment'} onClick={() => setTab('assessment')} icon={ClipboardCheck}>Assessment</TabButton>
          <TabButton active={tab === 'glossary'} onClick={() => setTab('glossary')} icon={BookOpen}>Glossary</TabButton>
          <TabButton active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')} icon={Trophy}>Leaderboard</TabButton>
          <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={HistoryIcon}>History</TabButton>
        </div>

        {tab === 'play' && <PlayTab />}
        {tab === 'ind' && <IndMissions />}
        {tab === 'assessment' && <AssessmentTab />}
        {tab === 'glossary' && <GlossaryTab />}
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'history' && <HistoryTab />}

        <p className="text-center text-xs text-lab-text-muted font-mono">All drugs, vaccines, scenarios, and outcomes are entirely fictional — an educational simulation, not regulatory guidance.</p>
        <p className="text-center text-xs text-lab-text-muted font-mono">built by Khan Gulrez Shagufa Fazal Ahmed</p>
      </div>
    </div>
  )
}
