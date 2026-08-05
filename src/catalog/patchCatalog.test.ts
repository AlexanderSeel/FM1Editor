import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { encodeVoiceBankMessage } from '../sysex/dx7'
import { buildPatchCatalog, filterPatchCatalog, inspectDx7Bank } from './patchCatalog'
import type { WebsiteCatalogBank } from './yamahaBlackBoxesCatalog'

function createBank(prefix: string): Uint8Array {
  return encodeVoiceBankMessage(
    Array.from({ length: 32 }, (_, index) => createInitializedVoice(`${prefix}${String(index + 1).padStart(2, '0')}`)),
  )
}

const websiteBanks: WebsiteCatalogBank[] = [
  {
    filename: 'rom1a.syx',
    label: 'ROM1A Master',
    category: 'Factory',
    remoteUrl: 'https://example.test/factory/rom1a.syx',
    mirrorPath: 'catalog/example/rom1a.syx',
  },
  {
    filename: 'rom4b.syx',
    label: 'ROM4B Effects',
    category: 'Factory',
    remoteUrl: 'https://example.test/factory/rom4b.syx',
    mirrorPath: 'catalog/example/rom4b.syx',
    voices: ['REMOTE ONE'],
  },
]

describe('patch catalog', () => {
  it('merges a website bank into the preferred archive entry and keeps remote-only banks', () => {
    const bytes = createBank('PATCH')
    const catalog = buildPatchCatalog({
      'sysexFinal/Other/ROM1A.syx': bytes,
      'sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx': bytes,
    }, websiteBanks)

    expect(catalog.stats.archiveFiles).toBe(2)
    expect(catalog.stats.websiteMatchedArchive).toBe(1)
    expect(catalog.stats.websiteOnly).toBe(1)
    expect(catalog.entries.find((entry) => entry.title === 'ROM1A Master')?.archivePath)
      .toBe('0_Original_Yamaha/0_DX7/ROM1A.syx')
    expect(catalog.entries.find((entry) => entry.title === 'ROM4B Effects')?.status).toBe('remote')
  })

  it('reports checksum errors without discarding voice names', () => {
    const bytes = createBank('VOICE')
    bytes[4102] = ((bytes[4102] ?? 0) + 1) & 0x7f
    const inspection = inspectDx7Bank(bytes)
    expect(inspection.status).toBe('checksum-error')
    expect(inspection.voices).toHaveLength(32)
  })

  it('filters by source, availability, voice name and diagnostics', () => {
    const bytes = createBank('BASS')
    const bad = bytes.slice()
    bad[4102] = ((bad[4102] ?? 0) + 1) & 0x7f
    const catalog = buildPatchCatalog({
      'sysexFinal/Factory/ROM1A.syx': bytes,
      'sysexFinal/Broken/BROKEN.syx': bad,
    }, websiteBanks)

    expect(filterPatchCatalog(catalog.entries, {
      query: 'BASS01',
      source: 'all',
      availability: 'all',
      includeDiagnostics: false,
    })).toHaveLength(1)
    expect(filterPatchCatalog(catalog.entries, {
      query: '',
      source: 'all',
      availability: 'all',
      includeDiagnostics: false,
    }).some((entry) => entry.status === 'checksum-error')).toBe(false)
  })
})
