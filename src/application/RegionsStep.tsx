import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import type { Choices, Scenario } from '../data/ct-types'
import { SAFETY_OPTIONS } from './ind'
import { CT_PACKS, emptyRegionForm, regionComplete, runRegion, type RegionCode, type RegionForm, type RegionSummary } from './regions'
import { StartupTimeline, type TimelineRow } from './EuStep'

const sel = (on: boolean) => (on ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted')
function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button variant="outline" aria-pressed={on} onClick={onClick} className={`w-full h-auto justify-start text-left whitespace-normal border-2 py-2 text-sm ${sel(on)}`}>{children}</Button>
}

export interface RegionsResult { summaries: RegionSummary[]; rows: TimelineRow[] }

export default function RegionsStep({ scenario, choices, onBack, onDone, doneLabel = 'Run Phase I', fixed, extraRows = [] }: { scenario: Scenario; choices: Choices; onBack: () => void; onDone: (corrected: Choices, r: RegionsResult) => void; doneLabel?: string; fixed?: RegionCode[]; extraRows?: TimelineRow[] }) {
  const [chosen, setChosen] = useState<RegionCode[]>(fixed ?? ['UK', 'CA'])
  const [forms, setForms] = useState<Record<string, RegionForm>>(() => Object.fromEntries(CT_PACKS.map((p) => [p.id, emptyRegionForm(p)])))
  const [phase, setPhase] = useState<'build' | 'review'>('build')
  const [answers, setAnswers] = useState<Record<string, Record<string, string> | null>>({})
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({})
  const [resubmit, setResubmit] = useState<Record<string, boolean>>({})
  const packs = CT_PACKS.filter((p) => chosen.includes(p.id))
  const outcomes = useMemo(() => phase === 'review' ? packs.map((p) => runRegion(p, scenario, choices, forms[p.id], answers[p.id] ?? null, !!resubmit[p.id])) : [], [phase, packs, scenario, choices, forms, answers, resubmit])
  const setForm = (id: string, f: RegionForm) => setForms({ ...forms, [id]: f })

  if (phase === 'build') return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-line"><CardContent className="pt-4 space-y-2">
        <p className="font-mono text-sm text-lab-cyan">More regions: the UK, Canada, Australia, Japan and China</p>
        <p className="text-xs text-lab-text-muted">Choose where else {scenario.drug} will start its first-in-human trial. Each region has its own route, documents and clock; no agency system is reproduced.</p>
        {!fixed && <div className="flex flex-wrap gap-2">{CT_PACKS.map((p) => <Button key={p.id} size="sm" variant="outline" aria-pressed={chosen.includes(p.id)} className={`border-2 font-mono text-xs ${sel(chosen.includes(p.id))}`} onClick={() => setChosen(chosen.includes(p.id) ? chosen.filter((x) => x !== p.id) : [...chosen, p.id])}>{p.name}</Button>)}</div>}
      </CardContent></Card>
      {packs.map((p) => {
        const f = forms[p.id]
        const toggle = (k: 'docs' | 'safety', id: string) => setForm(p.id, { ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] })
        return (
          <Card key={p.id} className="bg-lab-panel/80 border-lab-line gap-3">
            <CardHeader className="pb-0">
              <CardDescription className="font-mono text-[10px] uppercase text-lab-text-muted">{p.regulation}</CardDescription>
              <CardTitle className="font-mono text-sm text-lab-text flex items-center gap-2">{regionComplete(f) ? <span className="text-lab-emerald">●</span> : <span className="text-lab-gold">○</span>}{p.name} · {p.reviewer}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs font-mono text-lab-text">Route</p>
              {p.routes.map((r) => <Choice key={r.id} on={f.route === r.id} onClick={() => setForm(p.id, { ...f, route: r.id })}>{r.label}<span className="block text-[11px] text-lab-text-muted mt-0.5">{r.note}</span></Choice>)}
              <p className="text-xs font-mono text-lab-text">Documents</p>
              {p.docs.map((d) => <Choice key={d.id} on={f.docs.includes(d.id)} onClick={() => toggle('docs', d.id)}>{f.docs.includes(d.id) ? '☑ ' : '☐ '}{d.title}</Choice>)}
              <p className="text-xs font-mono text-lab-text">Protocol safety measures</p>
              {SAFETY_OPTIONS.map((o) => <Choice key={o.id} on={f.safety.includes(o.id)} onClick={() => toggle('safety', o.id)}>{f.safety.includes(o.id) ? '☑ ' : '☐ '}{o.label}</Choice>)}
              <p className="text-xs font-mono text-lab-text">{p.trap.prompt}</p>
              {p.trap.options.map((o) => <Choice key={o.id} on={f.trap === o.id} onClick={() => setForm(p.id, { ...f, trap: o.id })}>{o.label}</Choice>)}
            </CardContent>
          </Card>
        )
      })}
      <div className="flex gap-2">
        <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
        <Button className="flex-1 bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5" disabled={!packs.length || packs.some((p) => !regionComplete(forms[p.id]))} onClick={() => setPhase('review')}>Submit in {packs.length} region{packs.length === 1 ? '' : 's'} <ArrowRight className="size-4" /></Button>
      </div>
    </div>
  )

  const rows: TimelineRow[] = outcomes.map((o) => ({ label: CT_PACKS.find((p) => p.id === o.code)!.name, segments: o.segments, end: o.firstPatientDay > 0 ? `first participant day ${o.firstPatientDay}` : o.stage === 'questions' ? 'questions' : o.objection ? 'objection' : 'blocked' }))
  const allDecided = outcomes.every((o) => o.stage === 'decided')
  return (
    <div className="space-y-4">
      {outcomes.map((o) => {
        const p = CT_PACKS.find((x) => x.id === o.code)!
        return (
          <Card key={o.code} className="bg-lab-panel/80 border-lab-line gap-2">
            <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-text">{p.name}: review (simulated)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[...o.events].sort((x, y) => x.day - y.day).map((e, i) => <p key={i} className={`text-xs ${e.kind === 'refusal' ? 'text-lab-red' : e.kind === 'request' ? 'text-lab-gold' : e.kind === 'ok' ? 'text-lab-emerald' : 'text-lab-text-muted'}`}><span className="font-mono inline-block w-16">Day {e.day}</span>{e.text}</p>)}
              {o.stage === 'questions' && (
                <div className="space-y-2">
                  {o.findings.map((f) => (
                    <div key={f.id} className="rounded border-2 border-lab-gold/60 p-3 space-y-2">
                      <p className="text-[10px] font-mono uppercase text-lab-gold flex items-center gap-1"><ShieldAlert className="size-3" />Reviewer question (simulated) · {f.cite}</p>
                      <p className="text-sm text-lab-text">{f.text}</p>
                      {f.options.map((x) => <Choice key={x.id} on={draft[o.code]?.[f.id] === x.id} onClick={() => setDraft({ ...draft, [o.code]: { ...(draft[o.code] ?? {}), [f.id]: x.id } })}>{x.label}</Choice>)}
                    </div>
                  ))}
                  <Button className="w-full font-mono" disabled={o.findings.some((f) => !draft[o.code]?.[f.id])} onClick={() => setAnswers({ ...answers, [o.code]: draft[o.code] })}>Send the answers</Button>
                </div>
              )}
              {o.stage === 'decided' && o.objection && <Button size="sm" className="font-mono" onClick={() => setResubmit({ ...resubmit, [o.code]: true })}>Resubmit with the changes</Button>}
              {o.stage === 'decided' && !o.objection && o.problems.length > 0 && <p className="text-xs text-lab-red">{o.problems.join(' ')} Go back and fix it to start here.</p>}
            </CardContent>
          </Card>
        )
      })}
      {allDecided && <StartupTimeline rows={[...extraRows, ...rows]} />}
      <div className="flex gap-2">
        <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5" onClick={() => { setPhase('build'); setAnswers({}); setResubmit({}) }}><ArrowLeft className="size-4" />Edit the applications</Button>
        <Button className="flex-1 bg-lab-emerald text-lab-bg hover:bg-lab-emerald/90 font-mono gap-1.5" disabled={!allDecided} onClick={() => {
          const corrected: Choices = {}
          for (const o of outcomes) Object.assign(corrected, Object.fromEntries(Object.entries(o.correctedChoices).filter(([k, v]) => v !== choices[k])))
          onDone(corrected, { summaries: outcomes.map((o) => ({ code: o.code, name: CT_PACKS.find((p) => p.id === o.code)!.name, authorisedDay: o.authorisedDay, firstPatientDay: o.firstPatientDay, questions: o.findings.length, objection: o.objection, problems: o.problems })), rows })
        }}><ShieldCheck className="size-4" />{doneLabel}</Button>
      </div>
    </div>
  )
}
