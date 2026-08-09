import { DX7_HARDWARE_EVIDENCE_SCHEMA } from './dx7HardwareEvidence'
import { FM1_DELIVERY_EVIDENCE_SCHEMA } from './fm1DeliveryEvidence'
import { FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA } from './fm1DeliveryEvidenceIntegrity'
import { HARDWARE_EVIDENCE_SCHEMA } from './hardwareEvidence'

export const PHYSICAL_EVIDENCE_PACKAGE_SCHEMA = 'fm1-editor.physical-evidence-package.v1' as const
const FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA = 'fm1-editor.fm1-delivery-evidence-gate.v3' as const

export type PhysicalEvidenceTarget = 'fm1' | 'dx7' | 'mixed'
export type PhysicalEvidenceArtifactKind =
  | 'fm1-hardware-manifest'
  | 'dx7-hardware-manifest'
  | 'fm1-delivery-gate'
  | 'midi-monitor'
  | 'sysex'
  | 'audio-wav'
  | 'screenshot'
  | 'notes'
  | 'json-data'
  | 'other'

export interface PhysicalEvidenceArtifactInput {
  readonly name: string
  readonly sizeBytes: number
  readonly mimeType: string
  readonly sha256: string
  readonly jsonValue?: unknown
  /** Browser-memory-only bytes used to correlate a .syx artifact with captured raw MIDI. Never serialized into the package index. */
  readonly sysexBytes?: readonly number[]
}

export interface PhysicalEvidenceArtifact {
  readonly name: string
  readonly sizeBytes: number
  readonly mimeType: string
  readonly sha256: string
  readonly kind: PhysicalEvidenceArtifactKind
  readonly jsonSchema: string | null
}

export interface PhysicalEvidencePackageManifest {
  readonly schema: typeof PHYSICAL_EVIDENCE_PACKAGE_SCHEMA
  readonly createdAt: string
  readonly target: PhysicalEvidenceTarget
  readonly artifactCount: number
  readonly totalBytes: number
  readonly artifacts: readonly PhysicalEvidenceArtifact[]
  readonly countsByKind: Readonly<Record<PhysicalEvidenceArtifactKind, number>>
  readonly duplicateHashes: readonly {
    readonly sha256: string
    readonly names: readonly string[]
  }[]
  readonly warnings: readonly string[]
  readonly note: string
}

