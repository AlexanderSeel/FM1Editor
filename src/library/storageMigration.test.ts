import { describe, expect, it } from 'vitest'
import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import { encodePackedVoice } from '../sysex/dx7'
import { fingerprintVoice } from './model'
import { normalizeStoredPatchRecord } from './storageMigration'

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

  it('repairs detune values polluted by packed reserved bits', () => {
    const voice = createInitializedVoice('CACHED PAD')
    const packed = encodePackedVoice(voice)
    packed[4 * 17 + 16] = 0x35
    const operators = voice.operators.map((operator, index) =>
      index === 1 ? { ...operator, detune: 53 } : operator,
    ) as unknown as Dx7Voice['operators']
    const cachedVoice: Dx7Voice = {
      ...voice,
      name: 'EDIT KEPT',
      operators,
      source: { packed },
    }

    const migrated = normalizeStoredPatchRecord({ voice: cachedVoice }, '2026-08-05T10:00:00.000Z')

    expect(migrated?.voice.name).toBe('EDIT KEPT')
    expect(migrated?.voice.operators[1].detune).toBe(5)
    expect(migrated?.voice.source?.packed?.[4 * 17 + 16]).toBe(0x35)
  })

  it('creates stable fallback IDs and rejects invalid stored voices', () => {
    const voice = createInitializedVoice('NO ID')
    const migrated = normalizeStoredPatchRecord({ voice }, '2026-08-05T10:00:00.000Z')

    expect(migrated?.id).toBe(`migrated-${fingerprintVoice(voice)}`)
    expect(normalizeStoredPatchRecord({ voice: { name: 'BROKEN' } })).toBeNull()
    expect(normalizeStoredPatchRecord(null)).toBeNull()
  })
})
