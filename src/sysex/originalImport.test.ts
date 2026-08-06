import { describe, expect, it } from 'vitest'
import { preserveOriginalSysexFile } from './originalImport'

describe('original SysEx preservation', () => {
  it('keeps an independent byte-for-byte copy with the original filename', () => {
    const source = Uint8Array.of(0xf0, 0x43, 0x00, 0xf7, 0x7f)
    const preserved = preserveOriginalSysexFile('legacy-bank.syx', source)

    source[1] = 0

    expect(preserved.filename).toBe('legacy-bank.syx')
    expect(Array.from(preserved.bytes)).toEqual([0xf0, 0x43, 0x00, 0xf7, 0x7f])
  })

  it('uses a stable fallback filename without altering bytes', () => {
    const preserved = preserveOriginalSysexFile('   ', Uint8Array.of(1, 2, 3))

    expect(preserved.filename).toBe('imported-original.syx')
    expect(Array.from(preserved.bytes)).toEqual([1, 2, 3])
  })
})
