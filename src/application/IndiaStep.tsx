import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import type { Choices, Scenario } from '../data/ct-types'
import { SAFETY_OPTIONS } from './ind'
import { SECOND_SCHEDULE, IN_OPTS, EMPTY_IN, EMPTY_IN_ANSWERS, inComplete, runIndia, type InForm, type InAnswers, type InOutcome } from './india'
import { StartupTimeline, type TimelineRow } from './EuStep'

export interface IndiaSummary { permitDay: number; firstPatientDay: number; queries: number; rejected: boolean; deemed: boolean; blocked: string[]; corrected: string[]; row: TimelineRow }

const sel = (on: boolean) => (on ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted')
function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button variant="outline" aria-pressed={on} onClick={onClick} className={`w-full h-auto justify-start text-left whitespace-normal border-2 py-2 text-sm ${sel(on)}`}>{children}</Button>
}
function Section({ label, title, ok, children }: { label: string; title: string; ok: boolean; children: React.ReactNode }) {
  return (
    <Card className="bg-lab-panel/80 border-lab-line gap-3">
      <CardHeader className="pb-0">
        <CardDescription className="font-mono text-[10px] uppercase text-lab-text-muted">{label}</CardDescription>
        <CardTitle className="font-mono text-sm text-lab-text flex items-center gap-2">{ok ? <span className="text-lab-emerald">●</span> : <span className="text-lab-gold">○</span>}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  )
}

export function indiaRow(o: InOutcome): TimelineRow {
  return { label: 'India (CT-04)', segments: o.segments, end: o.firstPatientDay > 0 ? `first participant day ${o.firstPatientDay}` : o.rejected && o.permitDay < 0 ? 'rejected' : 'blocked' }
}

export function summariseIndia(o: InOutcome, original: Choices): IndiaSummary {
  return { permitDay: o.permitDay, firstPatientDay: o.firstPatientDay, queries: o.findings.length, rejected: o.rejected, deemed: o.deemed, blocked: o.blocked, corrected: Object.keys(o.correctedChoices).filter((k) => o.correctedChoices[k] !== original[k]), row: indiaRow(o) }
}

export function IndiaBuilder({ scenario, form, setForm }: { scenario: Scenario; form: InForm; setForm: (f: InForm) => void }) {
  const set = <K extends keyof InForm>(k: K, v: InForm[K]) => setForm({ ...form, [k]: v })
  const toggle = (k: 'docs' | 'safety', id: string) => set(k, form[k].includes(id) ? form[k].filter((x) => x !== id) : [...form[k], id])
  return (
    <div className="space-y-3">
      <Section label="Form CT-04 · NDCT Rules, rule 21 · Second Schedule" title="Application for permission to conduct the clinical trial" ok={!!form.sponsor.trim() && !!form.discovery && form.docs.length === SECOND_SCHEDULE.length}>
        <Input value={form.sponsor} onChange={(e) => set('sponsor', e.target.value)} placeholder="Sponsor name (fictional)" maxLength={60} className="bg-lab-panel-strong border-lab-line text-lab-text" />
        <p className="text-xs font-mono text-lab-text">Where was {scenario.drug} discovered and developed? (rules 22 and 23)</p>
        {IN_OPTS.discovery.map((o) => <Choice key={o.id} on={form.discovery === o.id} onClick={() => set('discovery', o.id as InForm['discovery'])}>{o.label}</Choice>)}
        <p className="text-xs font-mono text-lab-text">Second Schedule documents</p>
        {SECOND_SCHEDULE.map((d) => <Choice key={d.id} on={form.docs.includes(d.id)} onClick={() => toggle('docs', d.id)}>{form.docs.includes(d.id) ? '☑ ' : '☐ '}{d.title}</Choice>)}
        <p className="text-xs font-mono text-lab-text">Protocol safety measures for the first-in-human part</p>
        {SAFETY_OPTIONS.map((o) => <Choice key={o.id} on={form.safety.includes(o.id)} onClick={() => toggle('safety', o.id)}>{form.safety.includes(o.id) ? '☑ ' : '☐ '}{o.label}</Choice>)}
        <Choice on={form.compensation} onClick={() => set('compensation', !form.compensation)}>{form.compensation ? '☑ ' : '☐ '}The sponsor’s undertaking to pay compensation for trial-related injury or death (rule 39(5))</Choice>
      </Section>
      <Section label="Third Schedule · informed consent" title="Consent" ok={!!form.icf}>
        {IN_OPTS.icf.map((o) => <Choice key={o.id} on={form.icf === o.id} onClick={() => set('icf', o.id as InForm['icf'])}>{o.label}</Choice>)}
        <Choice on={form.av} onClick={() => set('av', !form.av)}>{form.av ? '☑ ' : '☐ '}Record the consent process of vulnerable participants on audio and video (new chemical entity)</Choice>
      </Section>
      <Section label="Chapter III · rules 7 to 9 · rule 25" title="Ethics committee and CTRI" ok={!!form.ec && !!form.ctri}>
        {IN_OPTS.ec.map((o) => <Choice key={o.id} on={form.ec === o.id} onClick={() => set('ec', o.id as InForm['ec'])}>{o.label}</Choice>)}
        {IN_OPTS.ctri.map((o) => <Choice key={o.id} on={form.ctri === o.id} onClick={() => set('ctri', o.id as InForm['ctri'])}>{o.label}</Choice>)}
      </Section>
    </div>
  )
}

