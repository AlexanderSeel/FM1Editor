import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  calculateYamahaChecksum,
  decodePackedVoice,
  decodeSingleVoiceMessage,
  decodeVoiceBankMessage,
  encodePackedVoice,
  encodeSingleVoiceMessage,
  encodeVoiceBankMessage,
} from './dx7'
import { extractSysexMessages, importSysexFile } from './importSysex'

describe('Yamaha checksum', () => {
  it('returns the masked two-complement checksum', () => {
    expect(calculateYamahaChecksum(new Uint8Array([1, 2, 3]))).toBe(122)
    expect(calculateYamahaChecksum(new Uint8Array(4096))).toBe(0)
  })
})

describe('DX7 single voice', () => {
  it('round-trips the editable voice model', () => {
    const voice = createInitializedVoice('TEST VOICE')
    const message = encodeSingleVoiceMessage(voice, 3)
    const decoded = decodeSingleVoiceMessage(message)

    expect(message).toHaveLength(163)
    expect(decoded.channel).toBe(3)
    expect(decoded.voice.name).toBe('TEST VOICE')
    expect(decoded.voice.algorithm).toBe(1)
    expect(decoded.voice.operators[0].outputLevel).toBe(99)
  })

  it('rejects a modified payload with a stale checksum', () => {
    const message = encodeSingleVoiceMessage(createInitializedVoice())
    message[20] = 42
    expect(() => decodeSingleVoiceMessage(message)).toThrow(/checksum/i)
  })
})

describe('DX7 packed voice', () => {
  it('masks detune reserved bits and preserves them during re-encoding', () => {
    const packed = encodePackedVoice(createInitializedVoice('RESERVED'))
    const op2DetuneOffset = 4 * 17 + 16
    packed[op2DetuneOffset] = 0x35

    const decoded = decodePackedVoice(packed)
    const reencoded = encodePackedVoice(decoded)

    expect(decoded.operators[1].detune).toBe(5)
    expect(reencoded[op2DetuneOffset]).toBe(0x35)
  })

  it('normalizes reserved detune nibble 15 without blocking bank or single-voice encoding', () => {
    const packed = encodePackedVoice(createInitializedVoice('DETUNE 15'))
    const op6DetuneOffset = 16
    packed[op6DetuneOffset] = 0x3f

    const decoded = decodePackedVoice(packed)
    const reencoded = encodePackedVoice(decoded)

    expect(decoded.operators[5].detune).toBe(14)
    expect(reencoded[op6DetuneOffset]).toBe(0x3e)

    const legacyVoice = createInitializedVoice('LEGACY 15')
    legacyVoice.operators[5].detune = 15
    const legacyPacked = encodePackedVoice(legacyVoice)
    const legacySingle = encodeSingleVoiceMessage(legacyVoice)

    expect((legacyPacked[op6DetuneOffset] ?? 0) & 0x0f).toBe(14)
    expect(decodeSingleVoiceMessage(legacySingle).voice.operators[5].detune).toBe(14)
  })

it('normalizes reserved breakpoint value 127 without blocking voice or bank encoding', () => {
  const packed = encodePackedVoice(createInitializedVoice('BREAK 127'))
  const op2BreakpointOffset = 4 * 17 + 8
  packed[op2BreakpointOffset] = 127

  const decoded = decodePackedVoice(packed)
  const reencoded = encodePackedVoice(decoded)

  expect(decoded.operators[1].keyboardScaling.breakPoint).toBe(99)
  expect(reencoded[op2BreakpointOffset]).toBe(99)

  const legacyVoice = createInitializedVoice('LEGACY BP')
  legacyVoice.operators[1].keyboardScaling.breakPoint = 127
  const legacySingle = encodeSingleVoiceMessage(legacyVoice)
  expect(decodeSingleVoiceMessage(legacySingle).voice.operators[1].keyboardScaling.breakPoint).toBe(99)

  const voices = Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`))
  const bankVoice = voices[3]
  if (!bankVoice) throw new Error('Missing test bank voice.')
  bankVoice.operators[1].keyboardScaling.breakPoint = 127
  const bankMessage = encodeVoiceBankMessage(voices)
  expect(decodeVoiceBankMessage(bankMessage).voices[3]?.operators[1].keyboardScaling.breakPoint).toBe(99)
})

})

describe('DX7 bank', () => {
  it('encodes and decodes 32 packed voices', () => {
    const voices = Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`))
    const message = encodeVoiceBankMessage(voices, 1)
    const decoded = decodeVoiceBankMessage(message)

    expect(message).toHaveLength(4104)
    expect(decoded.channel).toBe(1)
    expect(decoded.voices).toHaveLength(32)
    expect(decoded.voices[0]?.name).toBe('VOICE 1')
    expect(decoded.voices[31]?.name).toBe('VOICE 32')
  })

  it('encodes a complete bank containing a legacy detune value 15', () => {
    const voices = Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`))
    const legacyVoice = voices[7]
    if (!legacyVoice) throw new Error('Missing test voice.')
    legacyVoice.operators[5].detune = 15

    const message = encodeVoiceBankMessage(voices)
    const decoded = decodeVoiceBankMessage(message)

    expect(message).toHaveLength(4104)
    expect(decoded.voices[7]?.operators[5].detune).toBe(14)
  })
})

describe('SysEx file import', () => {
  it('extracts multiple messages and classifies known DX7 formats', () => {
    const single = encodeSingleVoiceMessage(createInitializedVoice('ONE'))
    const bank = encodeVoiceBankMessage(Array.from({ length: 32 }, () => createInitializedVoice('BANK')))
    const file = new Uint8Array(single.length + 3 + bank.length)
    file.set(single, 0)
    file.set([0, 1, 2], single.length)
    file.set(bank, single.length + 3)

    expect(extractSysexMessages(file)).toHaveLength(2)
    expect(importSysexFile(file).map((entry) => entry.kind)).toEqual(['single-voice', 'voice-bank'])
  })
})
