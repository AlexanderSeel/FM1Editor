import type { DeviceTarget } from '../domain/deviceTarget'
import type { MidiMonitorEntry } from '../midi/monitor'

export const HARDWARE_EVIDENCE_SCHEMA = 'fm1-editor.hardware-validation-evidence.v1' as const

export type HardwareCheckStatus = 'pending' | 'pass' | 'fail' | 'not-applicable'
export type HardwareDestinationBank = 'A' | 'B' | 'C' | 'D' | ''

export interface HardwareValidationCheckDefinition {
  readonly id: string
  readonly section: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  readonly label: string
}

export const HARDWARE_VALIDATION_CHECKS: readonly HardwareValidationCheckDefinition[] = Object.freeze([
  { id: 'audio-windows-meter', section: 'A', label: 'Windows input meter moves while the FM-1 sounds' },
  { id: 'audio-browser-meter', section: 'A', label: 'Browser meter moves on the selected FM-1 audio endpoint' },
  { id: 'audio-saved-wav', section: 'A', label: 'Saved WAV contains audible FM-1 synthesizer output' },
  { id: 'browser-chrome-resilience', section: 'B', label: 'Chrome permission/reconnect/removal/concurrent-MIDI matrix completed' },
  { id: 'browser-edge-resilience', section: 'B', label: 'Edge permission/reconnect/removal/concurrent-MIDI matrix completed' },
  { id: 'browser-note-off-recovery', section: 'B', label: 'Note-off/Panic recovery verified after interruption or held-note scenario' },
  { id: 'browser-channel-selection', section: 'B', label: 'Explicit MIDI channel selection verified against physical FM-1 response' },
  { id: 'bank-destination-prompt', section: 'C', label: 'Merged 32-voice send opens the A/B/C/D destination prompt' },
  { id: 'bank-edited-slot', section: 'C', label: 'Edited target slot is playable and contains the expected edit' },
  { id: 'bank-untouched-voices', section: 'C', label: 'All 31 untouched voices remain correct' },
  { id: 'bank-slot-mapping', section: 'C', label: 'App slot-to-preset mapping matches the physical FM-1' },
  { id: 'bank-power-cycle', section: 'C', label: 'Transferred bank survives a power cycle' },
  { id: 'bank-recovery', section: 'C', label: 'Interrupted-transfer recovery is understood and reproducible' },
  { id: 'dump-device-originated', section: 'D', label: 'Device-originated complete bank dump semantics determined' },
  { id: 'dump-completion-signal', section: 'D', label: 'Bank acknowledgement/completion/error response semantics determined' },
  { id: 'live-parameter-framing', section: 'E', label: 'FM-1 live voice-parameter framing and semantic map verified' },
  { id: 'performance-controls', section: 'E', label: 'FM-1 performance-control MIDI semantics verified' },
  { id: 'sequencer-protocol', section: 'F', label: 'FM-1 sequencer pattern dump/restore framing and round-trip semantics determined' },
])

export interface HardwareCheckEvidence {
  readonly status: HardwareCheckStatus
  readonly notes: string
}

export interface HardwareTestIdentity {
  readonly tester: string
  readonly firmwareVersion: string
  readonly editorCommit: string
  readonly windowsVersion: string
  readonly browserVersion: string
  readonly driverVersion: string
  readonly usbTopology: string
  readonly audioInputLabel: string
  readonly midiChannel: number | null
  readonly destinationBank: HardwareDestinationBank
  readonly targetSlot: number | null
}

export interface HardwareAudioMeasurements {
  readonly sampleRateHz: number | null
  readonly savedWavBitDepth: number | null
  readonly browserChannelCount: number | null
  readonly channelLayout: string
  readonly masterAffectsUsbLevel: 'unknown' | 'yes' | 'no'
  readonly approximateLatencyMs: number | null
}

export interface HardwareBrowserEnvironment {
  readonly origin: string
  readonly secureContext: boolean
  readonly userAgent: string
  readonly platform: string
  readonly language: string
}

export interface HardwareMidiCaptureSummary {
  readonly messageCount: number
  readonly inputCount: number
  readonly outputCount: number
  readonly sysexInputCount: number
  readonly sysexOutputCount: number
  readonly yamahaBankOutputCount: number
  readonly yamahaSingleVoiceOutputCount: number
  readonly sysexInputLengths: Readonly<Record<string, number>>
  readonly sysexOutputLengths: Readonly<Record<string, number>>
  readonly inputPorts: readonly string[]
  readonly outputPorts: readonly string[]
  readonly firstTimestamp: number | null
  readonly lastTimestamp: number | null
}

