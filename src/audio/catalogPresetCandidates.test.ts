import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { encodeVoiceBankMessage } from '../sysex/dx7'
import { collectBundledCatalogPresetCandidates } from './catalogPresetCandidates'

function bank(): Uint8Array {
  return encodeVoiceBankMessage(
    Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`)),
  )
}

describe('bundled catalog preset candidates', () => {
  it('extracts semantic voices only from checksum-valid local catalog files and respects a voice limit', async () => {
    const bytes = bank()
    const entries = [
      { id: 'valid', title: 'Valid bank', filename: 'valid.syx', source: 'archive', status: 'valid' as const, archivePath: 'valid.syx' },
      { id: 'bad', title: 'Bad bank', filename: 'bad.syx', source: 'archive', status: 'checksum-error' as const, archivePath: 'bad.syx' },
      { id: 'remote', title: 'Remote bank', filename: 'remote.syx', source: 'website', status: 'remote' as const, archivePath: null },
    ]
    const files = new Map<string, Uint8Array>([['valid.syx', bytes], ['bad.syx', bytes]])
    const result = await collectBundledCatalogPresetCandidates(entries, files, { maxVoices: 3 })

    expect(result).toHaveLength(3)
    expect(result.map((candidate) => candidate.voice.name)).toEqual(['VOICE 1', 'VOICE 2', 'VOICE 3'])
    expect(result.every((candidate) => candidate.id.startsWith('valid:'))).toBe(true)
    expect(result[0]?.sourceLabel).toContain('valid.syx')
  })

  it('honors cancellation before parsing local catalog data', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(collectBundledCatalogPresetCandidates([], new Map(), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
})
