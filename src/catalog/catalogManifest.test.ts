import { describe, expect, it } from 'vitest'
import { websiteBanksFromManifest } from './catalogManifest'

const manifest = {
  version: 1,
  website: {
    pageUrl: 'https://example.test/patches',
    discoveredFiles: 2,
    files: [
      {
        filename: 'rom1a.syx',
        sourceUrl: 'https://example.test/patches/dx7/factory/rom1a.syx',
        assetPath: 'catalog/yamaha-black-boxes/factory/rom1a.syx',
        size: 4104,
        sha256: 'a'.repeat(64),
      },
      {
        filename: 'new-bank.syx',
        sourceUrl: 'https://example.test/patches/dx7/community/new-bank.syx',
        assetPath: 'catalog/yamaha-black-boxes/community/new-bank.syx',
        size: 4104,
        sha256: 'b'.repeat(64),
      },
    ],
  },
}

describe('website catalog manifest', () => {
  it('applies known metadata and derives newly discovered entries', () => {
    const banks = websiteBanksFromManifest(manifest)
    expect(banks).toHaveLength(2)
    expect(banks.find((bank) => bank.filename === 'rom1a.syx')?.label).toContain('ROM1A')
    expect(banks.find((bank) => bank.filename === 'new-bank.syx')).toMatchObject({
      label: 'New Bank',
      category: 'Community',
      mirrorPath: 'catalog/yamaha-black-boxes/community/new-bank.syx',
    })
  })

  it('rejects manifests without usable SysEx files', () => {
    expect(() => websiteBanksFromManifest({
      version: 1,
      website: { pageUrl: 'https://example.test', discoveredFiles: 1, files: [{ ...manifest.website.files[0], filename: 'notes.txt' }] },
    })).toThrow(/no usable SysEx files/)
  })
})
