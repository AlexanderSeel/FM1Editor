import type { MidiMonitorEntry } from '../midi/monitor'
import {
  DX7_HARDWARE_EVIDENCE_SCHEMA,
  type Dx7HardwareEvidenceManifest,
} from './dx7HardwareEvidence'
import {
  HARDWARE_EVIDENCE_SCHEMA,
  summarizeHardwareMidiCapture,
  type HardwareEvidenceManifest,
  type HardwareMidiCaptureSummary,
} from './hardwareEvidence'
import type { PhysicalEvidenceArtifactInput, PhysicalEvidenceTarget } from './physicalEvidencePackage'

export const PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA = 'fm1-editor.physical-evidence-consistency.v1' as const

export type PhysicalEvidenceConsistencySeverity = 'error' | 'warning'

export interface PhysicalEvidenceConsistencyIssue {
  readonly severity: PhysicalEvidenceConsistencySeverity
  readonly code: string
  readonly artifacts: readonly string[]
  readonly message: string
}

export interface PhysicalEvidenceManifestLink {
  readonly manifestName: string
  readonly manifestSha256: string
  readonly target: 'fm1' | 'dx7'
  readonly matchedMidiMonitorName: string | null
  readonly matchedMidiMonitorSha256: string | null
  readonly summaryMismatchFields: readonly string[]
}

export interface PhysicalEvidenceConsistencyReport {
  readonly schema: typeof PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA
  readonly packageTarget: PhysicalEvidenceTarget
  readonly hardwareManifestCount: number
  readonly midiMonitorCount: number
  readonly links: readonly PhysicalEvidenceManifestLink[]
  readonly errorCount: number
  readonly warningCount: number
  readonly structurallyConsistent: boolean
  readonly issues: readonly PhysicalEvidenceConsistencyIssue[]
  readonly note: string
}

interface MidiMonitorExport {
  readonly version: 1
  readonly exportedAt: string
  readonly entries: readonly MidiMonitorEntry[]
}

interface NamedJsonArtifact {
  readonly name: string
  readonly sha256: string
  readonly value: Record<string, unknown>
}

interface NamedFm1Manifest {
  readonly name: string
  readonly sha256: string
  readonly target: 'fm1'
  readonly manifest: HardwareEvidenceManifest
}

interface NamedDx7Manifest {
  readonly name: string
  readonly sha256: string
  readonly target: 'dx7'
  readonly manifest: Dx7HardwareEvidenceManifest
}

type NamedHardwareManifest = NamedFm1Manifest | NamedDx7Manifest

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isMidiMonitorEntry(value: unknown): value is MidiMonitorEntry {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || !value.id) return false
  if (!isFiniteNumber(value.timestamp)) return false
  if (value.direction !== 'in' && value.direction !== 'out') return false
  if (typeof value.portId !== 'string' || typeof value.portName !== 'string' || typeof value.summary !== 'string') return false
  if (!Array.isArray(value.data)) return false
  return value.data.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
}

function parseMidiMonitorExport(value: unknown): MidiMonitorExport | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.exportedAt !== 'string' || !Array.isArray(value.entries)) return null
  if (!value.entries.every(isMidiMonitorEntry)) return null
  return value as unknown as MidiMonitorExport
}

function sortedRecord(record: Readonly<Record<string, number>>): readonly [string, number][] {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
}

function equalStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function normalizedHash(value: string): string {
  return value.trim().toLowerCase()
}

export function hardwareMidiSummaryMismatchFields(
  expected: HardwareMidiCaptureSummary,
  actual: HardwareMidiCaptureSummary,
): readonly string[] {
  const fields: string[] = []
  const numericFields: readonly (keyof Pick<HardwareMidiCaptureSummary,
    | 'messageCount'
    | 'inputCount'
    | 'outputCount'
    | 'sysexInputCount'
    | 'sysexOutputCount'
    | 'yamahaBankOutputCount'
    | 'yamahaSingleVoiceOutputCount'
    | 'firstTimestamp'
    | 'lastTimestamp'
  >)[] = [
    'messageCount',
    'inputCount',
    'outputCount',
    'sysexInputCount',
    'sysexOutputCount',
    'yamahaBankOutputCount',
    'yamahaSingleVoiceOutputCount',
    'firstTimestamp',
    'lastTimestamp',
  ]
  for (const field of numericFields) if (expected[field] !== actual[field]) fields.push(field)
  if (JSON.stringify(sortedRecord(expected.sysexInputLengths)) !== JSON.stringify(sortedRecord(actual.sysexInputLengths))) fields.push('sysexInputLengths')
  if (JSON.stringify(sortedRecord(expected.sysexOutputLengths)) !== JSON.stringify(sortedRecord(actual.sysexOutputLengths))) fields.push('sysexOutputLengths')
  if (!equalStringArray(expected.inputPorts, actual.inputPorts)) fields.push('inputPorts')
  if (!equalStringArray(expected.outputPorts, actual.outputPorts)) fields.push('outputPorts')
  return fields
}

