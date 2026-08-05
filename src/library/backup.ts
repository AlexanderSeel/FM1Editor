import type { Dx7Voice, FourValues } from '../domain/voice'
import { encodeSingleVoiceData } from '../sysex/dx7'
import {
  fingerprintVoice,
  normalizeTags,
  type PatchOrigin,
  type PatchOriginKind,
  type PatchRecord,
} from './model'

export const PATCH_LIBRARY_BACKUP_FORMAT = 'fm1-editor-patch-library'
export const PATCH_LIBRARY_BACKUP_VERSION = 1

export interface PatchLibraryBackup {
  format: typeof PATCH_LIBRARY_BACKUP_FORMAT
  version: typeof PATCH_LIBRARY_BACKUP_VERSION
  exportedAt: string
  records: readonly PatchRecord[]
}

export interface PatchBackupMergeResult {
  records: readonly PatchRecord[]
  added: readonly PatchRecord[]
  duplicates: readonly PatchRecord[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function cloneFour(values: FourValues): FourValues {
  return [values[0], values[1], values[2], values[3]]
}

export function toPortableVoice(voice: Dx7Voice): Dx7Voice {
  const operators = voice.operators.map((operator) => ({
    envelope: {
      rates: cloneFour(operator.envelope.rates),
      levels: cloneFour(operator.envelope.levels),
    },
    keyboardScaling: { ...operator.keyboardScaling },
    amplitudeModulationSensitivity: operator.amplitudeModulationSensitivity,
    keyVelocitySensitivity: operator.keyVelocitySensitivity,
    outputLevel: operator.outputLevel,
    oscillatorMode: operator.oscillatorMode,
    frequencyCoarse: operator.frequencyCoarse,
    frequencyFine: operator.frequencyFine,
    detune: operator.detune,
  })) as unknown as Dx7Voice['operators']

  return {
    name: voice.name,
    operators,
    pitchEnvelope: {
      rates: cloneFour(voice.pitchEnvelope.rates),
      levels: cloneFour(voice.pitchEnvelope.levels),
    },
    algorithm: voice.algorithm,
    feedback: voice.feedback,
    oscillatorKeySync: voice.oscillatorKeySync,
    lfo: { ...voice.lfo },
    transpose: voice.transpose,
  }
}

function parseOrigin(value: unknown, index: number): PatchOrigin {
  if (!isRecord(value)) throw new Error(`Backup record ${index + 1} has no valid origin.`)
  const validKinds: readonly PatchOriginKind[] = ['editor', 'file', 'external-catalog']
  if (!validKinds.includes(value.kind as PatchOriginKind)) {
    throw new Error(`Backup record ${index + 1} has an unsupported origin kind.`)
  }
  if (typeof value.label !== 'string' || typeof value.importedAt !== 'string') {
    throw new Error(`Backup record ${index + 1} has incomplete origin metadata.`)
  }

  return {
    kind: value.kind as PatchOriginKind,
    label: value.label,
    importedAt: value.importedAt,
    ...(typeof value.filename === 'string' ? { filename: value.filename } : {}),
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
    ...(typeof value.license === 'string' ? { license: value.license } : {}),
    ...(typeof value.bankSlot === 'number' && Number.isInteger(value.bankSlot) ? { bankSlot: value.bankSlot } : {}),
  }
}

function parseRecord(value: unknown, index: number, exportedAt: string): PatchRecord {
  if (!isRecord(value)) throw new Error(`Backup record ${index + 1} is not an object.`)
  if (!isRecord(value.voice)) throw new Error(`Backup record ${index + 1} has no valid voice.`)

  let voice: Dx7Voice
  try {
    voice = toPortableVoice(value.voice as unknown as Dx7Voice)
    encodeSingleVoiceData(voice)
  } catch (cause) {
    throw new Error(`Backup record ${index + 1} contains an invalid DX7 voice: ${cause instanceof Error ? cause.message : 'validation failed'}.`)
  }

  const tags = Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === 'string')
    ? normalizeTags(value.tags)
    : []
  const fingerprint = fingerprintVoice(voice)
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : exportedAt
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : createdAt
  const candidateId = typeof value.id === 'string' && value.id.trim().length > 0
    ? value.id
    : `backup-${fingerprint}`

  return {
    id: candidateId,
    fingerprint,
    voice,
    tags,
    favorite: value.favorite === true,
    createdAt,
    updatedAt,
    origin: parseOrigin(value.origin, index),
  }
}

function uniqueRecordId(candidate: string, fingerprint: string, usedIds: Set<string>): string {
  if (!usedIds.has(candidate)) return candidate
  const base = `${candidate}-${fingerprint.slice(-8)}`
  if (!usedIds.has(base)) return base
  let suffix = 2
  while (usedIds.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function mergePatchBackupRecords(
  existing: readonly PatchRecord[],
  incoming: readonly PatchRecord[],
): PatchBackupMergeResult {
  const records = [...existing]
  const added: PatchRecord[] = []
  const duplicates: PatchRecord[] = []
  const byFingerprint = new Map(existing.map((record) => [record.fingerprint, record]))
  const usedIds = new Set(existing.map((record) => record.id))

  for (const candidate of incoming) {
    const duplicate = byFingerprint.get(candidate.fingerprint)
    if (duplicate) {
      duplicates.push(duplicate)
      continue
    }
    const id = uniqueRecordId(candidate.id, candidate.fingerprint, usedIds)
    const record = id === candidate.id ? candidate : { ...candidate, id }
    records.push(record)
    added.push(record)
    usedIds.add(id)
    byFingerprint.set(record.fingerprint, record)
  }

  return {
    records: records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    added,
    duplicates,
  }
}

export function createPatchLibraryBackup(
  records: readonly PatchRecord[],
  exportedAt = new Date().toISOString(),
): PatchLibraryBackup {
  return {
    format: PATCH_LIBRARY_BACKUP_FORMAT,
    version: PATCH_LIBRARY_BACKUP_VERSION,
    exportedAt,
    records: records.map((record) => ({ ...record, voice: toPortableVoice(record.voice) })),
  }
}

export function serializePatchLibraryBackup(
  records: readonly PatchRecord[],
  exportedAt = new Date().toISOString(),
): string {
  return `${JSON.stringify(createPatchLibraryBackup(records, exportedAt), null, 2)}\n`
}

export function parsePatchLibraryBackup(text: string): PatchLibraryBackup {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('The patch library backup is not valid JSON.')
  }
  if (!isRecord(value) || value.format !== PATCH_LIBRARY_BACKUP_FORMAT) {
    throw new Error('The file is not an FM1 Editor patch library backup.')
  }
  if (value.version !== PATCH_LIBRARY_BACKUP_VERSION) {
    throw new Error(`Unsupported patch library backup version ${String(value.version)}.`)
  }
  if (typeof value.exportedAt !== 'string' || !Array.isArray(value.records)) {
    throw new Error('The patch library backup is missing required metadata.')
  }

  const parsed = value.records.map((record, index) => parseRecord(record, index, value.exportedAt))
  const deduplicated = mergePatchBackupRecords([], parsed)
  return {
    format: PATCH_LIBRARY_BACKUP_FORMAT,
    version: PATCH_LIBRARY_BACKUP_VERSION,
    exportedAt: value.exportedAt,
    records: deduplicated.records,
  }
}
