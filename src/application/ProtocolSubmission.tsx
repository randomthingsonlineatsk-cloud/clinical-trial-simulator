import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, ShieldAlert, ShieldCheck, Upload } from 'lucide-react'
import { readBundle, routeFor, bundleIndPackage, type Bundle, type Region } from './protocolLink'
import { userId, classId } from './store'

const PB = 'https://randomthingsonlineatsk-cloud.github.io/protocol-builder/'
const DOSSIER = 'https://randomthingsonlineatsk-cloud.github.io/ectd-dossier-builder/'
const KEY = 'cts_protocol_bundle'
const load = (): Bundle | null => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Bundle) : null } catch { return null } }
const save = (b: Bundle | null) => { try { if (b) localStorage.setItem(KEY, JSON.stringify(b)); else localStorage.removeItem(KEY) } catch { /* storage unavailable */ } }
function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}
const sel = (on: boolean) => (on ? 'border-lab-cyan text-lab-cyan bg-lab-cyan-soft' : 'border-lab-line text-lab-text-muted')

// The trial application step for a protocol written in the Protocol Builder: open its bundle,
// pick a region, and see the route, where each document goes and what still stops the submission.
export default function ProtocolSubmission() {
  const [b, setB] = useState<Bundle | null>(load)
  const [region, setRegion] = useState<Region>('US')
  const [err, setErr] = useState('')
  const open = (f: File) => { const r = new FileReader(); r.onload = () => { try { const x = readBundle(String(r.result)); setB(x); save(x); setErr('') } catch (e) { setErr((e as Error).message) } }; r.readAsText(f) }
  const route = b ? routeFor(b, region) : null
  return (
    <div className="space-y-4">
      <Card className="bg-lab-panel/80 border-lab-line">
        <CardHeader className="pb-2"><CardTitle className="font-mono text-sm text-lab-text flex items-center gap-2"><FileText className="size-4 text-lab-cyan" />Submit a protocol written in the Protocol Builder</CardTitle>
          <CardDescription className="text-lab-text-muted">Export the application bundle from the <a className="underline text-lab-cyan" href={PB} target="_blank" rel="noreferrer">Protocol Builder</a> (Export tab) and open it here. You see the route in the US, the EU and India, where each part of the protocol goes, and what still stops the submission.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <label className="inline-flex items-center gap-2 border-2 border-lab-line rounded-md px-3 py-1.5 font-mono text-xs cursor-pointer text-lab-text"><Upload className="size-3.5" />Open an application bundle<input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) open(f) }} /></label>
          {err && <p className="text-sm text-lab-rose" role="alert">{err}</p>}
          {b && <div className="text-sm text-lab-text space-y-1">
            <p className="font-mono">{b.protocol.id} · version {b.protocol.version} ({b.protocol.status}) · {b.protocol.phase}{b.amendment ? ` · amendment ${b.amendment.identifier}` : ''}</p>
            <p className="text-lab-text-muted">{b.protocol.title}</p>
            <p className="text-xs text-lab-text-muted">Cross-walk coverage: {b.crosswalks.map((c) => `${c.name.split(',')[0]} ${c.pct}%`).join(' · ')} · consistency: {b.consistency.highOpen} high, {b.consistency.medium} medium · USDM: {b.usdm.errors} errors <button className="underline text-lab-cyan ml-2" onClick={() => { setB(null); save(null) }}>Close the bundle</button></p>
          </div>}
        </CardContent>
      </Card>
      {b && route && <>
        <div className="flex flex-wrap gap-2">{(['US', 'EU', 'IN'] as Region[]).map((r) => <Button key={r} variant="outline" aria-pressed={region === r} onClick={() => setRegion(r)} className={`border-2 font-mono text-xs ${sel(region === r)}`}>{r === 'US' ? 'United States (IND)' : r === 'EU' ? 'European Union (CTIS)' : 'India (CDSCO)'}</Button>)}</div>
        <Card className="bg-lab-panel/80 border-lab-line">
          <CardHeader className="pb-2"><CardDescription className="font-mono text-[10px] uppercase text-lab-text-muted">{route.basis}</CardDescription>
            <CardTitle className="font-mono text-sm flex items-center gap-2">{route.ready ? <ShieldCheck className="size-4 text-lab-emerald" /> : <ShieldAlert className="size-4 text-lab-gold" />}{route.title}: {route.ready ? 'ready to submit' : 'not ready yet'}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-lab-text">{route.route}</p>
            <ul className="space-y-1">{route.checks.map((c) => <li key={c.label} className="flex gap-2"><span className={c.ok ? 'text-lab-emerald' : 'text-lab-rose'}>{c.ok ? '✓' : '✗'}</span><span><b className="text-lab-text">{c.label}.</b> <span className="text-lab-text-muted">{c.detail}</span></span></li>)}</ul>
            <div>
              <p className="font-mono text-xs text-lab-text-muted mb-1">Where each part goes</p>
              <table className="w-full text-xs"><tbody>{route.places.map((x) => <tr key={x.what} className="border-t border-lab-line"><td className="py-1 pr-2 text-lab-text">{x.what}</td><td className="py-1 pr-2 font-mono text-lab-cyan">{x.where}</td><td className="py-1 text-lab-text-muted">{x.note ?? ''}</td></tr>)}</tbody></table>
            </div>
            {route.crosswalk && route.crosswalk.gaps.length > 0 && <div>
              <p className="font-mono text-xs text-lab-text-muted mb-1">Gaps against {route.crosswalk.name} (close them in the Protocol Builder)</p>
              <ul className="text-xs space-y-1">{route.crosswalk.gaps.map((g) => <li key={g.id}><span className="font-mono text-lab-gold">{g.id}</span> {g.text}. <span className="text-lab-text-muted">{g.hint}</span></li>)}</ul>
            </div>}
            {b.amendment && <div>
              <p className="font-mono text-xs text-lab-text-muted mb-1">Changes and your classification for this region</p>
              <ul className="text-xs space-y-1">{b.amendment.changes.map((c, i) => <li key={i}><span className="font-mono">{c.sections.join(', ')}</span> {c.description} <span className="text-lab-cyan">→ {c.classification[region]}</span></li>)}</ul>
              {b.amendment.coverNotes[region] && <details className="mt-2"><summary className="text-xs font-mono cursor-pointer text-lab-cyan">Cover note drafted by the Protocol Builder</summary><pre className="whitespace-pre-wrap text-xs text-lab-text mt-1">{b.amendment.coverNotes[region]}</pre></details>}
            </div>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5 text-xs" onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(b.documents.protocolHtml); w.document.close() } }}><FileText className="size-3.5" />Open the protocol</Button>
              {region === 'US' && <Button variant="outline" className="border-2 border-lab-line font-mono gap-1.5 text-xs" onClick={() => download(`ind-${b.protocol.id.toLowerCase()}-protocol-amendment-ectd-package.json`, JSON.stringify(bundleIndPackage(b, { userId: userId(), classId: classId() }), null, 2))}><Download className="size-3.5" />IND package for the eCTD Dossier Builder</Button>}
            </div>
            {region === 'US' && <p className="text-xs text-lab-text-muted">Import the package in the <a className="underline text-lab-cyan" href={DOSSIER} target="_blank" rel="noreferrer">eCTD Dossier Builder</a> (Sequences tab): it becomes an IND amendment sequence with the forms, the cover letter and the protocol in Module 5.</p>}
          </CardContent>
        </Card>
      </>}
    </div>
  )
}