function addIssue(
  issues: PhysicalEvidenceConsistencyIssue[],
  severity: PhysicalEvidenceConsistencySeverity,
  code: string,
  artifacts: readonly string[],
  message: string,
): void {
  issues.push({ severity, code, artifacts: [...artifacts], message })
}

function manifestIdentityWarnings(item: NamedHardwareManifest, issues: PhysicalEvidenceConsistencyIssue[]): void {
  const editorCommit = item.manifest.identity.editorCommit.trim()
  if (!/^[0-9a-f]{7,40}$/i.test(editorCommit)) addIssue(issues, 'warning', 'editor-commit-not-pinned', [item.name], 'Hardware evidence does not contain a 7–40 character hexadecimal editor commit identity.')
  if (item.target === 'fm1') {
    if (!item.manifest.identity.firmwareVersion.trim()) addIssue(issues, 'warning', 'fm1-firmware-not-recorded', [item.name], 'FM-1 firmware identity is empty.')
  } else {
    if (!item.manifest.identity.modelRevision.trim()) addIssue(issues, 'warning', 'dx7-model-not-recorded', [item.name], 'DX7 model/revision identity is empty.')
    if (!/^[0-9a-f]{64}$/i.test(item.manifest.identity.recoveryBankSha256.trim())) addIssue(issues, 'error', 'dx7-recovery-bank-hash-invalid', [item.name], 'DX7 evidence does not contain a valid 64-character recovery-bank SHA-256.')
  }
}

function localManifestInvariantIssues(item: NamedHardwareManifest, issues: PhysicalEvidenceConsistencyIssue[]): void {
  if (item.target === 'fm1') {
    const fm1 = item.manifest
    if (fm1.target !== 'fm1') addIssue(issues, 'error', 'fm1-target-mismatch', [item.name], `FM-1 evidence manifest declares target ${String(fm1.target)}.`)
    const expectedSysexEnabled = fm1.midiCapture.sysexInputCount + fm1.midiCapture.sysexOutputCount > 0
    if (fm1.sysexEnabled !== expectedSysexEnabled) addIssue(issues, 'error', 'fm1-sysex-flag-mismatch', [item.name], 'FM-1 sysexEnabled does not agree with its own MIDI capture summary.')
    const expectedInput = fm1.midiCapture.inputPorts.join(' | ') || null
    const expectedOutput = fm1.midiCapture.outputPorts.join(' | ') || null
    if (fm1.selectedMidiInput !== expectedInput) addIssue(issues, 'error', 'fm1-selected-input-mismatch', [item.name], 'FM-1 selectedMidiInput does not agree with its own MIDI capture ports.')
    if (fm1.selectedMidiOutput !== expectedOutput) addIssue(issues, 'error', 'fm1-selected-output-mismatch', [item.name], 'FM-1 selectedMidiOutput does not agree with its own MIDI capture ports.')
  } else {
    const dx7 = item.manifest
    if (!equalStringArray(dx7.selectedMidiInputs, dx7.midiCapture.inputPorts)) addIssue(issues, 'error', 'dx7-selected-input-mismatch', [item.name], 'DX7 selected MIDI inputs do not agree with its own MIDI capture ports.')
    if (!equalStringArray(dx7.selectedMidiOutputs, dx7.midiCapture.outputPorts)) addIssue(issues, 'error', 'dx7-selected-output-mismatch', [item.name], 'DX7 selected MIDI outputs do not agree with its own MIDI capture ports.')
  }
}

