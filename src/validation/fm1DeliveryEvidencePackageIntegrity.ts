import {
  evaluateFm1DeliveryEvidenceIntegrity,
  type Fm1DeliveryEvidenceBinding,
  type Fm1DeliveryEvidenceFile,
  type Fm1DeliveryEvidenceIntegrityGate,
} from './fm1DeliveryEvidenceIntegrity'
import {
  PHYSICAL_EVIDENCE_PACKAGE_SCHEMA,
  type PhysicalEvidenceArtifactKind,
} from './physicalEvidencePackage'
import type { EvaluateFm1DeliveryEvidenceOptions } from './fm1DeliveryEvidence'

export const FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA = 'fm1-editor.fm1-delivery-evidence-gate.v3' as const

interface PackageArtifact {
  readonly name: string
  readonly sha256: string
  readonly kind: PhysicalEvidenceArtifactKind
}

interface ParsedPackageIndex {
  readonly target: 'fm1'
  readonly artifacts: readonly PackageArtifact[]
}

interface NamedPackageIndex {
  readonly filename: string
  readonly sha256: string
  readonly index: ParsedPackageIndex
}

export interface Fm1DeliveryEvidencePackageBinding extends Fm1DeliveryEvidenceBinding {
  readonly packageFilename: string
  readonly packageSha256: string
  readonly audioWavArtifacts: readonly { readonly name: string; readonly sha256: string }[]
  readonly sysexArtifacts: readonly { readonly name: string; readonly sha256: string }[]
  readonly observationArtifacts: readonly { readonly name: string; readonly sha256: string; readonly kind: 'screenshot' | 'notes' }[]
}

export interface Fm1DeliveryEvidencePackageIntegrityGate {
  readonly schema: typeof FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA
  readonly evaluatedAt: string
  readonly expectedOrigin: string
  readonly ready: boolean
  readonly packageIndexCount: number
  readonly integrityGate: Fm1DeliveryEvidenceIntegrityGate
  readonly selected: null | {
    readonly firmwareVersion: string
    readonly editorCommit: string
    readonly windowsVersion: string
    readonly chrome: Fm1DeliveryEvidencePackageBinding
    readonly edge: Fm1DeliveryEvidencePackageBinding
  }
  readonly blockers: readonly string[]
  readonly note: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeHash(value: string): string {
  return value.trim().toLowerCase()
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value.trim())
}

const ARTIFACT_KINDS = new Set<PhysicalEvidenceArtifactKind>([
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

function parsePackageArtifact(value: unknown): PackageArtifact | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !isSha256(value.sha256)) return null
  if (typeof value.kind !== 'string' || !ARTIFACT_KINDS.has(value.kind as PhysicalEvidenceArtifactKind)) return null
  return {
    name: value.name,
    sha256: normalizeHash(value.sha256),
    kind: value.kind as PhysicalEvidenceArtifactKind,
  }
}

function parsePackageIndex(value: unknown): ParsedPackageIndex | null {
  if (!isRecord(value) || value.schema !== PHYSICAL_EVIDENCE_PACKAGE_SCHEMA || value.target !== 'fm1' || !Array.isArray(value.artifacts)) return null
  const artifacts = value.artifacts.map(parsePackageArtifact)
  if (artifacts.some((artifact) => artifact === null)) return null
  return { target: 'fm1', artifacts: artifacts as readonly PackageArtifact[] }
}

function artifactsByKind(index: ParsedPackageIndex, kind: PhysicalEvidenceArtifactKind): readonly PackageArtifact[] {
  return index.artifacts.filter((artifact) => artifact.kind === kind)
}

function containsHash(index: ParsedPackageIndex, kind: PhysicalEvidenceArtifactKind, sha256: string): boolean {
  return index.artifacts.some((artifact) => artifact.kind === kind && artifact.sha256 === sha256)
}