export default function IndiaStep({ scenario, choices, onBack, onDone, doneLabel = 'Run Phase I', initial, extraRows = [] }: { scenario: Scenario; choices: Choices; onBack: () => void; onDone: (corrected: Choices, summary: IndiaSummary) => void; doneLabel?: string; initial?: Partial<InForm>; extraRows?: TimelineRow[] }) {
  const [form, setForm] = useState<InForm>({ ...EMPTY_IN, ...initial })
  const [phase, setPhase] = useState<'build' | 'review'>('build')
  const [ans, setAns] = useState<InAnswers>(EMPTY_IN_ANSWERS)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const o = useMemo(() => (phase === 'review' ? runIndia(scenario, choices, form, ans) : null), [phase, scenario, choices, form, ans])

  if (phase === 'build' || !o) return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-line"><CardContent className="pt-4 space-y-1">
        <p className="font-mono text-sm text-lab-cyan">India: New Drugs and Clinical Trials Rules, 2019</p>
        <p className="text-xs text-lab-text-muted">Three things before the first participant: CDSCO’s permission (Form CT-04 to CT-06), approval by a registered ethics committee, and registration in CTRI. CDSCO decides within 90 working days, or 30 for a drug discovered and developed in India, with deemed approval. The SUGAM portal is described, not reproduced.</p>
      </CardContent></Card>
      <IndiaBuilder scenario={scenario} form={form} setForm={setForm} />
      <div className="flex gap-2">
        <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
        <Button className="flex-1 bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5" disabled={!inComplete(form)} onClick={() => setPhase('review')}>Submit Form CT-04 <ArrowRight className="size-4" /></Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-line gap-2">
        <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-text">CDSCO review (simulated)</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {[...o.events].sort((x, y) => x.wd - y.wd).map((e, i) => <p key={i} className={`text-xs ${e.kind === "refusal" ? "text-lab-red" : e.kind === "request" ? "text-lab-gold" : e.kind === "ok" ? "text-lab-emerald" : "text-lab-text-muted"}`}><span className="font-mono inline-block w-36 whitespace-nowrap">WD {e.wd} · day {e.day}</span>{e.text}</p>)}
          <p className="text-[10px] text-lab-text-muted pt-1">WD = working days, as the Rules count them; days = calendar days at five working days a week.</p>
        </CardContent>
      </Card>
      {o.stage === 'queries' && (
        <Card className="bg-lab-panel/80 border-2 border-lab-gold gap-3">
          <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-gold flex items-center gap-2"><ShieldAlert className="size-4" />Query from CDSCO and the Subject Expert Committee</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {o.findings.map((f) => (
              <div key={f.id} className="rounded border-2 border-lab-gold/60 p-3 space-y-2">
                <p className="text-[10px] font-mono uppercase text-lab-gold">Reviewer question (simulated) · {f.cite}</p>
                <p className="text-sm text-lab-text">{f.text}</p>
                {f.options.map((x) => <Choice key={x.id} on={draft[f.id] === x.id} onClick={() => setDraft({ ...draft, [f.id]: x.id })}>{x.label}</Choice>)}
              </div>
            ))}
            <Button className="w-full font-mono" disabled={o.findings.some((f) => !draft[f.id])} onClick={() => { setAns({ ...ans, queries: { ...draft } }); setDraft({}) }}>Send the reply</Button>
          </CardContent>
        </Card>
      )}
      {o.stage === 'rejected' && (
        <Card className="bg-lab-panel/80 border-2 border-lab-red"><CardContent className="pt-4 space-y-2">
          <p className="text-sm text-lab-red">CDSCO rejected the application. Ask for reconsideration with the changes the committee asked for.</p>
          <Button className="font-mono" onClick={() => setAns({ ...ans, reconsider: true })}>Request reconsideration</Button>
        </CardContent></Card>
      )}
      {o.stage === 'decided' && (
        <>
          {o.blocked.length > 0 && (
            <Card className="bg-lab-panel/80 border-2 border-lab-red"><CardContent className="pt-4 space-y-1">
              {o.blocked.map((b) => <p key={b} className="text-sm text-lab-red">{b}</p>)}
              <Button size="sm" variant="outline" className="border-2 font-mono mt-1" onClick={() => setAns({ ...ans, fixLate: true })}>Fix: move to a registered committee and register in CTRI before enrolling</Button>
            </CardContent></Card>
          )}
          <StartupTimeline rows={[...extraRows, indiaRow(o)]} />
          <Button className="w-full bg-lab-emerald text-lab-bg hover:bg-lab-emerald/90 font-mono gap-1.5" disabled={o.firstPatientDay < 0} onClick={() => onDone(o.correctedChoices, summariseIndia(o, choices))}><ShieldCheck className="size-4" />{doneLabel}</Button>
        </>
      )}
    </div>
  )
}
