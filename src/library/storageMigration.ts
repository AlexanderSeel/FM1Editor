import type { Dx7Voice } from '../domain/voice'
import { DX7_PACKED_VOICE_LENGTH, encodeSingleVoiceData } from '../sysex/dx7'
import {
  fingerprintVoice,
  normalizeTags,
  type PatchOrigin,
  type PatchOriginKind,
  type PatchRecord,
} from './model'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeOrigin(
  value: unknown,
  fallbackTimestamp: string,
): PatchOrigin {
  if (!isRecord(value)) {
    return {
      kind: 'file',
      label: 'Migrated local library',
      importedAt: fallbackTimestamp,
    }
  }

  const validKinds: readonly PatchOriginKind[] = ['editor', 'file', 'external-catalog']
  const kind = validKinds.includes(value.kind as PatchOriginKind)
    ? value.kind as PatchOriginKind
    : 'file'

  return {
    kind,
    label: typeof value.label === 'string' && value.label.trim().length > 0
      ? value.label
      : 'Migrated local library',
    importedAt: typeof value.importedAt === 'string'
      ? value.importedAt
      : fallbackTimestamp,
    ...(typeof value.filename === 'string' ? { filename: value.filename } : {}),
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
    ...(typeof value.license === 'string' ? { license: value.license } : {}),
    ...(typeof value.bankSlot === 'number' && Number.isInteger(value.bankSlot)
      ? { bankSlot: value.bankSlot }
      : {}),
  }
}

function repairPackedDetuneValues(voice: Dx7Voice): Dx7Voice {
  const packed = voice.source?.packed
  if (!(packed instanceof Uint8Array) || packed.length !== DX7_PACKED_VOICE_LENGTH) return voice
  if (!voice.operators.some((operator) => operator.detune > 14)) return voice

  const operators = voice.operators.map((operator, operatorIndex) => {
    if (operator.detune <= 14) return operator
    const packedBlock = 5 - operatorIndex
    const packedDetune = packed[packedBlock * 17 + 16]
    if (packedDetune === undefined) return operator
    return { ...operator, detune: packedDetune & 0x0f }
  }) as unknown as Dx7Voice['operators']

  return { ...voice, operators }
}

export function normalizeStoredPatchRecord(
  value: unknown,
  fallbackTimestamp = new Date().toISOString(),
): PatchRecord | null {
  if (!isRecord(value) || !isRecord(value.voice)) return null

  const voice = repairPackedDetuneValues(value.voice as unknown as Dx7Voice)
  try {
    encodeSingleVoiceData(voice)
  } catch {
    return null
  }

  const fingerprint = fingerprintVoice(voice)
  const createdAt = typeof value.createdAt === 'string'
    ? value.createdAt
    : fallbackTimestamp
  const updatedAt = typeof value.updatedAt === 'string'
    ? value.updatedAt
    : createdAt
  const rawTags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string')
    : []

  return {
    id: typeof value.id === 'string' && value.id.trim().length > 0
      ? value.id
      : `migrated-${fingerprint}`,
    fingerprint,
    voice,
    tags: normalizeTags(rawTags),
    favorite: value.favorite === true,
    createdAt,
    updatedAt,
    origin: normalizeOrigin(value.origin, createdAt),
  }
}
