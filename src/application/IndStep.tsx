import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ShieldAlert, ShieldCheck, Download, ArrowRight, ArrowLeft, Clock } from 'lucide-react'
import type { Choices, Scenario } from '../data/ct-types'
import {
  COMMITMENTS, PLAN_OPTIONS, IB_SECTIONS, SAFETY_OPTIONS, LABEL_OPTIONS, IND_PARTS, EMPTY_FORM,
  canSubmit, runReview, indPackage, type IndForm, type ReviewAnswers, type IndOutcome,
} from './ind'
import { userId, classId } from './store'

export interface IndSummary { proceedDay: number; firstPatientDay: number; holdCycles: number; requests: number; findings: string[]; corrected: string[] }

const sel = (on: boolean) => (on ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted')

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button variant="outline" aria-pressed={on} onClick={onClick} className={`w-full h-auto justify-start text-left whitespace-normal border-2 py-2 text-sm ${sel(on)}`}>{children}</Button>
}

function Part({ n, title, cite, ectd, ok, children }: { n: number; title: string; cite: string; ectd: string; ok: boolean; children: React.ReactNode }) {
  return (
    <Card className="bg-lab-panel/80 border-lab-line gap-3">
      <CardHeader className="pb-0">
        <CardDescription className="font-mono text-[10px] uppercase text-lab-text-muted">Part {n} · {cite} · eCTD {ectd}</CardDescription>
        <CardTitle className="font-mono text-sm text-lab-text flex items-center gap-2">{ok ? <span className="text-lab-emerald">●</span> : <span className="text-lab-gold">○</span>}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  )
}

export function IndBuilder({ scenario, choices, form, setForm }: { scenario: Scenario; choices: Choices; form: IndForm; setForm: (f: IndForm) => void }) {
  const set = <K extends keyof IndForm>(k: K, v: IndForm[K]) => setForm({ ...form, [k]: v })
  const toggle = (k: 'commitments' | 'ibSections' | 'safety', id: string) => set(k, form[k].includes(id) ? form[k].filter((x) => x !== id) : [...form[k], id])
  const done = (id: string) => IND_PARTS.find((p) => p.id === id)!.complete(form)
  const healthy = choices['p1_population'] === 'healthy'
  return (
    <div className="space-y-3">
      <Part n={1} title="Form FDA 1571" cite="21 CFR 312.23(a)(1)" ectd="1.1" ok={done('1571')}>
        <Input value={form.sponsor} onChange={(e) => set('sponsor', e.target.value)} placeholder="Sponsor name (fictional)" maxLength={60} className="bg-lab-panel-strong border-lab-line text-lab-text" />
        <p className="text-xs text-lab-text-muted">IND type</p>
        <div className="grid grid-cols-2 gap-2">{(['commercial', 'research'] as const).map((t) => <Choice key={t} on={form.indType === t} onClick={() => set('indType', t)}>{t === 'commercial' ? 'Commercial (company-sponsored)' : 'Research (investigator-sponsored)'}</Choice>)}</div>
        <p className="text-xs text-lab-text-muted">The sponsor's commitments (tick every one you will sign)</p>
        {COMMITMENTS.map((c) => <Choice key={c.id} on={form.commitments.includes(c.id)} onClick={() => toggle('commitments', c.id)}>{form.commitments.includes(c.id) ? '☑ ' : '☐ '}{c.label}</Choice>)}
        <p className="text-xs text-lab-text-muted">A contract research organization will monitor the study. Transfer of sponsor obligations (21 CFR 312.52):</p>
        <Choice on={form.cro === 'listed'} onClick={() => set('cro', 'listed')}>Listed on the 1571: monitoring and safety reporting transferred to the CRO</Choice>
        <Choice on={form.cro === 'not_listed'} onClick={() => set('cro', 'not_listed')}>Not listed: the contract covers it</Choice>
        <Choice on={form.cro === 'none'} onClick={() => set('cro', 'none')}>No obligations are transferred</Choice>
      </Part>

      <Part n={2} title="Introductory statement and general investigational plan" cite="21 CFR 312.23(a)(3)" ectd="1.20" ok={done('plan')}>
        {PLAN_OPTIONS.map((p) => <Choice key={p.id} on={form.plan === p.id} onClick={() => set('plan', p.id)}>{p.label}</Choice>)}
      </Part>

      <Part n={3} title="Investigator's brochure" cite="21 CFR 312.23(a)(5)" ectd="1.14.4.1" ok={done('ib')}>
        <p className="text-xs text-lab-text-muted">Which sections does your brochure contain?</p>
        {IB_SECTIONS.map((s) => <Choice key={s.id} on={form.ibSections.includes(s.id)} onClick={() => toggle('ibSections', s.id)}>{form.ibSections.includes(s.id) ? '☑ ' : '☐ '}{s.label}</Choice>)}
      </Part>

      <Part n={4} title="Protocol" cite="21 CFR 312.23(a)(6)" ectd={healthy ? '5.3.3.1' : '5.3.3.2'} ok>
        <p className="text-xs text-lab-text-muted">Taken from your Phase I design: {['p1_population', 'p1_dose', 'p1_escalation', 'p1_n', 'p1_dlt'].map((k) => choices[k]).filter(Boolean).join(' · ')}. Add the safety measures the protocol will include:</p>
        {SAFETY_OPTIONS.map((s) => <Choice key={s.id} on={form.safety.includes(s.id)} onClick={() => toggle('safety', s.id)}>{form.safety.includes(s.id) ? '☑ ' : '☐ '}{s.label}</Choice>)}
      </Part>

      <Part n={5} title="Chemistry, manufacturing and controls: investigational labels" cite="21 CFR 312.23(a)(7); 312.6" ectd="2.3 and 3.2; labels 1.14.4.2" ok={done('cmc')}>
        <p className="text-xs text-lab-text-muted">Which statement goes on the immediate package of {scenario.drug}?</p>
        {LABEL_OPTIONS.map((l) => <Choice key={l.id} on={form.label === l.id} onClick={() => set('label', l.id)}>{l.label}</Choice>)}
      </Part>

      <Part n={6} title="Pharmacology and toxicology" cite="21 CFR 312.23(a)(8)" ectd="2.4 and 4.2" ok>
        <p className="text-xs text-lab-text-muted">{scenario.preclinical}</p>
        <Choice on={form.glp === 'statement'} onClick={() => set('glp', 'statement')}>Include a GLP compliance statement for each pivotal toxicology study (21 CFR Part 58)</Choice>
        <Choice on={form.glp === 'none'} onClick={() => set('glp', 'none')}>Leave it out: the study reports speak for themselves</Choice>
      </Part>

      <Part n={7} title="Previous human experience" cite="21 CFR 312.23(a)(9)" ectd="1.20" ok>
        <p className="text-xs text-lab-text-muted">None: this is the first use in humans.</p>
      </Part>

      <Part n={8} title="Form FDA 1572 and Form FDA 3674" cite="21 CFR 312.53(c); 42 U.S.C. 282(j)(5)(B)" ectd="1.1" ok={done('forms')}>
        <Choice on={form.form1572} onClick={() => set('form1572', !form.form1572)}>{form.form1572 ? '☑ ' : '☐ '}Form FDA 1572 signed by the principal investigator</Choice>
        <p className="text-xs text-lab-text-muted">Form FDA 3674 (ClinicalTrials.gov certification):</p>
        <Choice on={form.form3674 === 'not_apply'} onClick={() => set('form3674', 'not_apply')}>The registration requirements do not apply to this trial</Choice>
        <Choice on={form.form3674 === 'apply'} onClick={() => set('form3674', 'apply')}>This is an applicable clinical trial and will be registered</Choice>
      </Part>
    </div>
  )
}

