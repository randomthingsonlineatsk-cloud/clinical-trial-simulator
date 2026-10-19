import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, ShieldCheck, Download, ArrowRight, ArrowLeft, Clock, Eye } from 'lucide-react'
import type { Choices, Scenario } from '../data/ct-types'
import { SAFETY_OPTIONS } from './ind'
import {
  MEMBER_STATES, PART1_DOCS, PART2_DOCS, PART2_SIMPLE, OPTS, CATEGORIES, TRANSPARENCY, EMPTY_EU, EMPTY_ANSWERS,
  part1Complete, part2Complete, countriesReady, canSubmitEu, runEu, euChecklist, msName,
  type EuForm, type EuAnswers, type EuOutcome, type EuFinding,
} from './eu'
import { userId, classId } from './store'
import type { IndSummary } from './IndStep'

export interface EuSummary { countries: { code: string; name: string; status: string; decisionDay: number; firstPatientDay: number }[]; rfis: number; refusals: number; lapsed: boolean; category: string; categoryOk: boolean; corrected: string[]; firstPatientDay: number; rows: TimelineRow[] }

const sel = (on: boolean) => (on ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted')
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}
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

// ------------------------------------------------------------------------------ timeline
export interface TimelineSeg { from: number; to: number; kind: string; label: string }
export interface TimelineRow { label: string; segments: TimelineSeg[]; end: string }
const SEG_COLOR: Record<string, string> = { validation: 'bg-lab-cyan/50', assessment: 'bg-lab-cyan', review: 'bg-lab-cyan', rfi: 'bg-lab-gold', request: 'bg-lab-gold', hold: 'bg-lab-red', refused: 'bg-lab-red', decision: 'bg-lab-emerald/60', resubmission: 'bg-lab-red/40', activation: 'bg-lab-emerald' }

export function indRow(s: IndSummary): TimelineRow {
  const segs: TimelineSeg[] = [{ from: 0, to: 30, kind: 'review', label: '30-day IND review' }]
  if (s.holdCycles) segs.push({ from: 30, to: s.proceedDay, kind: 'hold', label: `Clinical hold (${s.holdCycles} cycle${s.holdCycles > 1 ? 's' : ''})` })
  segs.push({ from: s.proceedDay, to: s.firstPatientDay, kind: 'activation', label: 'IRB approval and site activation' })
  return { label: 'United States (IND)', segments: segs, end: `first patient day ${s.firstPatientDay}` }
}
export function euRows(o: EuOutcome): TimelineRow[] {
  return o.countries.map((c) => ({ label: `${msName(c.code)}`, segments: c.segments, end: c.status === 'authorised' ? `first subject day ${c.firstPatientDay}` : c.status === 'refused' ? 'refused' : 'pending' }))
}

