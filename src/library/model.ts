import type { Dx7Voice } from '../domain/voice'

export type PatchOriginKind = 'editor' | 'file' | 'external-catalog'

export interface PatchOrigin {
  kind: PatchOriginKind
  label: string
  importedAt: string
  filename?: string
  url?: string
  license?: string
  bankSlot?: number
}

export interface PatchRecord {
  id: string
  fingerprint: string
  voice: Dx7Voice
  tags: readonly string[]
  favorite: boolean
  createdAt: string
  updatedAt: string
  origin: PatchOrigin
}

export interface PatchFilter {
  query: string
  favoritesOnly: boolean
}

export interface PatchImportResult {
  records: readonly PatchRecord[]
  added: readonly PatchRecord[]
  duplicates: readonly PatchRecord[]
}

function canonicalVoice(voice: Dx7Voice): unknown {
  return {
    name: voice.name,
    operators: voice.operators.map((operator) => ({
      envelope: {
        rates: [...operator.envelope.rates],
        levels: [...operator.envelope.levels],
      },
      keyboardScaling: { ...operator.keyboardScaling },
      amplitudeModulationSensitivity: operator.amplitudeModulationSensitivity,
      keyVelocitySensitivity: operator.keyVelocitySensitivity,
      outputLevel: operator.outputLevel,
      oscillatorMode: operator.oscillatorMode,
      frequencyCoarse: operator.frequencyCoarse,
      frequencyFine: operator.frequencyFine,
      detune: operator.detune,
    })),
    pitchEnvelope: {
      rates: [...voice.pitchEnvelope.rates],
      levels: [...voice.pitchEnvelope.levels],
    },
    algorithm: voice.algorithm,
    feedback: voice.feedback,
    oscillatorKeySync: voice.oscillatorKeySync,
    lfo: { ...voice.lfo },
    transpose: voice.transpose,
  }
}

function fnv1a64(text: string): string {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte)
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

export function fingerprintVoice(voice: Dx7Voice): string {
  return `dx7-${fnv1a64(JSON.stringify(canonicalVoice(voice)))}`
}

export function normalizeTags(tags: readonly string[]): readonly string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)),
  ).sort((left, right) => left.localeCompare(right))
}

export function parseTags(value: string): readonly string[] {
  return normalizeTags(value.split(','))
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `patch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createPatchRecord(
  voice: Dx7Voice,
  origin: PatchOrigin,
  options: { id?: string; now?: string; tags?: readonly string[]; favorite?: boolean } = {},
): PatchRecord {
  const now = options.now ?? new Date().toISOString()
  return {
    id: options.id ?? createId(),
    fingerprint: fingerprintVoice(voice),
    voice,
    tags: normalizeTags(options.tags ?? []),
    favorite: options.favorite ?? false,
    createdAt: now,
    updatedAt: now,
    origin,
  }
}

export function mergeImportedVoices(
  existing: readonly PatchRecord[],
  voices: readonly Dx7Voice[],
  origin: Omit<PatchOrigin, 'bankSlot'>,
  options: { now?: string; idFactory?: () => string } = {},
): PatchImportResult {
  const now = options.now ?? new Date().toISOString()
  const idFactory = options.idFactory ?? createId
  const next = [...existing]
  const byFingerprint = new Map(existing.map((record) => [record.fingerprint, record]))
  const added: PatchRecord[] = []
  const duplicates: PatchRecord[] = []

  voices.forEach((voice, index) => {
    const fingerprint = fingerprintVoice(voice)
    const duplicate = byFingerprint.get(fingerprint)
    if (duplicate) {
      duplicates.push(duplicate)
      return
    }

    const patchOrigin: PatchOrigin = voices.length > 1
      ? { ...origin, bankSlot: index + 1 }
      : origin
    const record = createPatchRecord(voice, patchOrigin, { id: idFactory(), now })
    byFingerprint.set(fingerprint, record)
    next.push(record)
    added.push(record)
  })

  return {
    records: next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    added,
    duplicates,
  }
}

export function filterPatchRecords(
  records: readonly PatchRecord[],
  filter: PatchFilter,
): readonly PatchRecord[] {
  const query = filter.query.trim().toLowerCase()
  return records.filter((record) => {
    if (filter.favoritesOnly && !record.favorite) return false
    if (!query) return true
    const haystack = [
      record.voice.name,
      record.origin.label,
      record.origin.filename ?? '',
      record.origin.license ?? '',
      ...record.tags,
    ].join(' ').toLowerCase()
    return haystack.includes(query)
  })
}

function countDifferences(left: unknown, right: unknown): number {
  if (Object.is(left, right)) return 0
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length)
    let differences = 0
    for (let index = 0; index < length; index += 1) {
      differences += countDifferences(left[index], right[index])
    }
    return differences
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>
    const rightRecord = right as Record<string, unknown>
    const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])
    let differences = 0
    for (const key of keys) differences += countDifferences(leftRecord[key], rightRecord[key])
    return differences
  }
  return 1
}

export function countVoiceDifferences(left: Dx7Voice, right: Dx7Voice): number {
  return countDifferences(canonicalVoice(left), canonicalVoice(right))
}

export function updatePatchMetadata(
  record: PatchRecord,
  changes: { tags?: readonly string[]; favorite?: boolean },
  now = new Date().toISOString(),
): PatchRecord {
  return {
    ...record,
    ...(changes.tags ? { tags: normalizeTags(changes.tags) } : {}),
    ...(changes.favorite !== undefined ? { favorite: changes.favorite } : {}),
    updatedAt: now,
  }
}