const ARTIFACT_KINDS: readonly PhysicalEvidenceArtifactKind[] = Object.freeze([
  'fm1-hardware-manifest',
  'dx7-hardware-manifest',
  'fm1-delivery-gate',
  'midi-monitor',
  'sysex',
  'audio-wav',
  'screenshot',
  'notes',
  'json-data',
  'other',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function jsonSchema(value: unknown): string | null {
  return isRecord(value) && typeof value.schema === 'string' ? value.schema : null
}

function isMidiMonitorJson(value: unknown): boolean {
  return isRecord(value)
    && value.version === 1
    && typeof value.exportedAt === 'string'
    && Array.isArray(value.entries)
}

export function classifyPhysicalEvidenceArtifact(
  name: string,
  mimeType: string,
  value?: unknown,
): { kind: PhysicalEvidenceArtifactKind; jsonSchema: string | null } {
  const lower = name.toLowerCase()
  const schema = jsonSchema(value)

  if (schema === HARDWARE_EVIDENCE_SCHEMA) return { kind: 'fm1-hardware-manifest', jsonSchema: schema }
  if (schema === DX7_HARDWARE_EVIDENCE_SCHEMA) return { kind: 'dx7-hardware-manifest', jsonSchema: schema }
  if (schema === FM1_DELIVERY_EVIDENCE_SCHEMA || schema === FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA || schema === FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA) return { kind: 'fm1-delivery-gate', jsonSchema: schema }
  if (isMidiMonitorJson(value)) return { kind: 'midi-monitor', jsonSchema: null }
  if (lower.endsWith('.syx')) return { kind: 'sysex', jsonSchema: null }
  if (lower.endsWith('.wav') || mimeType.toLowerCase() === 'audio/wav' || mimeType.toLowerCase() === 'audio/x-wav') return { kind: 'audio-wav', jsonSchema: null }
  if (/\.(png|jpe?g|webp)$/i.test(lower) || mimeType.toLowerCase().startsWith('image/')) return { kind: 'screenshot', jsonSchema: null }
  if (/\.(md|txt|csv)$/i.test(lower) || mimeType.toLowerCase().startsWith('text/')) return { kind: 'notes', jsonSchema: null }
  if (lower.endsWith('.json') || mimeType.toLowerCase() === 'application/json') return { kind: 'json-data', jsonSchema: schema }
  return { kind: 'other', jsonSchema: null }
}

function normalizeSha256(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error('Evidence artifact SHA-256 must be 64 hexadecimal characters.')
  return normalized
}

function normalizeArtifact(input: PhysicalEvidenceArtifactInput): PhysicalEvidenceArtifact {
  const name = input.name.trim()
  if (!name) throw new Error('Evidence artifact filename is required.')
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) throw new Error(`Evidence artifact ${name} has an invalid byte size.`)
  const classified = classifyPhysicalEvidenceArtifact(name, input.mimeType, input.jsonValue)
  return {
    name,
    sizeBytes: input.sizeBytes,
    mimeType: input.mimeType.trim(),
    sha256: normalizeSha256(input.sha256),
    ...classified,
  }
}

function warningsFor(target: PhysicalEvidenceTarget, counts: Readonly<Record<PhysicalEvidenceArtifactKind, number>>): string[] {
  const warnings: string[] = []
  if ((target === 'fm1' || target === 'mixed') && counts['fm1-hardware-manifest'] === 0) {
    warnings.push('No FM-1 hardware evidence manifest is present.')
  }
  if ((target === 'dx7' || target === 'mixed') && counts['dx7-hardware-manifest'] === 0) {
    warnings.push('No stock-DX7 hardware evidence manifest is present.')
  }
  if (counts['midi-monitor'] === 0) warnings.push('No raw MIDI-monitor JSON export is present.')
  if (counts.sysex === 0) warnings.push('No .syx source/transmitted/recovery artifact is present.')
  if ((target === 'fm1' || target === 'mixed') && counts['audio-wav'] === 0) {
    warnings.push('No FM-1 WAV recording is present; audio-dependent physical claims cannot be evidenced by this package alone.')
  }
  if (counts.screenshot === 0 && counts.notes === 0) {
    warnings.push('No screenshot or text timeline/notes artifact is present for device-screen/recovery observations.')
  }
  return warnings
}

export function createPhysicalEvidencePackageManifest(
  inputs: readonly PhysicalEvidenceArtifactInput[],
  options: { readonly target: PhysicalEvidenceTarget; readonly createdAt?: () => Date },
): PhysicalEvidencePackageManifest {
  const artifacts = inputs.map(normalizeArtifact).sort((left, right) => left.name.localeCompare(right.name))
  const countsByKind = Object.fromEntries(ARTIFACT_KINDS.map((kind) => [kind, 0])) as Record<PhysicalEvidenceArtifactKind, number>
  const hashes = new Map<string, string[]>()

  for (const artifact of artifacts) {
    countsByKind[artifact.kind] += 1
    const names = hashes.get(artifact.sha256) ?? []
    names.push(artifact.name)
    hashes.set(artifact.sha256, names)
  }

  const duplicateHashes = [...hashes.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([sha256, names]) => ({ sha256, names: [...names].sort() }))
    .sort((left, right) => left.sha256.localeCompare(right.sha256))
  const warnings = warningsFor(options.target, countsByKind)
  if (duplicateHashes.length > 0) warnings.push('One or more SHA-256 values occur under multiple filenames; review duplicate artifacts before committing evidence.')

  return {
    schema: PHYSICAL_EVIDENCE_PACKAGE_SCHEMA,
    createdAt: (options.createdAt ?? (() => new Date()))().toISOString(),
    target: options.target,
    artifactCount: artifacts.length,
    totalBytes: artifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0),
    artifacts,
    countsByKind,
    duplicateHashes,
    warnings,
    note: 'Integrity/index manifest only. Artifact hashes and classifications make a physical evidence package reproducible, but they do not turn tester observations into hardware validation or close PLAN items.',
  }
}

export function serializePhysicalEvidencePackageManifest(manifest: PhysicalEvidencePackageManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
