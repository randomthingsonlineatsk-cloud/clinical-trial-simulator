import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getScenario } from '../data/ct-scenarios'
import IndStep, { type IndSummary } from './IndStep'
import EuStep, { type EuSummary } from './EuStep'
import IndiaStep, { type IndiaSummary } from './IndiaStep'
import RegionsStep, { type RegionsResult } from './RegionsStep'
import { Input } from '@/components/ui/input'
import { userId } from './store'
import { IND_MISSIONS, type IndMission } from './missions'
import { loadMissionAttempts, saveMissionAttempt } from './store'
import { SAFETY_RULES } from './amend'

function Quiz({ m, onDone }: { m: IndMission; onDone: (score: number, detail: string) => void }) {
  const items = m.items!
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [shown, setShown] = useState(false)
  const t = items[i]
  const correct = items.filter((x) => picks[x.id] === x.answer).length
  return (
    <Card className="bg-lab-panel/80 border-lab-line gap-3">
      <CardHeader className="pb-0"><CardTitle className="text-sm text-lab-text">{i + 1} of {items.length}. {t.prompt}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {t.options.map((o) => (
          <Button key={o} variant="outline" disabled={shown} onClick={() => { setPicks({ ...picks, [t.id]: o }); setShown(true) }} className={`w-full h-auto justify-start text-left whitespace-normal border-2 py-2 text-sm font-mono ${shown && o === t.answer ? 'border-lab-emerald text-lab-emerald' : shown && picks[t.id] === o ? 'border-lab-red text-lab-red' : 'border-lab-line text-lab-text-muted'}`}>{o}</Button>
        ))}
        {shown && <p className="text-xs text-lab-text-muted">{picks[t.id] === t.answer ? '✓ ' : '✗ '}{t.explain}</p>}
        {shown && (i < items.length - 1
          ? <Button className="w-full font-mono" onClick={() => { setI(i + 1); setShown(false) }}>Next</Button>
          : <Button className="w-full font-mono" onClick={() => onDone(Math.round((correct / items.length) * 100), `${correct} of ${items.length} correct`)}>Finish</Button>)}
      </CardContent>
    </Card>
  )
}

