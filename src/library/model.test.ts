import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  countVoiceDifferences,
  filterPatchRecords,
  fingerprintVoice,
  mergeImportedVoices,
  normalizeTags,
} from './model'

describe('patch library model', () => {
  it('fingerprints semantic voice data while ignoring source buffers', () => {
    const voice = createInitializedVoice('BASS ONE')
    const withSource = { ...voice, source: { packed: new Uint8Array([1, 2, 3]) } }
    expect(fingerprintVoice(withSource)).toBe(fingerprintVoice(voice))
  })

  it('deduplicates exact voices across existing records and one import batch', () => {
    const voice = createInitializedVoice('BASS ONE')
    const second = { ...voice, name: 'BASS TWO' }
    const origin = { kind: 'file' as const, label: 'fixture', importedAt: '2026-08-05T08:00:00.000Z', filename: 'bank.syx' }
    const first = mergeImportedVoices([], [voice, voice, second], origin, {
      now: origin.importedAt,
      idFactory: (() => { let value = 0; return () => `id-${value++}` })(),
    })
    expect(first.added).toHaveLength(2)
    expect(first.duplicates).toHaveLength(1)
    expect(first.added[0]?.origin.bankSlot).toBe(1)
  })

  it('normalizes tags and filters by tags, source and favorites', () => {
    const voice = createInitializedVoice('GLASS PAD')
    const origin = { kind: 'file' as const, label: 'Yamaha Black Boxes', importedAt: '2026-08-05T08:00:00.000Z', filename: 'pads.syx' }
    const result = mergeImportedVoices([], [voice], origin, { now: origin.importedAt, idFactory: () => 'id-1' })
    const record = { ...result.added[0]!, tags: normalizeTags([' Pad ', 'bright', 'pad']), favorite: true }
    expect(record.tags).toEqual(['bright', 'pad'])
    expect(filterPatchRecords([record], { query: 'black boxes', favoritesOnly: true })).toHaveLength(1)
    expect(filterPatchRecords([record], { query: 'bass', favoritesOnly: false })).toHaveLength(0)
  })

  it('counts changed semantic parameters', () => {
    const left = createInitializedVoice('INIT VOICE')
    const right = { ...left, feedback: 3, transpose: 12 }
    expect(countVoiceDifferences(left, right)).toBe(2)
  })
})
