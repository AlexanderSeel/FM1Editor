import { FM1_DELIVERY_EVIDENCE_SCHEMA, evaluateFm1DeliveryEvidence, type EvaluateFm1DeliveryEvidenceOptions, type Fm1DeliveryEvidenceGate } from './fm1DeliveryEvidence'
import { HARDWARE_EVIDENCE_SCHEMA } from './hardwareEvidence'
import { PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA } from './physicalEvidenceConsistency'

export const FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA = 'fm1-editor.fm1-delivery-evidence-gate.v2' as const

export interface Fm1DeliveryEvidenceFile {
  readonly filename: string
  readonly sha256: string
  readonly value: unknown
}

export interface Fm1DeliveryEvidenceBinding {
  readonly manifestIndex: number
  readonly manifestFilename: string
  readonly manifestSha256: string
  readonly correlationFilename: string
  readonly correlationSha256: string
  readonly rawMidiFilename: string
  readonly rawMidiSha256: string
}

export interface Fm1DeliveryEvidenceIntegrityGate {
  readonly schema: typeof FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA
  readonly evaluatedAt: string
  readonly expectedOrigin: string
  readonly ready: boolean
  readonly manifestFileCount: number
  readonly correlationReceiptCount: number
  readonly baseGate: Fm1DeliveryEvidenceGate
  readonly selected: null | {
    readonly firmwareVersion: string
    readonly editorCommit: string
    readonly windowsVersion: string
    readonly chrome: Fm1DeliveryEvidenceBinding
    readonly edge: Fm1DeliveryEvidenceBinding
  }
  readonly blockers: readonly string[]
  readonly note: string
}

interface CorrelationLink {
  readonly manifestName: string
  readonly manifestSha256: string
  readonly target: 'fm1' | 'dx7'
  readonly matchedMidiMonitorName: string | null
  readonly matchedMidiMonitorSha256: string | null
  readonly summaryMismatchFields: readonly string[]
}

interface CorrelationReceipt {
  readonly structurallyConsistent: boolean
  readonly links: readonly CorrelationLink[]
}

interface NamedCorrelationReceipt {
  readonly filename: string
  readonly sha256: string
  readonly receipt: CorrelationReceipt
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeHash(value: string): string {
  return value.trim().toLowerCase()
}

function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value.trim())
}

function parseCorrelationLink(value: unknown): CorrelationLink | null {
  if (!isRecord(value)) return null
  if (typeof value.manifestName !== 'string' || typeof value.manifestSha256 !== 'string') return null
  if (value.target !== 'fm1' && value.target !== 'dx7') return null
  if (value.matchedMidiMonitorName !== null && typeof value.matchedMidiMonitorName !== 'string') return null
  if (value.matchedMidiMonitorSha256 !== null && typeof value.matchedMidiMonitorSha256 !== 'string') return null
  if (!Array.isArray(value.summaryMismatchFields) || !value.summaryMismatchFields.every((field) => typeof field === 'string')) return null
  return {
    manifestName: value.manifestName,
    manifestSha256: normalizeHash(value.manifestSha256),
    target: value.target,
    matchedMidiMonitorName: value.matchedMidiMonitorName,
    matchedMidiMonitorSha256: value.matchedMidiMonitorSha256 === null ? null : normalizeHash(value.matchedMidiMonitorSha256),
    summaryMismatchFields: value.summaryMismatchFields,
  }
}

function parseCorrelationReceipt(value: unknown): CorrelationReceipt | null {
  if (!isRecord(value) || value.schema !== PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA || typeof value.structurallyConsistent !== 'boolean' || !Array.isArray(value.links)) return null
  const links = value.links.map(parseCorrelationLink)
  if (links.some((link) => link === null)) return null
  return { structurallyConsistent: value.structurallyConsistent, links: links as readonly CorrelationLink[] }
}

function isFm1ManifestSource(value: unknown): boolean {
  return isRecord(value) && value.schema === HARDWARE_EVIDENCE_SCHEMA && value.target === 'fm1'
}

