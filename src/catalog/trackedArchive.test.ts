import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildPatchCatalog } from './patchCatalog'

const ARCHIVE_URL = new URL('../../public/catalog/sysexFinal.zip', import.meta.url)
const EXPECTED_SHA256 = 'fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263'

describe('tracked SysEx archive', () => {
  it('is the exact audited ZIP and indexes all supported banks', () => {
    const buffer = readFileSync(ARCHIVE_URL)
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)

    expect(buffer.byteLength).toBe(2_785_215)
    expect(createHash('sha256').update(buffer).digest('hex')).toBe(EXPECTED_SHA256)
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])

    const catalog = buildPatchCatalog(unzipSync(bytes), [])
    expect(catalog.stats.archiveFiles).toBe(1_304)
    expect(catalog.stats.validBanks).toBe(1_288)
    expect(catalog.stats.diagnosticBanks).toBe(16)
  })
})