export interface HardwareEvidenceManifest {
  readonly schema: typeof HARDWARE_EVIDENCE_SCHEMA
  readonly createdAt: string
  readonly target: DeviceTarget
  readonly midiPermission: string
  readonly sysexEnabled: boolean
  readonly selectedMidiInput: string | null
  readonly selectedMidiOutput: string | null
  readonly identity: HardwareTestIdentity
  readonly audio: HardwareAudioMeasurements
  readonly browser: HardwareBrowserEnvironment
  readonly midiCapture: HardwareMidiCaptureSummary
  readonly checks: Readonly<Record<string, HardwareCheckEvidence>>
  readonly sessionNotes: string
  readonly disclaimer: 'Physical evidence manifest only; check statuses are tester observations and are not software-derived hardware passes.'
}

function increment(record: Record<string, number>, length: number): void {
  const key = String(length)
  record[key] = (record[key] ?? 0) + 1
}

function isSysex(entry: MidiMonitorEntry): boolean {
  return entry.data[0] === 0xf0
}

function isYamahaBank(entry: MidiMonitorEntry): boolean {
  return entry.direction === 'out'
    && entry.data.length === 4104
    && entry.data[0] === 0xf0
    && entry.data[1] === 0x43
    && entry.data[3] === 0x09
    && entry.data[4] === 0x20
    && entry.data[5] === 0x00
    && entry.data[4103] === 0xf7
}

function isYamahaSingleVoice(entry: MidiMonitorEntry): boolean {
  return entry.direction === 'out'
    && entry.data.length === 163
    && entry.data[0] === 0xf0
    && entry.data[1] === 0x43
    && entry.data[3] === 0x00
    && entry.data[4] === 0x01
    && entry.data[5] === 0x1b
    && entry.data[162] === 0xf7
}

export function summarizeHardwareMidiCapture(entries: readonly MidiMonitorEntry[]): HardwareMidiCaptureSummary {
  const sysexInputLengths: Record<string, number> = {}
  const sysexOutputLengths: Record<string, number> = {}
  const inputPorts = new Set<string>()
  const outputPorts = new Set<string>()
  let inputCount = 0
  let outputCount = 0
  let sysexInputCount = 0
  let sysexOutputCount = 0
  let yamahaBankOutputCount = 0
  let yamahaSingleVoiceOutputCount = 0

  for (const entry of entries) {
    if (entry.direction === 'in') {
      inputCount += 1
      inputPorts.add(entry.portName)
    } else {
      outputCount += 1
      outputPorts.add(entry.portName)
    }
    if (isSysex(entry)) {
      if (entry.direction === 'in') {
        sysexInputCount += 1
        increment(sysexInputLengths, entry.data.length)
      } else {
        sysexOutputCount += 1
        increment(sysexOutputLengths, entry.data.length)
      }
    }
    if (isYamahaBank(entry)) yamahaBankOutputCount += 1
    if (isYamahaSingleVoice(entry)) yamahaSingleVoiceOutputCount += 1
  }

  const timestamps = entries.map((entry) => entry.timestamp).filter(Number.isFinite)
  return {
    messageCount: entries.length,
    inputCount,
    outputCount,
    sysexInputCount,
    sysexOutputCount,
    yamahaBankOutputCount,
    yamahaSingleVoiceOutputCount,
    sysexInputLengths,
    sysexOutputLengths,
    inputPorts: [...inputPorts].sort(),
    outputPorts: [...outputPorts].sort(),
    firstTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
    lastTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : null,
  }
}

export function createEmptyHardwareChecks(): Record<string, HardwareCheckEvidence> {
  return Object.fromEntries(HARDWARE_VALIDATION_CHECKS.map((check) => [check.id, { status: 'pending', notes: '' }]))
}

export function hardwareEvidenceOutstandingChecks(checks: Readonly<Record<string, HardwareCheckEvidence>>): readonly string[] {
  return HARDWARE_VALIDATION_CHECKS
    .filter((definition) => (checks[definition.id]?.status ?? 'pending') === 'pending')
    .map((definition) => definition.id)
}

export function serializeHardwareEvidence(manifest: HardwareEvidenceManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