export function StartupTimeline({ rows, title = 'Start-up timeline: submission to first patient in' }: { rows: TimelineRow[]; title?: string }) {
  const max = Math.max(60, ...rows.flatMap((r) => r.segments.map((s) => s.to)))
  const ticks = Array.from({ length: Math.floor(max / 30) + 1 }, (_, i) => i * 30)
  return (
    <Card className="bg-lab-panel/80 border-lab-line gap-2">
      <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-text flex items-center gap-2"><Clock className="size-4 text-lab-cyan" />{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="space-y-0.5">
            <div className="flex justify-between text-[11px] font-mono"><span className="text-lab-text">{r.label}</span><span className="text-lab-text-muted">{r.end}</span></div>
            <div className="relative h-4 rounded bg-lab-panel-strong overflow-hidden">
              {r.segments.map((s, i) => <div key={i} title={`${s.label}: day ${s.from} to ${s.to}`} className={`absolute top-0 h-full ${SEG_COLOR[s.kind] ?? 'bg-lab-line'}`} style={{ left: `${(s.from / max) * 100}%`, width: `${Math.max(0.6, ((s.to - s.from) / max) * 100)}%` }} />)}
            </div>
          </div>
        ))}
        <div className="relative h-3 text-[9px] font-mono text-lab-text-muted">{ticks.map((t) => <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / max) * 100}%` }}>{t}</span>)}</div>
        <p className="text-[10px] text-lab-text-muted flex flex-wrap gap-x-3"><span><span className="inline-block size-2 bg-lab-cyan mr-1" />review</span><span><span className="inline-block size-2 bg-lab-gold mr-1" />questions</span><span><span className="inline-block size-2 bg-lab-red mr-1" />hold, refusal</span><span><span className="inline-block size-2 bg-lab-emerald mr-1" />decision and site activation</span><span>Days from submission; indicative.</span></p>
      </CardContent>
    </Card>
  )
}

// ------------------------------------------------------------------------------ builder
export function EuBuilder({ scenario, form, setForm, lockedCountries }: { scenario: Scenario; form: EuForm; setForm: (f: EuForm) => void; lockedCountries?: boolean }) {
  const set = <K extends keyof EuForm>(k: K, v: EuForm[K]) => setForm({ ...form, [k]: v })
  const toggleCountry = (code: string) => {
    const on = form.countries.includes(code)
    const countries = on ? form.countries.filter((x) => x !== code) : [...form.countries, code]
    setForm({ ...form, countries, rms: countries.includes(form.rms) ? form.rms : countries[0] ?? '' })
  }
  const toggle = (k: 'safety' | 'part2', id: string) => set(k, form[k].includes(id) ? form[k].filter((x) => x !== id) : [...form[k], id])
  return (
    <div className="space-y-3">
      <Section label="Member states concerned · CTR Article 5(1)" title="Countries and the reporting member state" ok={countriesReady(form)}>
        <p className="text-xs text-lab-text-muted">One application in CTIS covers every member state you choose. Each country decides on its own sites; you propose one country as the reporting member state (RMS), which leads the Part I assessment for all.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MEMBER_STATES.map((m) => <Button key={m.code} variant="outline" size="sm" disabled={lockedCountries} aria-pressed={form.countries.includes(m.code)} onClick={() => toggleCountry(m.code)} className={`border-2 font-mono text-xs ${sel(form.countries.includes(m.code))}`}>{m.name}</Button>)}
        </div>
        {form.countries.length > 0 && (
          <>
            <p className="text-xs text-lab-text-muted">Proposed reporting member state</p>
            <div className="flex flex-wrap gap-2">{form.countries.map((c) => <Button key={c} variant="outline" size="sm" onClick={() => set('rms', c)} className={`border-2 font-mono text-xs ${sel(form.rms === c)}`}>{msName(c)}</Button>)}</div>
          </>
        )}
      </Section>

      <Section label="Part I · CTR Annex I, B to J · assessed by all, led by the RMS" title="Part I: the scientific dossier" ok={part1Complete(form) && !!form.gmp}>
        <Input value={form.sponsor} onChange={(e) => set('sponsor', e.target.value)} placeholder="Sponsor name (fictional)" maxLength={60} className="bg-lab-panel-strong border-lab-line text-lab-text" />
        <p className="text-xs text-lab-text-muted">Cover letter, EU application form and protocol: drafted from your Phase I design ({scenario.drug}, {scenario.code}).</p>
        <p className="text-xs font-mono text-lab-text">Investigator’s brochure (Annex I, E)</p>
        {OPTS.ib.map((o) => <Choice key={o.id} on={form.ib === o.id} onClick={() => set('ib', o.id as EuForm['ib'])}>{o.label}</Choice>)}
        <p className="text-xs font-mono text-lab-text">IMPD (Annex I, G)</p>
        {OPTS.impd.map((o) => <Choice key={o.id} on={form.impd === o.id} onClick={() => set('impd', o.id as EuForm['impd'])}>{o.label}</Choice>)}
        <p className="text-xs font-mono text-lab-text">GMP compliance (Annex I, F)</p>
        {OPTS.gmp.map((o) => <Choice key={o.id} on={form.gmp === o.id} onClick={() => set('gmp', o.id as EuForm['gmp'])}>{o.label}</Choice>)}
        <p className="text-xs font-mono text-lab-text">Labelling (Annex VI)</p>
        {OPTS.label.map((o) => <Choice key={o.id} on={form.label === o.id} onClick={() => set('label', o.id as EuForm['label'])}>{o.label}</Choice>)}
        <p className="text-xs font-mono text-lab-text">Protocol safety measures for the first-in-human part</p>
        {SAFETY_OPTIONS.map((o) => <Choice key={o.id} on={form.safety.includes(o.id)} onClick={() => toggle('safety', o.id)}>{form.safety.includes(o.id) ? '☑ ' : '☐ '}{o.label}</Choice>)}
        <p className="text-xs font-mono text-lab-text">Is this a low-intervention clinical trial (CTR Article 2(2)(3))?</p>
        <div className="grid grid-cols-2 gap-2"><Choice on={form.lowIntervention === true} onClick={() => set('lowIntervention', true)}>Yes: lighter monitoring and insurance</Choice><Choice on={form.lowIntervention === false} onClick={() => set('lowIntervention', false)}>No</Choice></div>
      </Section>

      <Section label="Part II · CTR Annex I, K to R · assessed by each country with its ethics committee" title="Part II: national documents for each country" ok={part2Complete(form) && PART2_SIMPLE.every((x) => form.part2.includes(x))}>
        {PART2_DOCS.filter((d) => PART2_SIMPLE.includes(d.id)).map((d) => <Choice key={d.id} on={form.part2.includes(d.id)} onClick={() => toggle('part2', d.id)}>{form.part2.includes(d.id) ? '☑ ' : '☐ '}{d.title} <span className="text-[10px] font-mono text-lab-text-muted">({d.annex})</span></Choice>)}
        <p className="text-xs font-mono text-lab-text">Subject information and informed consent form (Annex I, L)</p>
        {OPTS.icf.map((o) => <Choice key={o.id} on={form.icf === o.id} onClick={() => set('icf', o.id as EuForm['icf'])}>{o.label}</Choice>)}
        <p className="text-xs font-mono text-lab-text">Proof of insurance or indemnity, per country (Annex I, O; Article 76)</p>
        {form.countries.map((c) => (
          <div key={c} className="grid sm:grid-cols-[8rem_1fr_1fr] gap-2 items-center">
            <span className="text-xs font-mono text-lab-text">{msName(c)}</span>
            {OPTS.insurance.map((o) => <Button key={o.id} variant="outline" size="sm" onClick={() => set('insurance', { ...form.insurance, [c]: o.id as 'national' | 'global' })} className={`h-auto whitespace-normal border-2 text-xs text-left justify-start ${sel(form.insurance[c] === o.id)}`}>{o.label}</Button>)}
          </div>
        ))}
        {!form.countries.length && <p className="text-xs text-lab-gold">Choose the countries first.</p>}
      </Section>

      <Section label="Transparency · CTIS rules revised in 2024" title="Trial category for publication" ok={!!form.category}>
        {CATEGORIES.map((o) => <Choice key={o.id} on={form.category === o.id} onClick={() => set('category', o.id as EuForm['category'])}>{o.label}</Choice>)}
        {form.category && (
          <ul className="text-xs text-lab-text-muted space-y-0.5"><li className="font-mono text-lab-text flex items-center gap-1"><Eye className="size-3" />What becomes public</li>{TRANSPARENCY[form.category].map((t) => <li key={t}>— {t}</li>)}</ul>
        )}
      </Section>
    </div>
  )
}

// ------------------------------------------------------------------------------ review
function FindingCard({ f, pick, setPick, disabled }: { f: EuFinding; pick?: string; setPick: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="rounded border-2 border-lab-gold/60 p-3 space-y-2">
      <p className="text-[10px] font-mono uppercase text-lab-gold">Reviewer question (simulated) · {f.part === 'validation' ? 'Validation' : f.part === 'I' ? 'Part I' : `Part II · ${msName(f.country!)}`} · {f.cite}</p>
      <p className="text-sm text-lab-text">{f.text}</p>
      {f.options.map((o) => <Choice key={o.id} on={pick === o.id} onClick={() => !disabled && setPick(o.id)}>{o.label}</Choice>)}
    </div>
  )
}

export function summariseEu(o: EuOutcome, f: EuForm, s: Scenario, original: Choices): EuSummary {
  const corrected = Object.keys(o.correctedChoices).filter((k) => o.correctedChoices[k] !== original[k])
  const ok = o.countries.filter((c) => c.status === 'authorised')
  return {
    countries: o.countries.map((c) => ({ code: c.code, name: msName(c.code), status: c.status, decisionDay: c.decisionDay, firstPatientDay: c.firstPatientDay })),
    rfis: o.rfiCount, refusals: o.refusals, lapsed: o.lapsed, category: f.category, categoryOk: f.category === '1', corrected,
    firstPatientDay: ok.length ? Math.min(...ok.map((c) => c.firstPatientDay)) : -1, rows: euRows(o),
  }
  void s
}

export default function EuStep({ scenario, choices, onBack, onDone, doneLabel = 'Run Phase I', initial, lockedCountries, extraRows = [] }: { scenario: Scenario; choices: Choices; onBack: () => void; onDone: (corrected: Choices, summary: EuSummary) => void; doneLabel?: string; initial?: Partial<EuForm>; lockedCountries?: boolean; extraRows?: TimelineRow[] }) {
  const [form, setForm] = useState<EuForm>({ ...EMPTY_EU, ...initial })
  const [phase, setPhase] = useState<'build' | 'review'>('build')
  const [ans, setAns] = useState<EuAnswers>(EMPTY_ANSWERS)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [watch, setWatch] = useState(false)
  const outcome = useMemo(() => (phase === 'review' ? runEu(scenario, choices, form, ans) : null), [phase, scenario, choices, form, ans])

  if (phase === 'build') return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-line"><CardContent className="pt-4 space-y-1">
        <p className="font-mono text-sm text-lab-cyan">EU clinical trial application: Regulation (EU) No 536/2014, through CTIS</p>
        <p className="text-xs text-lab-text-muted">Build one dossier for {scenario.drug} ({scenario.code}). Part I is assessed jointly and Part II by each country. The clock: validation in 10 days, assessment in 45 days, a decision within 5 days; questions add up to 46 days. Countries are real; sites, sponsor and medicine are fictional. CTIS itself is not reproduced.</p>
      </CardContent></Card>
      <EuBuilder scenario={scenario} form={form} setForm={setForm} lockedCountries={lockedCountries} />
      <div className="flex gap-2">
        <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
        <Button className="flex-1 bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90 font-mono gap-1.5" disabled={!canSubmitEu(form)} onClick={() => setPhase('review')}>Submit in CTIS <ArrowRight className="size-4" /></Button>
      </div>
      {!canSubmitEu(form) && <p className="text-xs text-lab-gold">Complete every section to submit. Gaps in content are allowed: the reviewers will find them.</p>}
    </div>
  )

  const o = outcome!
  const open: EuFinding[] = o.stage === 'validation' ? o.validation : o.stage === 'assessment' ? o.findings : []
  const answerAll = () => {
    if (o.stage === 'validation') setAns({ ...ans, validation: { ...ans.validation, ...draft } })
    else setAns({ ...ans, assessment: { ...ans.assessment, ...draft } })
    setDraft({})
  }
  const refused = o.countries.filter((c) => c.status === 'refused')
  const rows = [...extraRows, ...euRows(o)]
  return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-line gap-2">
        <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-text">CTIS review, day by day (simulated)</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {o.events.map((e, i) => (
            <p key={i} className={`text-xs ${e.kind === 'refusal' ? 'text-lab-red' : e.kind === 'request' ? 'text-lab-gold' : e.kind === 'ok' ? 'text-lab-emerald' : 'text-lab-text-muted'}`}><span className="font-mono inline-block w-16">Day {e.day}</span>{e.text}</p>
          ))}
        </CardContent>
      </Card>

      {open.length > 0 && (
        <Card className="bg-lab-panel/80 border-2 border-lab-gold gap-3">
          <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-gold flex items-center gap-2"><ShieldAlert className="size-4" />{o.stage === 'validation' ? 'Validation request: answer within 10 days' : 'Request for information: answer within 12 days'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {open.map((f) => <FindingCard key={f.id} f={f} pick={draft[f.id]} setPick={(v) => setDraft({ ...draft, [f.id]: v })} />)}
            <Button className="w-full font-mono" disabled={open.some((f) => !draft[f.id])} onClick={answerAll}>Send the answers</Button>
          </CardContent>
        </Card>
      )}

      {o.stage === 'lapsed' && (
        <Card className="bg-lab-panel/80 border-2 border-lab-red"><CardContent className="pt-4 space-y-2">
          <p className="text-sm text-lab-red">The application lapsed at validation. Submit a new application with the complete dossier.</p>
          <Button className="font-mono" onClick={() => setAns({ ...ans, resubmitAll: true })}>Submit a new, complete application</Button>
        </CardContent></Card>
      )}

      {o.stage === 'decided' && refused.length > 0 && !(o.partIAcceptable === false ? ans.resubmitAll : refused.every((c) => ans.resubmit.includes(c.code))) && (
        <Card className="bg-lab-panel/80 border-2 border-lab-red"><CardContent className="pt-4 space-y-2">
          <p className="text-sm text-lab-red">{o.partIAcceptable === false ? 'Part I was not acceptable, so every member state refused. Resubmit with the changes the reviewers asked for.' : `${refused.map((c) => msName(c.code)).join(', ')} refused on Part II; the other countries are authorised and can start. Resubmit in the refused countries with the national documents fixed.`}</p>
          <Button className="font-mono" onClick={() => setAns(o.partIAcceptable === false ? { ...ans, resubmitAll: true } : { ...ans, resubmit: refused.map((c) => c.code) })}>Resubmit</Button>
        </CardContent></Card>
      )}

      {o.stage === 'decided' && (
        <>
          <StartupTimeline rows={rows} />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className={`border-2 font-mono text-[11px] h-7 ${sel(watch)}`} onClick={() => setWatch(!watch)}>Watch: proposed EU clock</Button>
            {watch && <p className="text-xs text-lab-gold">{o.proposed.label}</p>}
          </div>
          <Card className="bg-lab-panel/80 border-lab-line"><CardContent className="pt-4 space-y-1">
            <p className="font-mono text-xs text-lab-text flex items-center gap-1"><Eye className="size-3" />Transparency: you chose category {form.category}{form.category === '1' ? ', correct for a phase I trial.' : '; a phase I trial is category 1.'}</p>
            {TRANSPARENCY['1'].map((t) => <p key={t} className="text-xs text-lab-text-muted">— {t}</p>)}
          </CardContent></Card>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5" onClick={() => download(`eu-cta-${scenario.code.toLowerCase()}-checklist.json`, JSON.stringify(euChecklist(scenario, form, { userId: userId(), classId: classId() }), null, 2))}><Download className="size-4" />EU dossier checklist</Button>
            <Button className="flex-1 bg-lab-emerald text-lab-bg hover:bg-lab-emerald/90 font-mono gap-1.5" disabled={!o.countries.some((c) => c.status === 'authorised')} onClick={() => onDone(o.correctedChoices, summariseEu(o, form, scenario, choices))}><ShieldCheck className="size-4" />{doneLabel}</Button>
          </div>
          {!o.countries.some((c) => c.status === 'authorised') && <p className="text-xs text-lab-red">No country has authorised the trial yet: resubmit first.</p>}
        </>
      )}
    </div>
  )
}
