import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getScenario } from '../data/ct-scenarios'
import IndStep, { type IndSummary } from './IndStep'
import EuStep, { type EuSummary } from './EuStep'
import { IND_MISSIONS, type IndMission } from './missions'
import { loadMissionAttempts, saveMissionAttempt } from './store'

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
            : <Quiz m={active} onDone={finish} />}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-lab-text-muted">Practise the trial applications on their own. In Play, the same steps run before Phase I for the regions you choose.</p>
      {IND_MISSIONS.map((m, idx) => {
        const best = attempts.filter((a) => a.missionId === m.id).reduce((x, a) => Math.max(x, a.score), -1)
        return (
          <div key={m.id} className="space-y-2">
          {(idx === 0 || IND_MISSIONS[idx - 1].region !== m.region) && <p className="text-[10px] uppercase tracking-widest font-mono text-lab-text-muted pt-2">{m.region === 'US' ? 'United States: IND' : 'European Union: CTR and CTIS'}</p>}
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
    </div>
  )
}
