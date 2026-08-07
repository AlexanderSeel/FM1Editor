import { describe, expect, it } from 'vitest'
import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import { decodePackedVoice, encodePackedVoice } from '../sysex/dx7'
import { fingerprintVoice } from './model'
import { normalizeStoredPatchRecord, repairLegacyPackedVoice } from './storageMigration'

function legacyCorruptFromPacked(voice: Dx7Voice): Dx7Voice {
  const packed = voice.source?.packed
  if (!(packed instanceof Uint8Array)) throw new Error('Test voice has no packed source.')

  const operators = voice.operators.map((operator, operatorIndex) => {
    const offset = (5 - operatorIndex) * 17
    const curvesAndScaling = packed[offset + 11] ?? 0
    const modulationAndVelocity = packed[offset + 12] ?? 0
    const oscillatorAndCoarse = packed[offset + 14] ?? 0

    return {
      ...operator,
      keyboardScaling: {
        ...operator.keyboardScaling,
        rateScaling: (curvesAndScaling >> 4) & 0x07,
      },
      amplitudeModulationSensitivity: modulationAndVelocity & 0x03,
      keyVelocitySensitivity: (modulationAndVelocity >> 2) & 0x07,
      outputLevel: packed[offset + 13] ?? 0,
      oscillatorMode: (oscillatorAndCoarse & 0x01) === 0 ? 'ratio' as const : 'fixed' as const,
      frequencyCoarse: (oscillatorAndCoarse >> 1) & 0x1f,
      frequencyFine: packed[offset + 15] ?? 0,
      detune: Math.min((packed[offset + 16] ?? 0) & 0x0f, 14),
    }
  }) as unknown as Dx7Voice['operators']

  return { ...voice, operators }
}

describe('IndexedDB record migration', () => {
  it('normalizes legacy metadata and recomputes semantic fingerprints', () => {
    const voice = createInitializedVoice('LEGACY PAD')
    const migrated = normalizeStoredPatchRecord({
      id: 'legacy-1',
      fingerprint: 'stale-fingerprint',
      voice,
      tags: [' Pad ', 42, 'bright', 'pad'],
      favorite: 1,
      createdAt: '2026-08-01T08:00:00.000Z',
      origin: {
        kind: 'unknown',
        label: '',
      },
    }, '2026-08-05T10:00:00.000Z')

    expect(migrated).toMatchObject({
      id: 'legacy-1',
      fingerprint: fingerprintVoice(voice),
      tags: ['bright', 'pad'],
      favorite: false,
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
      origin: {
        kind: 'file',
        label: 'Migrated local library',
        importedAt: '2026-08-01T08:00:00.000Z',
      },
    })
  })

  it('repairs every field produced by the shifted pre-v4 packed operator decoder', () => {
    const canonical = createInitializedVoice('CACHED PAD')
    canonical.operators[1] = {
      ...canonical.operators[1],
      keyboardScaling: {
        ...canonical.operators[1].keyboardScaling,
        rateScaling: 6,
      },
      amplitudeModulationSensitivity: 3,
      keyVelocitySensitivity: 5,
      outputLevel: 87,
      oscillatorMode: 'fixed',
      frequencyCoarse: 27,
      frequencyFine: 73,
      detune: 12,
    }

    const packed = encodePackedVoice(canonical)
    const correctlyDecoded = decodePackedVoice(packed)
    const legacy = legacyCorruptFromPacked(correctlyDecoded)
    const repaired = repairLegacyPackedVoice(legacy)

    expect(repaired.operators[1]).toMatchObject({
      keyboardScaling: { rateScaling: 6 },
      amplitudeModulationSensitivity: 3,
      keyVelocitySensitivity: 5,
      outputLevel: 87,
      oscillatorMode: 'fixed',
      frequencyCoarse: 27,
      frequencyFine: 73,
      detune: 12,
    })
    expect(repaired.source?.packed).toEqual(packed)
  })

  it('preserves an explicit semantic edit while repairing untouched legacy fields', () => {
    const canonical = createInitializedVoice('EDIT KEPT')
    canonical.operators[2].outputLevel = 91
    canonical.operators[2].frequencyCoarse = 19

    const legacy = legacyCorruptFromPacked(decodePackedVoice(encodePackedVoice(canonical)))
    const edited: Dx7Voice = {
      ...legacy,
      operators: legacy.operators.map((operator, index) =>
        index === 2 ? { ...operator, outputLevel: 77 } : operator,
      ) as unknown as Dx7Voice['operators'],
    }

    const repaired = repairLegacyPackedVoice(edited)

    expect(repaired.operators[2].outputLevel).toBe(77)
    expect(repaired.operators[2].frequencyCoarse).toBe(19)
  })

  it('creates stable fallback IDs and rejects invalid stored voices', () => {
    const voice = createInitializedVoice('NO ID')
    const migrated = normalizeStoredPatchRecord({ voice }, '2026-08-05T10:00:00.000Z')

    expect(migrated?.id).toBe(`migrated-${fingerprintVoice(voice)}`)
    expect(normalizeStoredPatchRecord({ voice: { name: 'BROKEN' } })).toBeNull()
    expect(normalizeStoredPatchRecord(null)).toBeNull()
  })
})
