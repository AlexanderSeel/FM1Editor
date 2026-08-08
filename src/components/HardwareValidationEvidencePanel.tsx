import { useMemo, useState } from 'react'
import type { DeviceTarget } from '../domain/deviceTarget'
import type { MidiState } from '../hooks/useMidi'
import type { MidiMonitorEntry } from '../midi/monitor'
import {
  HARDWARE_EVIDENCE_SCHEMA,
  HARDWARE_VALIDATION_CHECKS,
  createEmptyHardwareChecks,
  hardwareEvidenceOutstandingChecks,
  serializeHardwareEvidence,
  summarizeHardwareMidiCapture,
  type HardwareAudioMeasurements,
  type HardwareCheckEvidence,
  type HardwareCheckStatus,
  type HardwareDestinationBank,
  type HardwareEvidenceManifest,
  type HardwareTestIdentity,
} from '../validation/hardwareEvidence'

interface HardwareValidationEvidencePanelProps {
  target: DeviceTarget
  midiState: MidiState
  entries: readonly MidiMonitorEntry[]
}

function numeric(value: string, minimum = 0, maximum = Number.POSITIVE_INFINITY): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null
}

function downloadManifest(manifest: HardwareEvidenceManifest): void {
  const blob = new Blob([serializeHardwareEvidence(manifest)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-hardware-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function browserDefaults() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { origin: '', secureContext: false, userAgent: '', platform: '', language: '' }
  }
  return {
    origin: window.location.origin,
    secureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  }
}

export function HardwareValidationEvidencePanel({ target, midiState, entries }: HardwareValidationEvidencePanelProps) {
  const browser = useMemo(browserDefaults, [])
  const [identity, setIdentity] = useState<HardwareTestIdentity>({
    tester: '',
    firmwareVersion: '',
    editorCommit: '',
    windowsVersion: '',
    browserVersion: browser.userAgent,
    driverVersion: '',
    usbTopology: '',
    audioInputLabel: '',
    midiChannel: null,
    destinationBank: '',
    targetSlot: null,
  })
  const [audio, setAudio] = useState<HardwareAudioMeasurements>({
    sampleRateHz: null,
    savedWavBitDepth: null,
    browserChannelCount: null,
    channelLayout: '',
    masterAffectsUsbLevel: 'unknown',
    approximateLatencyMs: null,
  })
  const [checks, setChecks] = useState<Record<string, HardwareCheckEvidence>>(() => createEmptyHardwareChecks())
  const [sessionNotes, setSessionNotes] = useState('')

  const midiCapture = useMemo(() => summarizeHardwareMidiCapture(entries), [entries])
  const selectedInput = midiState.inputs.find((port) => port.id === midiState.selectedInputId)?.name ?? null
  const selectedOutput = midiState.outputs.find((port) => port.id === midiState.selectedOutputId)?.name ?? null
  const outstanding = hardwareEvidenceOutstandingChecks(checks)

  const updateIdentity = <K extends keyof HardwareTestIdentity>(key: K, value: HardwareTestIdentity[K]) => {
    setIdentity((current) => ({ ...current, [key]: value }))
  }
  const updateAudio = <K extends keyof HardwareAudioMeasurements>(key: K, value: HardwareAudioMeasurements[K]) => {
    setAudio((current) => ({ ...current, [key]: value }))
  }
  const updateCheck = (id: string, patch: Partial<HardwareCheckEvidence>) => {
    setChecks((current) => ({
      ...current,
      [id]: { status: 'pending', notes: '', ...current[id], ...patch },
    }))
  }

  const exportEvidence = () => {
    const manifest: HardwareEvidenceManifest = {
      schema: HARDWARE_EVIDENCE_SCHEMA,
      createdAt: new Date().toISOString(),
      target,
      midiPermission: midiState.permission,
      sysexEnabled: midiState.sysexEnabled,
      selectedMidiInput: selectedInput,
      selectedMidiOutput: selectedOutput,
      identity,
      audio,
      browser,
      midiCapture,
      checks,
      sessionNotes,
      disclaimer: 'Physical evidence manifest only; check statuses are tester observations and are not software-derived hardware passes.',
    }
    downloadManifest(manifest)
  }

  return (
    <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.025] p-4" aria-label="Physical hardware validation evidence">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Physical validation evidence</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Record one hardware session and export a sanitized manifest. MIDI counts are derived from the current monitor; physical PASS/FAIL values always come from the tester.</p>
        </div>
        <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">{outstanding.length} checks pending</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">Tester / initials<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={identity.tester} onChange={(event) => updateIdentity('tester', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">FM-1 firmware<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={identity.firmwareVersion} onChange={(event) => updateIdentity('firmwareVersion', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">FM1 Editor commit SHA<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white" value={identity.editorCommit} onChange={(event) => updateIdentity('editorCommit', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Windows edition / build<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={identity.windowsVersion} onChange={(event) => updateIdentity('windowsVersion', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400 sm:col-span-2">Browser exact version / user agent<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white" value={identity.browserVersion} onChange={(event) => updateIdentity('browserVersion', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">USB/MIDI driver<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={identity.driverVersion} onChange={(event) => updateIdentity('driverVersion', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">USB cable / hub topology<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={identity.usbTopology} onChange={(event) => updateIdentity('usbTopology', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Browser audio-input label<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={identity.audioInputLabel} onChange={(event) => updateIdentity('audioInputLabel', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">MIDI channel (1–16)<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" inputMode="numeric" value={identity.midiChannel ?? ''} onChange={(event) => updateIdentity('midiChannel', numeric(event.target.value, 1, 16))} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Destination bank<select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" value={identity.destinationBank} onChange={(event) => updateIdentity('destinationBank', event.target.value as HardwareDestinationBank)}><option value="">Not selected</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></label>
        <label className="grid gap-1 text-xs text-slate-400">Target slot / preset<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" inputMode="numeric" value={identity.targetSlot ?? ''} onChange={(event) => updateIdentity('targetSlot', numeric(event.target.value, 1, 32))} /></label>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
        <p className="font-bold uppercase tracking-[0.12em] text-slate-300">Current MIDI capture summary</p>
        <p className="mt-2">{midiCapture.messageCount} messages · {midiCapture.sysexInputCount} SysEx IN · {midiCapture.sysexOutputCount} SysEx OUT · {midiCapture.yamahaBankOutputCount} standard 4,104-byte bank sends · {midiCapture.yamahaSingleVoiceOutputCount} standard 163-byte single-voice sends</p>
        <p className="mt-1 break-words text-[10px] text-slate-500">Input: {selectedInput ?? 'none'} · Output: {selectedOutput ?? 'none'} · SysEx permission: {midiState.sysexEnabled ? 'yes' : 'no'} · secure context: {browser.secureContext ? 'yes' : 'no'} · {browser.origin || 'origin unavailable'}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-xs text-slate-400">Sample rate Hz<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" inputMode="numeric" value={audio.sampleRateHz ?? ''} onChange={(event) => updateAudio('sampleRateHz', numeric(event.target.value, 1))} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Saved WAV bit depth<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" inputMode="numeric" value={audio.savedWavBitDepth ?? ''} onChange={(event) => updateAudio('savedWavBitDepth', numeric(event.target.value, 1, 64))} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Browser channel count<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" inputMode="numeric" value={audio.browserChannelCount ?? ''} onChange={(event) => updateAudio('browserChannelCount', numeric(event.target.value, 1, 32))} /></label>
        <label className="grid gap-1 text-xs text-slate-400">Channel layout<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" placeholder="mono / dual-mono / stereo" value={audio.channelLayout} onChange={(event) => updateAudio('channelLayout', event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-slate-400">MASTER affects USB level<select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" value={audio.masterAffectsUsbLevel} onChange={(event) => updateAudio('masterAffectsUsbLevel', event.target.value as HardwareAudioMeasurements['masterAffectsUsbLevel'])}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label className="grid gap-1 text-xs text-slate-400">Approx. latency ms<input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" inputMode="decimal" value={audio.approximateLatencyMs ?? ''} onChange={(event) => updateAudio('approximateLatencyMs', numeric(event.target.value, 0))} /></label>
      </div>

      <div className="mt-4 grid gap-2">
        {(['A', 'B', 'C', 'D', 'E'] as const).map((section) => (
          <details className="rounded-xl border border-white/10 bg-black/15 p-3" key={section}>
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Protocol section {section}</summary>
            <div className="mt-3 grid gap-3">
              {HARDWARE_VALIDATION_CHECKS.filter((definition) => definition.section === section).map((definition) => {
                const evidence = checks[definition.id] ?? { status: 'pending' as const, notes: '' }
                return (
                  <div className="grid gap-2 rounded-lg border border-white/5 p-2 sm:grid-cols-[minmax(0,1fr)_150px]" key={definition.id}>
                    <label className="grid gap-1 text-xs text-slate-300">{definition.label}<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" placeholder="Observation / failure / recovery note" value={evidence.notes} onChange={(event) => updateCheck(definition.id, { notes: event.target.value })} /></label>
                    <label className="grid gap-1 text-[10px] uppercase tracking-[0.1em] text-slate-500">Result<select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs normal-case tracking-normal text-white" value={evidence.status} onChange={(event) => updateCheck(definition.id, { status: event.target.value as HardwareCheckStatus })}><option value="pending">Pending</option><option value="pass">PASS</option><option value="fail">FAIL</option><option value="not-applicable">N/A</option></select></label>
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>

      <label className="mt-4 grid gap-1 text-xs text-slate-400">Session notes<textarea className="min-h-24 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} /></label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-black text-slate-950" onClick={exportEvidence} type="button">Export evidence manifest</button>
        <button className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-200" onClick={() => { setChecks(createEmptyHardwareChecks()); setSessionNotes('') }} type="button">Reset observations</button>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-500">Export the raw MIDI monitor JSON separately when captures are required. This manifest contains summary counts and observations, not copied raw SysEx bytes or audio.</p>
    </section>
  )
}