function findPackageBinding(
  binding: Fm1DeliveryEvidenceBinding,
  packages: readonly NamedPackageIndex[],
): { binding: Fm1DeliveryEvidencePackageBinding | null; blockers: readonly string[] } {
  const blockers: string[] = []
  const matches = packages.filter((candidate) =>
    containsHash(candidate.index, 'fm1-hardware-manifest', binding.manifestSha256)
    && containsHash(candidate.index, 'midi-monitor', binding.rawMidiSha256))

  if (matches.length === 0) {
    blockers.push(`Session ${binding.manifestFilename} is not backed by an FM-1 package index containing both its manifest SHA-256 and matched raw-MIDI SHA-256.`)
    return { binding: null, blockers }
  }
  if (matches.length > 1) {
    blockers.push(`Session ${binding.manifestFilename} matches more than one FM-1 package index; retain one unambiguous package index for delivery closure.`)
    return { binding: null, blockers }
  }

  const match = matches[0]!
  if (!isSha256(match.sha256)) {
    blockers.push(`Package index ${match.filename} does not have a valid SHA-256 identity.`)
    return { binding: null, blockers }
  }

  const audio = artifactsByKind(match.index, 'audio-wav')
  const sysex = artifactsByKind(match.index, 'sysex')
  const observations = match.index.artifacts.filter((artifact): artifact is PackageArtifact & { kind: 'screenshot' | 'notes' } => artifact.kind === 'screenshot' || artifact.kind === 'notes')
  if (audio.length === 0) blockers.push(`Package index ${match.filename} has no WAV artifact for the physical USB-audio session.`)
  if (sysex.length === 0) blockers.push(`Package index ${match.filename} has no .syx artifact for the merged-bank delivery session.`)
  if (observations.length === 0) blockers.push(`Package index ${match.filename} has no screenshot or notes artifact for device-screen/recovery observations.`)
  if (blockers.length > 0) return { binding: null, blockers }

  return {
    binding: {
      ...binding,
      packageFilename: match.filename,
      packageSha256: normalizeHash(match.sha256),
      audioWavArtifacts: audio.map((artifact) => ({ name: artifact.name, sha256: artifact.sha256 })),
      sysexArtifacts: sysex.map((artifact) => ({ name: artifact.name, sha256: artifact.sha256 })),
      observationArtifacts: observations.map((artifact) => ({ name: artifact.name, sha256: artifact.sha256, kind: artifact.kind })),
    },
    blockers,
  }
}

export function evaluateFm1DeliveryEvidencePackageIntegrity(
  files: readonly Fm1DeliveryEvidenceFile[],
  options: EvaluateFm1DeliveryEvidenceOptions,
): Fm1DeliveryEvidencePackageIntegrityGate {
  const integrityGate = evaluateFm1DeliveryEvidenceIntegrity(files, options)
  const packages: NamedPackageIndex[] = files.flatMap((file) => {
    const index = parsePackageIndex(file.value)
    return index ? [{ filename: file.filename, sha256: normalizeHash(file.sha256), index }] : []
  })
  const blockers = [...integrityGate.blockers]
  let selected: Fm1DeliveryEvidencePackageIntegrityGate['selected'] = null

  if (integrityGate.ready && integrityGate.selected) {
    const chromeResult = findPackageBinding(integrityGate.selected.chrome, packages)
    const edgeResult = findPackageBinding(integrityGate.selected.edge, packages)
    blockers.push(...chromeResult.blockers, ...edgeResult.blockers)

    if (chromeResult.binding && edgeResult.binding) {
      if (chromeResult.binding.packageSha256 === edgeResult.binding.packageSha256) {
        blockers.push('Chrome and Edge delivery sessions must use distinct physical evidence package indexes.')
      }
      const chromeAudioHashes = new Set(chromeResult.binding.audioWavArtifacts.map((artifact) => artifact.sha256))
      if (edgeResult.binding.audioWavArtifacts.some((artifact) => chromeAudioHashes.has(artifact.sha256))) {
        blockers.push('Chrome and Edge delivery sessions must retain distinct physical WAV recordings rather than reusing the same audio artifact.')
      }
      if (blockers.length === 0) {
        selected = {
          firmwareVersion: integrityGate.selected.firmwareVersion,
          editorCommit: integrityGate.selected.editorCommit,
          windowsVersion: integrityGate.selected.windowsVersion,
          chrome: chromeResult.binding,
          edge: edgeResult.binding,
        }
      }
    }
  }

  return {
    schema: FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA,
    evaluatedAt: integrityGate.evaluatedAt,
    expectedOrigin: integrityGate.expectedOrigin,
    ready: integrityGate.ready && blockers.length === 0 && selected !== null,
    packageIndexCount: packages.length,
    integrityGate,
    selected,
    blockers,
    note: 'Final v3 delivery readiness requires the v2 physical-manifest/raw-MIDI integrity gate plus one unique FM-1 package index per selected browser session containing those exact manifest/raw-MIDI hashes, at least one WAV recording, at least one SysEx file and screenshot-or-notes evidence. Package linkage proves artifact identity/coverage only; it does not independently validate tester observations, audio content or hardware behavior.',
  }
}
