import type { Dx7Voice } from '../domain/voice'
import { encodePcm16Wav } from './recorder'
import type { PreparedReferenceAudio } from './referenceAudio'
import { decodeSingleVoiceData, DX7_SINGLE_DATA_LENGTH, validateVoice } from '../sysex/dx7'

export const RECONSTRUCTION_ACCELERATOR_CAPABILITIES_SCHEMA = 'fm1-editor.reconstruction-accelerator-capabilities.v1' as const
export const RECONSTRUCTION_ACCELERATOR_RESULT_SCHEMA = 'fm1-editor.reconstruction-accelerator-result.v1' as const
export const RECONSTRUCTION_UPLOAD_CONSENT_SCHEMA = 'fm1-editor.reconstruction-upload-consent.v1' as const
export const RECONSTRUCTION_UPLOAD_CONSENT_LIFETIME_MS = 15 * 60 * 1000

export type ReconstructionAcceleratorModelKind = 'retrieval' | 'evolutionary' | 'learned-initialization' | 'hybrid'
export type ReconstructionExecutionMode = 'local' | 'remote'

export interface ReconstructionAcceleratorCapabilities {
  readonly schema: typeof RECONSTRUCTION_ACCELERATOR_CAPABILITIES_SCHEMA
  readonly serviceId: string
  readonly serviceVersion: string
  readonly model: {
    readonly id: string
    readonly version: string
    readonly kind: ReconstructionAcceleratorModelKind
    readonly licenseSpdx: string
  }
  readonly retention: {
    readonly mode: 'memory-only' | 'ephemeral'
    readonly maxSeconds: number
    readonly deletion: 'automatic'
    readonly statement: string
  }
  readonly accepts: {
    readonly mimeTypes: readonly string[]
    readonly maxBytes: number
  }
}

export interface DiscoveredReconstructionAccelerator {
  readonly baseUrl: string
  readonly origin: string
  readonly capabilities: ReconstructionAcceleratorCapabilities
  readonly policyIdentity: string
}

export interface ReconstructionUploadConsent {
  readonly schema: typeof RECONSTRUCTION_UPLOAD_CONSENT_SCHEMA
  readonly id: string
  readonly grantedAt: string
  readonly expiresAt: string
  readonly endpointOrigin: string
  readonly referenceSha256: string
  readonly policyIdentity: string
  readonly serviceId: string
  readonly serviceVersion: string
  readonly modelId: string
  readonly modelVersion: string
}

export interface ReconstructionAccelerationCandidate {
  readonly voice: Dx7Voice
  readonly distance: number | null
  readonly sourceInitialization: string
}

export interface ReconstructionAccelerationResult {
  readonly schema: typeof RECONSTRUCTION_ACCELERATOR_RESULT_SCHEMA
  readonly requestId: string
  readonly serviceId: string
  readonly serviceVersion: string
  readonly modelId: string
  readonly modelVersion: string
  readonly candidates: readonly ReconstructionAccelerationCandidate[]
  readonly retentionReceipt: {
    readonly referenceDeleted: boolean
    readonly deletedAt: string | null
    readonly deleteBy: string | null
  }
}

export interface SubmitReconstructionAccelerationOptions {
  readonly fetchImpl?: typeof fetch
  readonly now?: () => Date
}

const consumedConsentIds = new Set<string>()

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`)
  return value as Record<string, unknown>
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string.`)
  return value.trim()
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) throw new Error(`${label} must be a positive integer.`)
  return value as number
}