export function validatePhysicalEvidenceConsistency(
  inputs: readonly PhysicalEvidenceArtifactInput[],
  packageTarget: PhysicalEvidenceTarget,
): PhysicalEvidenceConsistencyReport {
  const issues: PhysicalEvidenceConsistencyIssue[] = []
  const jsonArtifacts: NamedJsonArtifact[] = inputs
    .filter((input): input is PhysicalEvidenceArtifactInput & { readonly jsonValue: Record<string, unknown> } => isRecord(input.jsonValue))
    .map((input) => ({ name: input.name, sha256: normalizedHash(input.sha256), value: input.jsonValue }))

  const monitors = jsonArtifacts
    .map((artifact) => ({ ...artifact, parsed: parseMidiMonitorExport(artifact.value) }))
    .filter((artifact): artifact is NamedJsonArtifact & { readonly parsed: MidiMonitorExport } => artifact.parsed !== null)
    .map((artifact) => ({ name: artifact.name, sha256: artifact.sha256, summary: summarizeHardwareMidiCapture(artifact.parsed.entries) }))

  const manifests: NamedHardwareManifest[] = []
  for (const artifact of jsonArtifacts) {
    if (artifact.value.schema === HARDWARE_EVIDENCE_SCHEMA && isRecord(artifact.value.midiCapture) && isRecord(artifact.value.identity)) {
      manifests.push({ name: artifact.name, sha256: artifact.sha256, target: 'fm1', manifest: artifact.value as unknown as HardwareEvidenceManifest })
    } else if (artifact.value.schema === DX7_HARDWARE_EVIDENCE_SCHEMA && isRecord(artifact.value.midiCapture) && isRecord(artifact.value.identity)) {
      manifests.push({ name: artifact.name, sha256: artifact.sha256, target: 'dx7', manifest: artifact.value as unknown as Dx7HardwareEvidenceManifest })
    }
  }

  const fm1ManifestCount = manifests.filter((manifest) => manifest.target === 'fm1').length
  const dx7ManifestCount = manifests.filter((manifest) => manifest.target === 'dx7').length
  if ((packageTarget === 'fm1' || packageTarget === 'mixed') && fm1ManifestCount === 0) addIssue(issues, 'error', 'fm1-manifest-missing', [], 'The selected package target requires an FM-1 hardware evidence manifest.')
  if ((packageTarget === 'dx7' || packageTarget === 'mixed') && dx7ManifestCount === 0) addIssue(issues, 'error', 'dx7-manifest-missing', [], 'The selected package target requires a stock-DX7 hardware evidence manifest.')
  if (monitors.length === 0) addIssue(issues, 'error', 'midi-monitor-missing', [], 'No structurally valid version-1 raw MIDI-monitor JSON export is present.')

  const usedMonitorNames = new Set<string>()
  const links: PhysicalEvidenceManifestLink[] = []
  for (const item of manifests) {
    manifestIdentityWarnings(item, issues)
    localManifestInvariantIssues(item, issues)

    const comparisons = monitors.map((monitor) => ({ monitor, mismatchFields: hardwareMidiSummaryMismatchFields(item.manifest.midiCapture, monitor.summary) }))
    const exact = comparisons.filter((comparison) => comparison.mismatchFields.length === 0)
    if (exact.length === 1) {
      const matched = exact[0]!.monitor
      usedMonitorNames.add(matched.name)
      links.push({ manifestName: item.name, manifestSha256: item.sha256, target: item.target, matchedMidiMonitorName: matched.name, matchedMidiMonitorSha256: matched.sha256, summaryMismatchFields: [] })
    } else if (exact.length > 1) {
      const names = exact.map((comparison) => comparison.monitor.name).sort()
      addIssue(issues, 'error', 'midi-link-ambiguous', [item.name, ...names], `Manifest ${item.name} matches more than one raw MIDI export; retain a unique capture for deterministic evidence linkage.`)
      links.push({ manifestName: item.name, manifestSha256: item.sha256, target: item.target, matchedMidiMonitorName: null, matchedMidiMonitorSha256: null, summaryMismatchFields: [] })
    } else {
      const closest = [...comparisons].sort((left, right) => left.mismatchFields.length - right.mismatchFields.length || left.monitor.name.localeCompare(right.monitor.name))[0]
      const mismatchFields = closest?.mismatchFields ?? []
      const artifacts = closest ? [item.name, closest.monitor.name] : [item.name]
      const suffix = closest ? ` Closest capture ${closest.monitor.name} differs in: ${mismatchFields.join(', ') || 'unknown fields'}.` : ''
      addIssue(issues, 'error', 'midi-summary-mismatch', artifacts, `Manifest ${item.name} does not match any raw MIDI-monitor summary.${suffix}`)
      links.push({ manifestName: item.name, manifestSha256: item.sha256, target: item.target, matchedMidiMonitorName: null, matchedMidiMonitorSha256: null, summaryMismatchFields: mismatchFields })
    }
  }

  for (const monitor of monitors) if (!usedMonitorNames.has(monitor.name)) addIssue(issues, 'warning', 'unlinked-midi-monitor', [monitor.name], `Raw MIDI export ${monitor.name} is not uniquely linked to a hardware evidence manifest in this package.`)

  const errorCount = issues.filter((issue) => issue.severity === 'error').length
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length
  return {
    schema: PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA,
    packageTarget,
    hardwareManifestCount: manifests.length,
    midiMonitorCount: monitors.length,
    links,
    errorCount,
    warningCount,
    structurallyConsistent: errorCount === 0,
    issues,
    note: 'Structural correlation only. Matching manifest summaries to raw MIDI captures can detect mixed-up or incomplete evidence files, but it does not validate tester-entered PASS/FAIL observations, device behavior, audio content or PLAN closure.',
  }
}

export function serializePhysicalEvidenceConsistencyReport(report: PhysicalEvidenceConsistencyReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}
