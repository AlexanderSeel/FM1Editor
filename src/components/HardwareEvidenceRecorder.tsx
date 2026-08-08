import { useMemo, useState } from 'react'
import type { DeviceTarget } from '../domain/deviceTarget'
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

interface HardwareEvidenceRecorderProps {
  entries: readonly MidiMonitorEntry[]
}

function asNumber(value: string, min: number, max = Number.POSITIVE_INFINITY): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null
}

function browserEnvironment() {
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

function saveManifest(manifest: HardwareEvidenceManifest): void {
  const blob = new Blob([serializeHardwareEvidence(manifest)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-hardware-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function HardwareEvidenceRecorder({ entries }: HardwareEvidenceRecorderProps) {
  const browser = useMemo(browserEnvironment, [])
  const midiCapture = useMemo(() => summarizeHardwareMidiCapture(entries), [entries])
  const [target, setTarget] = useState<DeviceTarget>('fm1')
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
  const [notes, setNotes] = useState('')

  const setIdentityValue = <K extends keyof HardwareTestIdentity>(key: K, value: HardwareTestIdentity[K]) => {
    setIdentity((current) => ({ ...current, [key]: value }))
  }
  const setAudioValue = <K extends keyof HardwareAudioMeasurements>(key: K, value: HardwareAudioMeasurements[K]) => {
    setAudio((current) => ({ ...current, [key]: value }))
  }
  const setCheck = (id: string, patch: Partial<HardwareCheckEvidence>) => {
    setChecks((current) => ({ ...current, [id]: { status: 'pending', notes: '', ...current[id], ...patch } }))
  }
  const outstanding = hardwareEvidenceOutstandingChecks(checks)

  const exportManifest = () => {
    const sysexObserved = midiCapture.sysexInputCount + midiCapture.sysexOutputCount > 0
    saveManifest({
      schema: HARDWARE_EVIDENCE_SCHEMA,
      createdAt: new Date().toISOString(),
      target,
      midiPermission: entries.length > 0 ? 'traffic-captured; permission state not independently recorded' : 'not recorded',
      sysexEnabled: sysexObserved,
      selectedMidiInput: midiCapture.inputPorts.join(' | ') || null,
      selectedMidiOutput: midiCapture.outputPorts.join(' | ') || null,
      identity,
      audio,
      browser,
      midiCapture,
      checks,
      sessionNotes: notes,
      disclaimer: 'Physical evidence manifest only; check statuses are tester observations and are not software-derived hardware passes.',
    })
  }

  return (
    <details className="rounded-xl border border-amber-300/15 bg-amber-300/[0.025] p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.15em] text-amber-200">
        Hardware evidence session · {outstanding.length} pending
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-[11px] leading-5 text-slate-400">Use this beside the raw MIDI export during the physical protocol. Auto-detected traffic is evidence metadata only; every PASS/FAIL remains a tester observation.</p>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] leading-4 text-slate-400">
          {midiCapture.messageCount} messages · SysEx IN {midiCapture.sysexInputCount} · SysEx OUT {midiCapture.sysexOutputCount} · 4,104-byte Yamaha bank OUT {midiCapture.yamahaBankOutputCount} · 163-byte voice OUT {midiCapture.yamahaSingleVoiceOutputCount}<br />
          secure context {browser.secureContext ? 'yes' : 'no'} · {browser.origin || 'origin unavailable'}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] text-slate-400">Target<select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white" value={target} onChange={(event) => setTarget(event.target.value as DeviceTarget)}><option value="fm1">FM-1</option><option value="dx7">DX7</option></select></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Tester / initials<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.tester} onChange={(event) => setIdentityValue('tester', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Firmware version<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.firmwareVersion} onChange={(event) => setIdentityValue('firmwareVersion', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Editor commit SHA<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 font-mono text-[10px] text-white" value={identity.editorCommit} onChange={(event) => setIdentityValue('editorCommit', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Windows edition / build<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.windowsVersion} onChange={(event) => setIdentityValue('windowsVersion', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Driver version<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.driverVersion} onChange={(event) => setIdentityValue('driverVersion', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">USB cable / hub topology<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.usbTopology} onChange={(event) => setIdentityValue('usbTopology', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Audio-input label<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" value={identity.audioInputLabel} onChange={(event) => setIdentityValue('audioInputLabel', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">MIDI channel 1–16<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" inputMode="numeric" value={identity.midiChannel ?? ''} onChange={(event) => setIdentityValue('midiChannel', asNumber(event.target.value, 1, 16))} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Destination bank<select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white" value={identity.destinationBank} onChange={(event) => setIdentityValue('destinationBank', event.target.value as HardwareDestinationBank)}><option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Target slot 1–32<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" inputMode="numeric" value={identity.targetSlot ?? ''} onChange={(event) => setIdentityValue('targetSlot', asNumber(event.target.value, 1, 32))} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Sample rate Hz<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" inputMode="numeric" value={audio.sampleRateHz ?? ''} onChange={(event) => setAudioValue('sampleRateHz', asNumber(event.target.value, 1))} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">WAV bit depth<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" inputMode="numeric" value={audio.savedWavBitDepth ?? ''} onChange={(event) => setAudioValue('savedWavBitDepth', asNumber(event.target.value, 1, 64))} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Browser channel count<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" inputMode="numeric" value={audio.browserChannelCount ?? ''} onChange={(event) => setAudioValue('browserChannelCount', asNumber(event.target.value, 1, 32))} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Channel layout<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" placeholder="mono / dual-mono / stereo" value={audio.channelLayout} onChange={(event) => setAudioValue('channelLayout', event.target.value)} /></label>
          <label className="grid gap-1 text-[10px] text-slate-400">MASTER affects USB<select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white" value={audio.masterAffectsUsbLevel} onChange={(event) => setAudioValue('masterAffectsUsbLevel', event.target.value as HardwareAudioMeasurements['masterAffectsUsbLevel'])}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label className="grid gap-1 text-[10px] text-slate-400">Approx. latency ms<input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" inputMode="decimal" value={audio.approximateLatencyMs ?? ''} onChange={(event) => setAudioValue('approximateLatencyMs', asNumber(event.target.value, 0))} /></label>
        </div>

        {(['A', 'B', 'C', 'D', 'E'] as const).map((section) => (
          <details className="rounded-lg border border-white/10 bg-black/15 p-2" key={section}>
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">Protocol {section}</summary>
            <div className="mt-2 grid gap-2">
              {HARDWARE_VALIDATION_CHECKS.filter((definition) => definition.section === section).map((definition) => {
                const evidence = checks[definition.id] ?? { status: 'pending' as const, notes: '' }
                return <div className="grid gap-1" key={definition.id}>
                  <span className="text-[10px] leading-4 text-slate-300">{definition.label}</span>
                  <div className="grid gap-1 sm:grid-cols-[105px_1fr]">
                    <select className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[10px] text-white" value={evidence.status} onChange={(event) => setCheck(definition.id, { status: event.target.value as HardwareCheckStatus })}><option value="pending">Pending</option><option value="pass">PASS</option><option value="fail">FAIL</option><option value="not-applicable">N/A</option></select>
                    <input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white" placeholder="Observation / failure / recovery note" value={evidence.notes} onChange={(event) => setCheck(definition.id, { notes: event.target.value })} />
                  </div>
                </div>
              })}
            </div>
          </details>
        ))}

        <textarea className="min-h-20 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" placeholder="Session notes / screen-state timeline summary" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-black text-slate-950" onClick={exportManifest} type="button">Export evidence manifest</button>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300" onClick={() => { setChecks(createEmptyHardwareChecks()); setNotes('') }} type="button">Reset observations</button>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">The existing MIDI monitor export remains the raw capture. This manifest stores summary counts and observations only—no copied SysEx payload or audio samples.</p>
      </div>
    </details>
  )
}