export default function IndMissions() {
  const [active, setActive] = useState<IndMission | null>(null)
  const [result, setResult] = useState<{ score: number; detail: string } | null>(null)
  const [start, setStart] = useState(0)
  const attempts = loadMissionAttempts()

  function finish(score: number, detail: string) {
    saveMissionAttempt({ missionId: active!.id, score, detail, seconds: Math.round((Date.now() - start) / 1000) })
    setResult({ score, detail })
  }

  if (active && result) {
    return (
      <div className="space-y-3">
        <Card className="bg-lab-panel/80 border-2 border-lab-emerald glow-emerald"><CardContent className="pt-4"><p className="font-mono text-lg text-lab-emerald">{result.score}%</p><p className="text-sm text-lab-text">{active.title}: {result.detail}</p></CardContent></Card>
        <Button className="font-mono" onClick={() => { setActive(null); setResult(null) }}>Back to the missions</Button>
      </div>
    )
  }
  if (active) {
    const scenario = active.scenarioId ? getScenario(active.scenarioId) : undefined
    return (
      <div className="space-y-3">
        <Card className="bg-lab-panel/80 border-lab-line"><CardContent className="pt-4"><p className="font-mono text-sm text-lab-cyan">{active.title}</p><p className="text-sm text-lab-text-muted">{active.brief}</p></CardContent></Card>
        {active.kind === 'ind' && scenario
          ? <IndStep scenario={scenario} choices={active.design!} doneLabel="Finish and score" onBack={() => setActive(null)} onDone={(_c, s: IndSummary) => finish(active.score!(s), s.holdCycles ? `study may proceed on day ${s.proceedDay} after ${s.holdCycles} hold cycle${s.holdCycles > 1 ? 's' : ''}` : `study may proceed on day ${s.proceedDay}, ${s.requests} information request${s.requests === 1 ? '' : 's'}`)} />
          : active.kind === 'eu' && scenario
            ? <EuStep scenario={scenario} choices={active.design!} initial={active.euInitial} lockedCountries doneLabel="Finish and score" onBack={() => setActive(null)} onDone={(_c, s: EuSummary) => finish(active.euScore!(s), `${s.countries.filter((c) => c.status === 'authorised').length} of ${s.countries.length} countries authorised; first subject on day ${s.firstPatientDay}; ${s.rfis} question${s.rfis === 1 ? '' : 's'}, ${s.refusals} refusal${s.refusals === 1 ? '' : 's'}`)} />
            : active.kind === 'india' && scenario
              ? <IndiaStep scenario={scenario} choices={active.design!} doneLabel="Finish and score" onBack={() => setActive(null)} onDone={(_c, s: IndiaSummary) => finish(active.inScore!(s), `first participant on day ${s.firstPatientDay}; ${s.queries} quer${s.queries === 1 ? 'y' : 'ies'}${s.rejected ? '; rejected once' : ''}`)} />
              : active.kind === 'regions' && scenario
                ? <RegionsStep scenario={scenario} choices={active.design!} fixed={['UK', 'CA', 'AU', 'JP', 'CN']} doneLabel="Finish and score" onBack={() => setActive(null)} onDone={(_c, r: RegionsResult) => finish(active.regionsScore!(r), r.summaries.map((x) => `${x.name} ${x.firstPatientDay > 0 ? `day ${x.firstPatientDay}` : 'not started'}`).join('; '))} />
                : <Quiz m={active} onDone={finish} />}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-lab-text-muted">Practise the trial applications on their own. In Play, the same steps run before Phase I for the regions you choose.</p>
      <details className="rounded border border-lab-line bg-lab-panel/80 p-3">
        <summary className="cursor-pointer font-mono text-xs text-lab-text-muted">Safety reporting deadlines: US, EU and India</summary>
        <table className="mt-2 w-full text-xs"><tbody>
          {SAFETY_RULES.map((r, i) => <tr key={i} className="border-t border-lab-line"><td className="py-1 pr-2 font-mono text-lab-cyan align-top">{r.region}</td><td className="py-1 pr-2 text-lab-text">{r.what}</td><td className="py-1 pr-2 font-mono text-lab-text whitespace-nowrap align-top">{r.deadline}</td><td className="py-1 text-lab-text-muted align-top">{r.cite}</td></tr>)}
        </tbody></table>
      </details>
      {IND_MISSIONS.map((m, idx) => {
        const best = attempts.filter((a) => a.missionId === m.id).reduce((x, a) => Math.max(x, a.score), -1)
        return (
          <div key={m.id} className="space-y-2">
          {(idx === 0 || IND_MISSIONS[idx - 1].region !== m.region) && <p className="text-[10px] uppercase tracking-widest font-mono text-lab-text-muted pt-2">{({ US: 'United States: IND', EU: 'European Union: CTR and CTIS', IN: 'India: NDCT Rules, 2019', MORE: 'UK, Canada, Australia, Japan and China', ALL: 'All regions: changes and safety' } as Record<string, string>)[m.region]}</p>}
          <Card className="bg-lab-panel/80 border-lab-line gap-2 py-4">
            <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-text">{m.title}{best >= 0 && <span className="text-lab-emerald font-normal"> · best {best}%</span>}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-lab-text-muted">{m.brief}</p>
              <Button size="sm" className="font-mono bg-lab-cyan text-lab-bg hover:bg-lab-cyan/90" onClick={() => { setActive(m); setStart(Date.now()) }}>Start mission</Button>
            </CardContent>
          </Card>
          </div>
        )
      })}
      <Certificate attempts={attempts} />
    </div>
  )
}

const PASS = 70, NEEDED = 10
export function certCode(user: string, name: string, date: string, passed: string[]): string {
  let h = 0x811c9dc5
  for (const ch of [user, name.trim().toLowerCase(), date, ...passed].join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0 }
  const hex = h.toString(16).toUpperCase().padStart(8, '0')
  return `CTS-${hex.slice(0, 4)}-${hex.slice(4)}`
}
function Certificate({ attempts }: { attempts: { missionId: string; score: number }[] }) {
  const [name, setName] = useState('')
  const best: Record<string, number> = {}
  for (const a of attempts) best[a.missionId] = Math.max(best[a.missionId] ?? 0, a.score)
  const passed = Object.keys(best).filter((k) => best[k] >= PASS).sort()
  const ok = passed.length >= NEEDED
  const date = new Date().toISOString().slice(0, 10)
  return (
    <Card className="bg-lab-panel/80 border-lab-line gap-2 py-4">
      <CardHeader className="pb-0"><CardTitle className="font-mono text-sm text-lab-text">Certificate</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-lab-text-muted">Pass {NEEDED} of the {IND_MISSIONS.length} application missions with {PASS}% or more. Passed so far: {passed.length}.</p>
        {ok && <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name as it should appear" className="bg-lab-panel-strong border-lab-line text-lab-text font-mono max-w-sm" />}
        {ok && name.trim() && (
          <div className="rounded border-4 border-double border-lab-emerald p-6 text-center space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-lab-text-muted">Certificate of completion · training only</p>
            <p className="text-xl text-lab-text">{name.trim()}</p>
            <p className="text-sm text-lab-text">has completed {passed.length} clinical trial application missions across the US, the EU, India, the UK, Canada, Australia, Japan and China.</p>
            <p className="font-mono text-xs text-lab-text-muted">{date} · Verification code {certCode(userId(), name, date, passed)}</p>
            <p className="text-[10px] text-lab-text-muted">Educational simulation with fictional medicines; not a professional qualification. Built by Khan Gulrez Shagufa Fazal Ahmed.</p>
          </div>
        )}
        {ok && name.trim() && <Button variant="outline" className="border-2 font-mono" onClick={() => window.print()}>Print or save as PDF</Button>}
      </CardContent>
    </Card>
  )
}
