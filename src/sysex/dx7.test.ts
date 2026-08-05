import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  calculateYamahaChecksum,
  decodeSingleVoiceMessage,
  decodeVoiceBankMessage,
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
    expect(decoded.voice.name).toBe('TEST VOIC')
    expect(decoded.voice.algorithm).toBe(1)
    expect(decoded.voice.operators[0].outputLevel).toBe(99)
  })

  it('rejects a modified payload with a stale checksum', () => {
    const message = encodeSingleVoiceMessage(createInitializedVoice())
    message[20] = 42
    expect(() => decodeSingleVoiceMessage(message)).toThrow(/checksum/i)
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