function finiteNonNegative(value: unknown, label: string): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be null or a non-negative finite number.`)
  return value
}

function validIso(value: unknown, label: string): string | null {
  if (value === null) return null
  const text = string(value, label)
  if (!Number.isFinite(Date.parse(text))) throw new Error(`${label} must be an ISO timestamp.`)
  return text
}

function normalizeBaseUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Reconstruction accelerator URL is invalid.')
  }
  const localHttp = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]')
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error('Reconstruction accelerator must use HTTPS, except for localhost development.')
  }
  url.username = ''
  url.password = ''
  url.hash = ''
  url.search = ''
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url
}

function parseCapabilities(value: unknown): ReconstructionAcceleratorCapabilities {
  const root = object(value, 'Accelerator capabilities')
  if (root.schema !== RECONSTRUCTION_ACCELERATOR_CAPABILITIES_SCHEMA) throw new Error('Accelerator capabilities schema is unsupported.')
  const model = object(root.model, 'Accelerator model metadata')
  const retention = object(root.retention, 'Accelerator retention policy')
  const accepts = object(root.accepts, 'Accelerator upload limits')
  const kind = string(model.kind, 'model.kind')
  if (!['retrieval', 'evolutionary', 'learned-initialization', 'hybrid'].includes(kind)) throw new Error(`Unsupported accelerator model kind: ${kind}.`)
  const mode = string(retention.mode, 'retention.mode')
  if (mode !== 'memory-only' && mode !== 'ephemeral') throw new Error('Accelerator retention mode must be memory-only or ephemeral.')
  if (retention.deletion !== 'automatic') throw new Error('Accelerator must declare automatic reference deletion.')
  if (!Array.isArray(accepts.mimeTypes) || accepts.mimeTypes.length === 0) throw new Error('Accelerator must declare accepted MIME types.')
  const mimeTypes = accepts.mimeTypes.map((item, index) => string(item, `accepts.mimeTypes[${index}]`).toLowerCase())
  return {
    schema: RECONSTRUCTION_ACCELERATOR_CAPABILITIES_SCHEMA,
    serviceId: string(root.serviceId, 'serviceId'),
    serviceVersion: string(root.serviceVersion, 'serviceVersion'),
    model: {
      id: string(model.id, 'model.id'),
      version: string(model.version, 'model.version'),
      kind: kind as ReconstructionAcceleratorModelKind,
      licenseSpdx: string(model.licenseSpdx, 'model.licenseSpdx'),
    },
    retention: {
      mode,
      maxSeconds: positiveInteger(retention.maxSeconds, 'retention.maxSeconds'),
      deletion: 'automatic',
      statement: string(retention.statement, 'retention.statement'),
    },
    accepts: {
      mimeTypes,
      maxBytes: positiveInteger(accepts.maxBytes, 'accepts.maxBytes'),
    },
  }
}

function policyIdentity(capabilities: ReconstructionAcceleratorCapabilities): string {
  return [
    capabilities.serviceId,
    capabilities.serviceVersion,
    capabilities.model.id,
    capabilities.model.version,
    capabilities.model.kind,
    capabilities.model.licenseSpdx,
    capabilities.retention.mode,
    capabilities.retention.maxSeconds,
    capabilities.retention.deletion,
    capabilities.retention.statement,
  ].join('|')
}

function consentId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `consent-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function base64Bytes(value: unknown): Uint8Array {
  const encoded = string(value, 'candidate.voiceDataBase64')
  const decode = globalThis.atob
  if (typeof decode !== 'function') throw new Error('Base64 decoding is unavailable in this runtime.')
  let binary: string
  try {
    binary = decode(encoded)
  } catch {
    throw new Error('Accelerator candidate voice data is not valid base64.')
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  if (bytes.length !== DX7_SINGLE_DATA_LENGTH) {
    throw new Error(`Accelerator candidate must contain exactly ${DX7_SINGLE_DATA_LENGTH} unpacked DX7 voice bytes.`)
  }
  return bytes
}

function parseResult(value: unknown, discovered: DiscoveredReconstructionAccelerator, submittedAt: Date): ReconstructionAccelerationResult {
  const root = object(value, 'Accelerator result')
  if (root.schema !== RECONSTRUCTION_ACCELERATOR_RESULT_SCHEMA) throw new Error('Accelerator result schema is unsupported.')
  const serviceId = string(root.serviceId, 'result.serviceId')
  const serviceVersion = string(root.serviceVersion, 'result.serviceVersion')
  const modelId = string(root.modelId, 'result.modelId')
  const modelVersion = string(root.modelVersion, 'result.modelVersion')
  if (serviceId !== discovered.capabilities.serviceId || serviceVersion !== discovered.capabilities.serviceVersion) {
    throw new Error('Accelerator result service identity does not match the consented capability document.')
  }
  if (modelId !== discovered.capabilities.model.id || modelVersion !== discovered.capabilities.model.version) {
    throw new Error('Accelerator result model identity does not match the consented capability document.')
  }
  if (!Array.isArray(root.candidates)) throw new Error('Accelerator result candidates must be an array.')
  const candidates = root.candidates.map((item, index) => {
    const candidate = object(item, `result.candidates[${index}]`)
    const voice = decodeSingleVoiceData(base64Bytes(candidate.voiceDataBase64))
    validateVoice(voice)
    return {
      voice,
      distance: finiteNonNegative(candidate.distance ?? null, `result.candidates[${index}].distance`),
      sourceInitialization: string(candidate.sourceInitialization, `result.candidates[${index}].sourceInitialization`),
    }
  })
  const retention = object(root.retentionReceipt, 'result.retentionReceipt')
  const referenceDeleted = retention.referenceDeleted === true
  const deletedAt = validIso(retention.deletedAt ?? null, 'retentionReceipt.deletedAt')
  const deleteBy = validIso(retention.deleteBy ?? null, 'retentionReceipt.deleteBy')
  if (!referenceDeleted && deleteBy === null) throw new Error('Accelerator result must prove deletion or provide an automatic delete-by timestamp.')
  if (deleteBy !== null) {
    const maximumDeleteTime = submittedAt.getTime() + discovered.capabilities.retention.maxSeconds * 1000
    if (Date.parse(deleteBy) > maximumDeleteTime + 1000) throw new Error('Accelerator delete-by timestamp exceeds the consented retention window.')
  }
  return {
    schema: RECONSTRUCTION_ACCELERATOR_RESULT_SCHEMA,
    requestId: string(root.requestId, 'result.requestId'),
    serviceId,
    serviceVersion,
    modelId,
    modelVersion,
    candidates,
    retentionReceipt: { referenceDeleted, deletedAt, deleteBy },
  }
}

export function getConfiguredReconstructionAcceleratorUrl(): string | null {
  const configured = import.meta.env.VITE_RECONSTRUCTION_ACCELERATOR_URL
  return typeof configured === 'string' && configured.trim() ? configured.trim() : null
}

export async function discoverReconstructionAccelerator(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveredReconstructionAccelerator> {
  const normalized = normalizeBaseUrl(baseUrl)
  const endpoint = new URL('v1/reconstruction/capabilities', normalized.href.endsWith('/') ? normalized.href : `${normalized.href}/`)
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Accelerator capability discovery failed with HTTP ${response.status}.`)
  const capabilities = parseCapabilities(await response.json())
  return {
    baseUrl: normalized.href.replace(/\/$/, ''),
    origin: normalized.origin,
    capabilities,
    policyIdentity: policyIdentity(capabilities),
  }
}

export function createReconstructionUploadConsent(
  reference: PreparedReferenceAudio,
  discovered: DiscoveredReconstructionAccelerator,
  now: Date = new Date(),
): ReconstructionUploadConsent {
  if (!reference.contentSha256) throw new Error('Upload consent requires a SHA-256-backed uploaded reference file.')
  const grantedAt = now.toISOString()
  return {
    schema: RECONSTRUCTION_UPLOAD_CONSENT_SCHEMA,
    id: consentId(),
    grantedAt,
    expiresAt: new Date(now.getTime() + RECONSTRUCTION_UPLOAD_CONSENT_LIFETIME_MS).toISOString(),
    endpointOrigin: discovered.origin,
    referenceSha256: reference.contentSha256,
    policyIdentity: discovered.policyIdentity,
    serviceId: discovered.capabilities.serviceId,
    serviceVersion: discovered.capabilities.serviceVersion,
    modelId: discovered.capabilities.model.id,
    modelVersion: discovered.capabilities.model.version,
  }
}

export function isReconstructionUploadConsentValid(
  reference: PreparedReferenceAudio,
  discovered: DiscoveredReconstructionAccelerator,
  consent: ReconstructionUploadConsent | null,
  now: Date = new Date(),
): boolean {
  return Boolean(
    consent
    && consent.schema === RECONSTRUCTION_UPLOAD_CONSENT_SCHEMA
    && !consumedConsentIds.has(consent.id)
    && reference.contentSha256
    && consent.referenceSha256 === reference.contentSha256
    && consent.endpointOrigin === discovered.origin
    && consent.policyIdentity === discovered.policyIdentity
    && consent.serviceId === discovered.capabilities.serviceId
    && consent.serviceVersion === discovered.capabilities.serviceVersion
    && consent.modelId === discovered.capabilities.model.id
    && consent.modelVersion === discovered.capabilities.model.version
    && Date.parse(consent.grantedAt) <= now.getTime()
    && Date.parse(consent.expiresAt) >= now.getTime()
  )
}

export function resolveReconstructionExecutionMode(
  reference: PreparedReferenceAudio,
  discovered: DiscoveredReconstructionAccelerator | null,
  consent: ReconstructionUploadConsent | null,
  now: Date = new Date(),
): ReconstructionExecutionMode {
  if (!discovered || !isReconstructionUploadConsentValid(reference, discovered, consent, now)) return 'local'
  return 'remote'
}

export async function submitReconstructionAcceleration(
  reference: PreparedReferenceAudio,
  discovered: DiscoveredReconstructionAccelerator,
  consent: ReconstructionUploadConsent,
  options: SubmitReconstructionAccelerationOptions = {},
): Promise<ReconstructionAccelerationResult> {
  const now = options.now?.() ?? new Date()
  if (!isReconstructionUploadConsentValid(reference, discovered, consent, now)) {
    throw new Error('A fresh explicit upload consent matching this reference, service policy and model is required.')
  }
  if (!reference.contentSha256 || !reference.filename) throw new Error('Remote acceleration requires an uploaded reference file with filename and SHA-256 metadata.')
  const wav = encodePcm16Wav([reference.samples], reference.sampleRate)
  const acceptedWav = discovered.capabilities.accepts.mimeTypes.some((mime) => mime === 'audio/wav' || mime === 'audio/x-wav')
  if (!acceptedWav) throw new Error('Configured accelerator does not accept WAV reference audio.')
  if (wav.byteLength > discovered.capabilities.accepts.maxBytes) throw new Error('Prepared reference exceeds the accelerator upload-size limit.')

  consumedConsentIds.add(consent.id)
  const metadata = {
    schema: 'fm1-editor.reconstruction-accelerator-request.v1',
    referenceSha256: reference.contentSha256,
    originalFilename: reference.filename,
    selectedRegion: reference.selectedRegion,
    preparedSampleRate: reference.sampleRate,
    preparedDurationSeconds: reference.durationSeconds,
    analysisPitchHz: reference.analysisPitchHz,
    pitchSource: reference.pitchSource,
    consentId: consent.id,
    serviceId: consent.serviceId,
    serviceVersion: consent.serviceVersion,
    modelId: consent.modelId,
    modelVersion: consent.modelVersion,
  }
  const form = new FormData()
  form.set('metadata', JSON.stringify(metadata))
  form.set('reference', new Blob([wav as Uint8Array<ArrayBuffer>], { type: 'audio/wav' }), 'reference.wav')

  const endpoint = `${discovered.baseUrl}/v1/reconstruction/estimate`
  const response = await (options.fetchImpl ?? fetch)(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'X-FM1-Consent-Id': consent.id },
    credentials: 'omit',
    cache: 'no-store',
    body: form,
  })
  if (!response.ok) throw new Error(`Accelerator request failed with HTTP ${response.status}.`)
  return parseResult(await response.json(), discovered, now)
}

export function resetConsumedReconstructionConsentsForTests(): void {
  consumedConsentIds.clear()
}
