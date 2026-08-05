import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { encodeVoiceBankMessage } from '../sysex/dx7'
import { assertStandardDx7Bank } from './catalogSysexValidation'

function createBank(): Uint8Array {
  return encodeVoiceBankMessage(Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`)))
}

describe('catalog SysEx validation', () => {
  it('accepts a checksum-valid standard DX7 bank', () => {
    expect(() => assertStandardDx7Bank(createBank())).not.toThrow()
  })

  it('rejects an HTML response saved with a .syx filename', () => {
    const html = new TextEncoder().encode('<!doctype html><html><body>Not found</body></html>')
    expect(() => assertStandardDx7Bank(html, 'Downloaded bank')).toThrow(/HTML or JSON/i)
  })

  it('rejects a truncated bank', () => {
    expect(() => assertStandardDx7Bank(createBank().slice(0, 4084))).toThrow(/4104/)
  })

  it('rejects a stale checksum', () => {
    const bank = createBank()
    bank[100] = ((bank[100] ?? 0) + 1) & 0x7f
    expect(() => assertStandardDx7Bank(bank)).toThrow(/checksum/i)
  })
})
