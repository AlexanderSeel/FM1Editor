import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  mergePatchBackupRecords,
  parsePatchLibraryBackup,
  serializePatchLibraryBackup,
} from './backup'
import { createPatchRecord } from './model'

function createRecord(name: string, id: string) {
  return createPatchRecord(createInitializedVoice(name), {
    kind: 'file',
    label: 'Fixture bank',
    importedAt: '2026-08-05T09:00:00.000Z',
    filename: 'fixture.syx',
  }, {
    id,
    now: '2026-08-05T09:00:00.000Z',
    tags: [' Pad ', 'bright', 'pad'],
    favorite: true,
  })
}

describe('patch library backup', () => {
  it('round-trips semantic voices and metadata without codec source buffers', () => {
    const base = createRecord('GLASS PAD', 'patch-1')
    const record = {
      ...base,
      voice: {
        ...base.voice,
        source: {
          packed: new Uint8Array([1, 2, 3]),
          unpacked: new Uint8Array([4, 5, 6]),
        },
      },
    }

    const text = serializePatchLibraryBackup([record], '2026-08-05T10:00:00.000Z')
    const backup = parsePatchLibraryBackup(text)

    expect(backup.exportedAt).toBe('2026-08-05T10:00:00.000Z')
    expect(backup.records).toHaveLength(1)
    expect(backup.records[0]).toMatchObject({
      id: 'patch-1',
      tags: ['bright', 'pad'],
      favorite: true,
      origin: { filename: 'fixture.syx' },
      voice: { name: 'GLASS PAD' },
    })
    expect(backup.records[0]?.voice.source).toBeUndefined()
    expect(text).not.toContain('packed')
    expect(text).not.toContain('unpacked')
  })

  it('skips semantic duplicates and resolves record ID collisions', () => {
    const existing = createRecord('PATCH A', 'shared-id')
    const duplicate = createRecord('PATCH A', 'backup-duplicate')
    const collision = createRecord('PATCH B', 'shared-id')

    const result = mergePatchBackupRecords([existing], [duplicate, collision])

    expect(result.duplicates).toHaveLength(1)
    expect(result.added).toHaveLength(1)
    expect(result.records).toHaveLength(2)
    expect(result.added[0]?.id).not.toBe('shared-id')
    expect(result.added[0]?.voice.name).toBe('PATCH B')
  })

  it('rejects unknown formats, versions and invalid voices', () => {
    expect(() => parsePatchLibraryBackup('{}')).toThrow(/not an FM1 Editor/i)
    expect(() => parsePatchLibraryBackup(JSON.stringify({
      format: 'fm1-editor-patch-library',
      version: 99,
      exportedAt: '2026-08-05T10:00:00.000Z',
      records: [],
    }))).toThrow(/unsupported/i)
    expect(() => parsePatchLibraryBackup(JSON.stringify({
      format: 'fm1-editor-patch-library',
      version: 1,
      exportedAt: '2026-08-05T10:00:00.000Z',
      records: [{ id: 'bad', voice: { name: 'BROKEN' }, origin: {} }],
    }))).toThrow(/invalid DX7 voice/i)
  })
})
