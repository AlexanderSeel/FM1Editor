import { useMemo, useState } from 'react'
import type { MidiMonitorEntry } from '../midi/monitor'
import {
  createEmptyDx7HardwareChecks,
  DX7_HARDWARE_EVIDENCE_SCHEMA,
  DX7_HARDWARE_VALIDATION_CHECKS,
  dx7OutstandingChecks,
  isSha256,
  serializeDx7HardwareEvidence,
  type Dx7HardwareEvidenceManifest,
  type Dx7HardwareIdentity,
} from '../validation/dx7HardwareEvidence'
import { summarizeHardwareMidiCapture, type HardwareCheckEvidence, type HardwareCheckStatus } from '../validation/hardwareEvidence'

interface Dx7HardwareEvidenceRecorderProps {
  entries: readonly MidiMonitorEntry[]
}

function asChannel(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 16 ? parsed : null
}

function saveManifest(manifest: Dx7HardwareEvidenceManifest): void {
  const blob = new Blob([serializeDx7HardwareEvidence(manifest)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `dx7-hardware-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function Dx7HardwareEvidenceRecorder({ entries }: Dx7HardwareEvidenceRecorderProps) {
  const midiCapture = useMemo(() => summarizeHardwareMidiCapture(entries), [entries])
  const [identity, setIdentity] = useState<Dx7HardwareIdentity>({
    tester: '',
    modelRevision: 'Yamaha DX7',
    hardwareIdentity: '',
    romVersion: '',
    editorCommit: '',
    windowsVersion: '',
    browserVersion: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    midiInterface: '',
    driverVersion: '',
    receiveChannel: null,
    systemInfoState: 'unknown',
    memoryProtectState: 'unknown',
    recoveryBankSha256: '',
  })
  const [checks, setChecks] = useState<Record<string, HardwareCheckEvidence>>(() => createEmptyDx7HardwareChecks())
  const [notes, setNotes] = useState('')
  const outstanding = dx7OutstandingChecks(checks)
  const recoveryHashOk = !identity.recoveryBankSha256.trim() || isSha256(identity.recoveryBankSha256)

  const updateIdentity = <K extends keyof Dx7HardwareIdentity>(key: K, value: Dx7HardwareIdentity[K]) => {
    setIdentity((current) => ({ ...current, [key]: value }))
  }
  const updateCheck = (id: string, patch: Partial<HardwareCheckEvidence>) => {
    setChecks((current) => ({ ...current, [id]: { status: 'pending', notes: '', ...current[id], ...patch } }))
  }

  const exportManifest = () => {
    if (!isSha256(identity.recoveryBankSha256)) {
      window.alert('Record the full 64-character SHA-256 of the verified DX7 recovery bank before exporting physical evidence.')
      return
    }
    saveManifest({
      schema: DX7_HARDWARE_EVIDENCE_SCHEMA,
      createdAt: new Date().toISOString(),
      identity,
      selectedMidiInputs: midiCapture.inputPorts,
      selectedMidiOutputs: midiCapture.outputPorts,
      midiCapture,
      checks,
      sessionNotes: notes,
      disclaimer: 'Stock DX7 physical evidence manifest only; result states are tester observations and are not software-derived hardware passes.',
    })
  }

  return (
    <details className="rounded-xl border border-violet-300/15 bg-violet-300/[0.025] p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.15em] text-violet-200">
        Stock DX7 hardware evidence session · {outstanding.length} pending
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-[11px] leading-5 text-slate-400">Use with <code>docs/validation/dx7-hardware-test-protocol.md</code>. Destructive bank tests require a verified recovery-bank SHA-256. Captured Yamaha frame lengths remain metadata only; PASS/FAIL is always entered from physical observation.</p>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] leading-4 text-slate-400">
          {midiCapture.messageCount} messages · SysEx IN {midiCapture.sysexInputCount} · SysEx OUT {midiCapture.sysexOutputCount} · standard bank OUT {midiCapture.yamahaBankOutputCount} · standard single voice OUT {midiCapture.yamahaSingleVoiceOutputCount}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] text-slate-400">Tester / initials<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.tester} onChange={(event) => updateIdentity('tester', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Model / revision<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.modelRevision} onChange={(event) => updateIdentity('modelRevision', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Sanitized hardware identity<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" placeholder="e.g. serial suffix" value={identity.hardwareIdentity} onChange={(event) => updateIdentity('hardwareIdentity', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">ROM / firmware identity<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.romVersion} onChange={(event) => updateIdentity('romVersion', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Editor commit SHA<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 font-mono text-[10px] text-white" value={identity.editorCommit} onChange={(event) => updateIdentity('editorCommit', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Windows edition / build<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.windowsVersion} onChange={(event) => updateIdentity('windowsVersion', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400 sm:col-span-2">Browser exact version / user agent<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-white" value={identity.browserVersion} onChange={(event) => updateIdentity('browserVersion', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">MIDI interface / cable<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.midiInterface} onChange={(event) => updateIdentity('midiInterface', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Interface driver<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.driverVersion} onChange={(event) => updateIdentity('driverVersion', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">DX7 receive channel 1–16<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" inputMode="numeric" value={identity.receiveChannel ?? ''} onChange={(event) => updateIdentity('receiveChannel', asChannel(event.target.value))} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">MIDI SYS INFO AVAIL<select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white" value={identity.systemInfoState} onChange={(event) => updateIdentity('systemInfoState', event.target.value as Dx7HardwareIdentity['systemInfoState'])}><option value="unknown">Unknown</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Memory Protect<select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white" value={identity.memoryProtectState} onChange={(event) => updateIdentity('memoryProtectState', event.target.value as Dx7HardwareIdentity['memoryProtectState'])}><option value="unknown">Unknown</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></label>
          <label className="grid gap-1 text-[10px] text-slate-400 sm:col-span-2">Recovery-bank SHA-256<input aria-invalid={!recoveryHashOk} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 font-mono text-[10px] text-white aria-[invalid=true]:border-rose-300/40" placeholder="64 hexadecimal characters" value={identity.recoveryBankSha256} onChange={(event) => updateIdentity('recoveryBankSha256', event.target.value.trim())} />{!recoveryHashOk && <span className="text-[10px] text-rose-300">Invalid SHA-256 length/format.</span>}</label>
        </div>

        {(['A', 'B', 'C', 'D', 'E'] as const).map((section) => (
          <details className="rounded-lg border border-white/10 bg-black/15 p-2" key={section}>
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">DX7 protocol {section}</summary>
            <div className="mt-2 grid gap-2">
              {DX7_HARDWARE_VALIDATION_CHECKS.filter((definition) => definition.section === section).map((definition) => {
                const evidence = checks[definition.id] ?? { status: 'pending' as const, notes: '' }
                return <div className="grid gap-1" key={definition.id}>
                  <span className="text-[10px] leading-4 text-slate-300">{definition.label}</span>
                  <div className="grid gap-1 sm:grid-cols-[105px_1fr]">
                    <select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[10px] text-white" value={evidence.status} onChange={(event) => updateCheck(definition.id, { status: event.target.value as HardwareCheckStatus })}><option value="pending">Pending</option><option value="pass">PASS</option><option value="fail">FAIL</option><option value="not-applicable">N/A</option></select>
                    <input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white" placeholder="Observation / error / recovery note" value={evidence.notes} onChange={(event) => updateCheck(definition.id, { notes: event.target.value })} />
                  </div>
                </div>
              })}
            </div>
          </details>
        ))}

        <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" placeholder="Front-panel timeline / failure / recovery notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-violet-200 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40" disabled={!isSha256(identity.recoveryBankSha256)} onClick={exportManifest} type="button">Export DX7 evidence manifest</button>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300" onClick={() => { setChecks(createEmptyDx7HardwareChecks()); setNotes('') }} type="button">Reset observations</button>
        </div>
      </div>
    </details>
  )
}
