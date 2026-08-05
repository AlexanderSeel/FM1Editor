import { describe, expect, it, vi } from 'vitest'
import { fetchRemoteSysex, validateRemoteSysexUrl } from './remoteSysex'

describe('remote SysEx imports', () => {
  it('accepts only direct HTTPS SysEx URLs', () => {
    expect(validateRemoteSysexUrl('https://example.test/bank.syx').pathname).toBe('/bank.syx')
    expect(() => validateRemoteSysexUrl('http://example.test/bank.syx')).toThrow(/HTTPS/)
    expect(() => validateRemoteSysexUrl('https://example.test/download')).toThrow(/directly/)
  })

  it('rejects oversized responses before parsing', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'content-length': '3000000' },
    }))
    await expect(fetchRemoteSysex('https://example.test/bank.syx', 2_000_000, fetcher)).rejects.toThrow(/safety limit/)
  })
})
