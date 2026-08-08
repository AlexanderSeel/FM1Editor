import type { HardwareCheckEvidence, HardwareCheckStatus, HardwareMidiCaptureSummary } from './hardwareEvidence'

export const DX7_HARDWARE_EVIDENCE_SCHEMA = 'fm1-editor.dx7-hardware-validation-evidence.v1' as const

export interface Dx7HardwareCheckDefinition {
  readonly id: string
  readonly section: 'A' | 'B' | 'C' | 'D' | 'E'
  readonly label: string
}

export const DX7_HARDWARE_VALIDATION_CHECKS: readonly Dx7HardwareCheckDefinition[] = Object.freeze([
  { id: 'single-edit-buffer', section: 'A', label: 'Matching-channel 163-byte single voice reaches the edit buffer and is playable' },
  { id: 'single-internal-preserved', section: 'A', label: 'Single-voice receive does not overwrite internal memory before explicit store' },
  { id: 'single-channel-guard', section: 'A', label: 'Mismatched MIDI channel behavior is observed and documented' },
  { id: 'single-system-info-guard', section: 'A', label: 'System Info disabled/enabled behavior is observed and documented' },
  { id: 'bank-reception', section: 'B', label: 'Standard 4,104-byte 32-voice bank is received on the intended configuration' },
  { id: 'bank-all-voices', section: 'B', label: 'All 32 received voices are accounted for with audible spot checks' },
  { id: 'bank-power-cycle', section: 'B', label: 'Received bank persists across power cycle' },
  { id: 'bank-memory-protect', section: 'B', label: 'Memory Protect enabled/disabled behavior is observed and documented' },
  { id: 'bank-recovery', section: 'B', label: 'Known recovery bank restores the original bank after destructive testing' },
  { id: 'bank-interruption', section: 'B', label: 'Interrupted-transfer behavior/recovery is understood, or explicitly not attempted with rationale' },
  { id: 'voice-parameter-groups', section: 'C', label: 'Representative voice parameters across all implemented semantic groups are physically verified' },
  { id: 'operator-mask-155', section: 'C', label: 'Edit-only parameter 155 operator mask is physically verified' },
  { id: 'voice-parameter-channel', section: 'C', label: 'Voice-parameter MIDI-channel guarding is physically verified' },
  { id: 'voice-live-throttling', section: 'C', label: 'Opt-in throttled live parameter editing remains stable on hardware' },
  { id: 'function-mono-poly', section: 'D', label: 'Function parameter mono/poly behavior is physically verified' },
  { id: 'function-pitch-bend', section: 'D', label: 'Pitch-bend range/step function behavior is physically verified' },
  { id: 'function-portamento', section: 'D', label: 'Portamento function behavior is physically verified' },
  { id: 'function-controller-assignments', section: 'D', label: 'Controller assignment function behavior is physically verified' },
  { id: 'function-scope-persistence', section: 'D', label: 'Global/local scope and relevant persistence are documented' },
  { id: 'chrome-interface-resilience', section: 'E', label: 'Chrome permission/reconnect/manual-port resilience matrix passes' },
  { id: 'edge-interface-resilience', section: 'E', label: 'Edge permission/reconnect/manual-port resilience matrix passes' },
  { id: 'note-off-recovery', section: 'E', label: 'Interface removal after note-on has a verified All Notes Off / recovery path' },
])

export interface Dx7HardwareIdentity {
  readonly tester: string
  readonly modelRevision: string
  readonly hardwareIdentity: string
  readonly romVersion: string
  readonly editorCommit: string
  readonly windowsVersion: string
  readonly browserVersion: string
  readonly midiInterface: string
  readonly driverVersion: string
  readonly receiveChannel: number | null
  readonly systemInfoState: 'unknown' | 'enabled' | 'disabled'
  readonly memoryProtectState: 'unknown' | 'enabled' | 'disabled'
  readonly recoveryBankSha256: string
}

export interface Dx7HardwareEvidenceManifest {
  readonly schema: typeof DX7_HARDWARE_EVIDENCE_SCHEMA
  readonly createdAt: string
  readonly identity: Dx7HardwareIdentity
  readonly selectedMidiInputs: readonly string[]
  readonly selectedMidiOutputs: readonly string[]
  readonly midiCapture: HardwareMidiCaptureSummary
  readonly checks: Readonly<Record<string, HardwareCheckEvidence>>
  readonly sessionNotes: string
  readonly disclaimer: 'Stock DX7 physical evidence manifest only; result states are tester observations and are not software-derived hardware passes.'
}

export function createEmptyDx7HardwareChecks(): Record<string, HardwareCheckEvidence> {
  return Object.fromEntries(DX7_HARDWARE_VALIDATION_CHECKS.map((check) => [check.id, { status: 'pending' satisfies HardwareCheckStatus, notes: '' }]))
}

export function dx7OutstandingChecks(checks: Readonly<Record<string, HardwareCheckEvidence>>): readonly string[] {
  return DX7_HARDWARE_VALIDATION_CHECKS
    .filter((definition) => (checks[definition.id]?.status ?? 'pending') === 'pending')
    .map((definition) => definition.id)
}

export function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value.trim())
}

export function serializeDx7HardwareEvidence(manifest: Dx7HardwareEvidenceManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
