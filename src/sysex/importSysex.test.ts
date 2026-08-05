import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { encodeSingleVoiceMessage, encodeVoiceBankMessage } from './dx7'
import { analyzeSysexFile, importSysexFile } from './importSysex'

function concatenate(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

describe('structured SysEx diagnostics', () => {
  it('imports valid messages while reporting padding, unsupported data and checksum errors', () => {
    const single = encodeSingleVoiceMessage(createInitializedVoice('VALID'))
    const unsupported = Uint8Array.of(0xf0, 0x7d, 0x01, 0x02, 0xf7)
    const staleBank = encodeVoiceBankMessage(Array.from({ length: 32 }, () => createInitializedVoice('BANK')))
    staleBank[20] = ((staleBank[20] ?? 0) + 1) & 0x7f
    const file = concatenate(Uint8Array.of(0x00, 0x01), single, Uint8Array.of(0x02), unsupported, staleBank)

    const report = analyzeSysexFile(file)

    expect(report.completeMessageCount).toBe(3)
    expect(report.supportedMessageCount).toBe(1)
    expect(report.ignoredByteCount).toBe(3)
    expect(report.entries.map((entry) => entry.kind)).toEqual(['single-voice', 'unsupported', 'unsupported'])
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'ignored-bytes',
      'unsupported-message',
      'decode-error',
    ])
    expect(report.diagnostics.find((diagnostic) => diagnostic.code === 'decode-error')?.message).toMatch(/checksum/i)
  })

  it('reports a trailing incomplete message while preserving earlier complete entries', () => {
    const single = encodeSingleVoiceMessage(createInitializedVoice('COMPLETE'))
    const file = concatenate(single, Uint8Array.of(0xf0, 0x43, 0x00))

    const report = analyzeSysexFile(file)

    expect(report.entries).toHaveLength(1)
    expect(report.diagnostics).toContainEqual(expect.objectContaining({
      code: 'incomplete-message',
      severity: 'error',
      offset: single.length,
    }))
    expect(() => importSysexFile(file)).toThrow(/ends inside a SysEx message/i)
  })
})
