import type { Dx7Operator, Dx7Voice } from '../domain/voice'
import { DX7_PACKED_VOICE_LENGTH, decodePackedVoice, encodeSingleVoiceData } from '../sysex/dx7'
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

/**
 * Reconstruct the semantic values produced by the pre-v4 shifted bulk decoder.
 * These values are used only to identify untouched cached fields. If a stored
 * value differs, it is treated as an explicit user edit and preserved.
 */
function legacyPackedOperator(
  packed: Uint8Array,
  operatorIndex: number,
): Pick<
  Dx7Operator,
  | 'amplitudeModulationSensitivity'
  | 'keyVelocitySensitivity'
  | 'outputLevel'
  | 'oscillatorMode'
  | 'frequencyCoarse'
  | 'frequencyFine'
  | 'detune'
> & { rateScaling: number } {
  const offset = (5 - operatorIndex) * 17
  const curvesAndScaling = packed[offset + 11] ?? 0
  const modulationAndVelocity = packed[offset + 12] ?? 0
  const oscillatorAndCoarse = packed[offset + 14] ?? 0

  return {
    rateScaling: (curvesAndScaling >> 4) & 0x07,
    amplitudeModulationSensitivity: modulationAndVelocity & 0x03,
    keyVelocitySensitivity: (modulationAndVelocity >> 2) & 0x07,
    outputLevel: packed[offset + 13] ?? 0,
    oscillatorMode: (oscillatorAndCoarse & 0x01) === 0 ? 'ratio' : 'fixed',
    frequencyCoarse: (oscillatorAndCoarse >> 1) & 0x1f,
    frequencyFine: packed[offset + 15] ?? 0,
    detune: Math.min((packed[offset + 16] ?? 0) & 0x0f, 14),
  }
}

function repair<T>(stored: T, legacy: T, corrected: T): T {
  return Object.is(stored, legacy) ? corrected : stored
}

/**
 * Repair voices cached while the 128-byte Yamaha operator tail was shifted.
 * Raw packed bytes are authoritative, but explicit semantic edits made after
 * import are kept field-by-field instead of being overwritten wholesale.
 */
export function repairLegacyPackedVoice(voice: Dx7Voice): Dx7Voice {
  const packed = voice.source?.packed
  if (!(packed instanceof Uint8Array) || packed.length !== DX7_PACKED_VOICE_LENGTH) return voice

  const corrected = decodePackedVoice(packed)
  const operators = voice.operators.map((operator, operatorIndex) => {
    const legacy = legacyPackedOperator(packed, operatorIndex)
    const fixed = corrected.operators[operatorIndex]
    if (!fixed) return operator

    return {
      ...operator,
      keyboardScaling: {
        ...operator.keyboardScaling,
        rateScaling: repair(
          operator.keyboardScaling.rateScaling,
          legacy.rateScaling,
          fixed.keyboardScaling.rateScaling,
        ),
      },
      amplitudeModulationSensitivity: repair(
        operator.amplitudeModulationSensitivity,
        legacy.amplitudeModulationSensitivity,
        fixed.amplitudeModulationSensitivity,
      ),
      keyVelocitySensitivity: repair(
        operator.keyVelocitySensitivity,
        legacy.keyVelocitySensitivity,
        fixed.keyVelocitySensitivity,
      ),
      outputLevel: repair(operator.outputLevel, legacy.outputLevel, fixed.outputLevel),
      oscillatorMode: repair(operator.oscillatorMode, legacy.oscillatorMode, fixed.oscillatorMode),
      frequencyCoarse: repair(operator.frequencyCoarse, legacy.frequencyCoarse, fixed.frequencyCoarse),
      frequencyFine: repair(operator.frequencyFine, legacy.frequencyFine, fixed.frequencyFine),
      detune: repair(operator.detune, legacy.detune, fixed.detune),
    }
  }) as unknown as Dx7Voice['operators']

  return {
    ...voice,
    operators,
    source: {
      ...voice.source,
      packed: packed.slice(),
    },
  }
}

export function normalizeStoredPatchRecord(
  value: unknown,
  fallbackTimestamp = new Date().toISOString(),
): PatchRecord | null {
  if (!isRecord(value) || !isRecord(value.voice)) return null

  const voice = repairLegacyPackedVoice(value.voice as unknown as Dx7Voice)
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
