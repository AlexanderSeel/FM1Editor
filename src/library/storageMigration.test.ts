import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
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

  it('creates stable fallback IDs and rejects invalid stored voices', () => {
    const voice = createInitializedVoice('NO ID')
    const migrated = normalizeStoredPatchRecord({ voice }, '2026-08-05T10:00:00.000Z')

    expect(migrated?.id).toBe(`migrated-${fingerprintVoice(voice)}`)
    expect(normalizeStoredPatchRecord({ voice: { name: 'BROKEN' } })).toBeNull()
    expect(normalizeStoredPatchRecord(null)).toBeNull()
  })
})