function Timeline({ o }: { o: IndOutcome }) {
  const color = { info: 'text-lab-text-muted', request: 'text-lab-gold', hold: 'text-lab-red', ok: 'text-lab-emerald' }
  return (
    <Card className="bg-lab-panel/80 border-lab-line gap-2">
      <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-text flex items-center gap-2"><Clock className="size-4 text-lab-cyan" />Review clock</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-1.5">
          {o.events.map((e, i) => <li key={i} className="text-sm flex gap-3"><span className="font-mono text-xs text-lab-text-muted w-14 shrink-0">Day {e.day}</span><span className={color[e.kind]}>{e.text}</span></li>)}
        </ol>
      </CardContent>
    </Card>
  )
}

export function summarise(o: IndOutcome, original: Choices): IndSummary {
  return {
    proceedDay: o.proceedDay, firstPatientDay: o.firstPatientDay, holdCycles: o.holdCycles, requests: o.requests.length,
    findings: o.events.filter((e) => e.kind === 'hold' || e.kind === 'request').map((e) => e.text),
    corrected: Object.keys(o.correctedChoices).filter((k) => o.correctedChoices[k] !== original[k]),
  }
}

// The whole IND step: build, submit, answer requests, respond to holds, proceed.
export default function IndStep({ scenario, choices, onDone, onBack, doneLabel = 'Run Phase I' }: { scenario: Scenario; choices: Choices; onDone: (corrected: Choices, summary: IndSummary) => void; onBack?: () => void; doneLabel?: string }) {
  const [form, setForm] = useState<IndForm>(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [ans, setAns] = useState<ReviewAnswers>({ requests: {}, cycles: [] })
  const [draft, setDraft] = useState<Record<string, string>>({})
  const outcome = useMemo(() => (submitted ? runReview(scenario, choices, form, ans) : null), [submitted, scenario, choices, form, ans])

  if (!submitted || !outcome) {
    const missing = IND_PARTS.filter((p) => !p.complete(form)).map((p) => p.title)
    return (
      <div className="space-y-4">
        <Card className="bg-lab-panel/80 border-2 border-lab-cyan glow-cyan gap-2">
          <CardContent className="pt-4 space-y-1">
            <p className="font-mono text-sm text-lab-cyan flex items-center gap-2"><FileText className="size-4" />Before first patient in: the US IND</p>
            <p className="text-sm text-lab-text">Your Phase I protocol for {scenario.drug} is locked. Build the Investigational New Drug application (21 CFR 312.23). FDA has 30 days to review it; the study may start on day 30 unless FDA places it on clinical hold.</p>
          </CardContent>
        </Card>
        <IndBuilder scenario={scenario} choices={choices} form={form} setForm={setForm} />
        {missing.length > 0 && <p className="text-xs text-lab-gold font-mono">To submit, complete: {missing.join('; ')}.</p>}
        <div className="flex gap-2">
          {onBack && <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5" onClick={onBack}><ArrowLeft className="size-4" />Back to the design</Button>}
          <Button className="flex-1 bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5" disabled={!canSubmit(form)} onClick={() => setSubmitted(true)}>Submit the IND to FDA <ArrowRight className="size-4" /></Button>
        </div>
      </div>
    )
  }

  const userCtx = { userId: userId(), classId: classId() }
  return (
    <div className="space-y-4">
      <Timeline o={outcome} />

      {outcome.stage === 'requests' && (
        <Card className="bg-lab-panel/80 border-2 border-lab-gold gap-3">
          <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-gold">Day 12: FDA information requests. Answer by day 17.</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {outcome.requests.map((r) => (
              <div key={r.id} className="space-y-1.5">
                <p className="text-sm text-lab-text">{r.text} <span className="font-mono text-xs text-lab-text-muted">({r.cite})</span></p>
                {r.options.map((o) => <Choice key={o.id} on={draft[r.id] === o.id} onClick={() => setDraft({ ...draft, [r.id]: o.id })}>{o.label}</Choice>)}
              </div>
            ))}
            <Button className="w-full font-mono" disabled={outcome.requests.some((r) => !draft[r.id])} onClick={() => { setAns({ ...ans, requests: Object.fromEntries(outcome.requests.map((r) => [r.id, draft[r.id]])) }); setDraft({}) }}>Send the responses</Button>
          </CardContent>
        </Card>
      )}

      {outcome.stage === 'hold' && (
        <Card className="bg-lab-panel/80 border-2 border-lab-red glow-red gap-3">
          <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-red flex items-center gap-2"><ShieldAlert className="size-4" />Clinical hold: prepare your complete response</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {outcome.openHolds.map((h) => (
              <div key={h.id} className="space-y-1.5 rounded border border-lab-line p-2">
                <p className="text-xs font-mono text-lab-red">{h.cite}: {h.ground}</p>
                <p className="text-sm text-lab-text">{h.text}</p>
                <p className="text-xs text-lab-text-muted">{h.decisionId ? 'Your response changes the protocol to:' : 'Your response:'}</p>
                {h.options.map((o) => <Choice key={o.id} on={draft[h.id] === o.id} onClick={() => setDraft({ ...draft, [h.id]: o.id })}>{o.label}</Choice>)}
              </div>
            ))}
            <Button className="w-full font-mono bg-lab-red text-lab-bg hover:bg-lab-red/90" disabled={outcome.openHolds.some((h) => !draft[h.id])} onClick={() => { setAns({ ...ans, cycles: [...ans.cycles, draft] }); setDraft({}) }}>Submit the complete response to the clinical hold</Button>
          </CardContent>
        </Card>
      )}

      {outcome.stage === 'proceed' && (
        <Card className="bg-lab-panel/80 border-2 border-lab-emerald glow-emerald gap-3">
          <CardContent className="pt-4 space-y-2">
            <p className="font-mono text-sm text-lab-emerald flex items-center gap-2"><ShieldCheck className="size-4" />The study may proceed from day {outcome.proceedDay}. First patient in on day {outcome.firstPatientDay}.</p>
            <p className="text-xs text-lab-text-muted">{outcome.holdCycles ? `${outcome.holdCycles} hold cycle${outcome.holdCycles > 1 ? 's' : ''} cost ${outcome.proceedDay - 30} days. Changes you made to answer FDA are applied to the Phase I protocol; your original choices are still graded.` : 'No clinical hold.'} After the study starts, the IND needs safety reports (312.32), protocol amendments (312.30) and annual reports (312.33).</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5" onClick={() => download(`ind-${scenario.code.toLowerCase()}-ectd-package.json`, JSON.stringify(indPackage(scenario, outcome.correctedChoices, form, userCtx), null, 2))}><Download className="size-4" />IND package for the eCTD Dossier Builder</Button>
              <Button className="flex-1 bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5" onClick={() => onDone(outcome.correctedChoices, summarise(outcome, choices))}>{doneLabel} <ArrowRight className="size-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