function findBinding(
  source: Fm1DeliveryEvidenceFile,
  manifestIndex: number,
  correlations: readonly NamedCorrelationReceipt[],
): { binding: Fm1DeliveryEvidenceBinding | null; blockers: readonly string[] } {
  const blockers: string[] = []
  const manifestSha256 = normalizeHash(source.sha256)
  if (!isSha256(manifestSha256)) {
    return { binding: null, blockers: [`Selected manifest ${source.filename} does not have a valid SHA-256 identity.`] }
  }

  const matches = correlations.flatMap((correlation) => {
    if (!correlation.receipt.structurallyConsistent) return []
    return correlation.receipt.links
      .filter((link) => link.target === 'fm1'
        && link.manifestSha256 === manifestSha256
        && link.summaryMismatchFields.length === 0
        && link.matchedMidiMonitorName !== null
        && link.matchedMidiMonitorSha256 !== null
        && isSha256(link.matchedMidiMonitorSha256))
      .map((link) => ({ correlation, link }))
  })

  if (matches.length === 0) {
    blockers.push(`Selected manifest ${source.filename} is not backed by a structurally consistent hash-bound raw-MIDI correlation receipt.`)
    return { binding: null, blockers }
  }
  if (matches.length > 1) {
    blockers.push(`Selected manifest ${source.filename} is backed by more than one matching correlation link; retain one unambiguous correlation receipt for delivery closure.`)
    return { binding: null, blockers }
  }

  const match = matches[0]!
  if (!isSha256(match.correlation.sha256)) {
    blockers.push(`Correlation receipt ${match.correlation.filename} does not have a valid SHA-256 identity.`)
    return { binding: null, blockers }
  }

  return {
    binding: {
      manifestIndex,
      manifestFilename: source.filename,
      manifestSha256,
      correlationFilename: match.correlation.filename,
      correlationSha256: normalizeHash(match.correlation.sha256),
      rawMidiFilename: match.link.matchedMidiMonitorName!,
      rawMidiSha256: match.link.matchedMidiMonitorSha256!,
    },
    blockers,
  }
}

export function evaluateFm1DeliveryEvidenceIntegrity(
  files: readonly Fm1DeliveryEvidenceFile[],
  options: EvaluateFm1DeliveryEvidenceOptions,
): Fm1DeliveryEvidenceIntegrityGate {
  const manifestFiles = files.filter((file) => isFm1ManifestSource(file.value))
  const correlations: NamedCorrelationReceipt[] = files.flatMap((file) => {
    const receipt = parseCorrelationReceipt(file.value)
    return receipt ? [{ filename: file.filename, sha256: normalizeHash(file.sha256), receipt }] : []
  })
  const baseGate = evaluateFm1DeliveryEvidence(manifestFiles.map((file) => file.value), options)
  const blockers = [...baseGate.blockers]
  let selected: Fm1DeliveryEvidenceIntegrityGate['selected'] = null

  if (baseGate.ready && baseGate.selected) {
    const chromeSource = manifestFiles[baseGate.selected.chromeIndex]
    const edgeSource = manifestFiles[baseGate.selected.edgeIndex]
    if (!chromeSource || !edgeSource) {
      blockers.push('Selected Chrome/Edge manifest files could not be resolved to imported source files.')
    } else {
      const chromeResult = findBinding(chromeSource, baseGate.selected.chromeIndex, correlations)
      const edgeResult = findBinding(edgeSource, baseGate.selected.edgeIndex, correlations)
      blockers.push(...chromeResult.blockers, ...edgeResult.blockers)

      if (chromeResult.binding && edgeResult.binding) {
        if (chromeResult.binding.manifestSha256 === edgeResult.binding.manifestSha256) {
          blockers.push('Chrome and Edge delivery sessions must use distinct hardware manifest files.')
        }
        if (chromeResult.binding.rawMidiSha256 === edgeResult.binding.rawMidiSha256) {
          blockers.push('Chrome and Edge delivery sessions must be backed by distinct raw MIDI captures.')
        }
        if (blockers.length === 0) {
          selected = {
            firmwareVersion: baseGate.selected.firmwareVersion,
            editorCommit: baseGate.selected.editorCommit,
            windowsVersion: baseGate.selected.windowsVersion,
            chrome: chromeResult.binding,
            edge: edgeResult.binding,
          }
        }
      }
    }
  }

  return {
    schema: FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA,
    evaluatedAt: baseGate.evaluatedAt,
    expectedOrigin: baseGate.expectedOrigin,
    ready: baseGate.ready && blockers.length === 0 && selected !== null,
    manifestFileCount: manifestFiles.length,
    correlationReceiptCount: correlations.length,
    baseGate,
    selected,
    blockers,
    note: `Final delivery readiness requires the ${FM1_DELIVERY_EVIDENCE_SCHEMA} manifest-completeness gate plus unique SHA-256-bound raw-MIDI correlation for the selected Chrome and Edge manifest files. Hash correlation proves file/session linkage only; it does not independently validate tester observations, audio content, unsupported protocols or hardware behavior.`,
  }
}
