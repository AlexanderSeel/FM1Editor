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
  it('uses Yamaha bulk bytes 11..16 for curves, detune/rate, KVS/AMS, output, mode/coarse and fine', () => {
    const voice = createInitializedVoice('YAMAHA MAP')
    const operator = voice.operators[1]
    operator.keyboardScaling.rateScaling = 6
    operator.keyboardScaling.leftCurve = 'positive-linear'
    operator.keyboardScaling.rightCurve = 'negative-exponential'
    operator.amplitudeModulationSensitivity = 3
    operator.keyVelocitySensitivity = 5
    operator.outputLevel = 87
    operator.oscillatorMode = 'fixed'
    operator.frequencyCoarse = 27
    operator.frequencyFine = 73
    operator.detune = 12

    const packed = encodePackedVoice(voice)
    const offset = 4 * 17

    expect((packed[offset + 11] ?? 0) & 0x0f).toBe(0x07)
    expect(packed[offset + 12]).toBe((12 << 3) | 6)
    expect((packed[offset + 13] ?? 0) & 0x1f).toBe(3 | (5 << 2))
    expect(packed[offset + 14]).toBe(87)
    expect((packed[offset + 15] ?? 0) & 0x3f).toBe(1 | (27 << 1))
    expect(packed[offset + 16]).toBe(73)

    const decoded = decodePackedVoice(packed).operators[1]
    expect(decoded.keyboardScaling.rateScaling).toBe(6)
    expect(decoded.amplitudeModulationSensitivity).toBe(3)
    expect(decoded.keyVelocitySensitivity).toBe(5)
    expect(decoded.outputLevel).toBe(87)
    expect(decoded.oscillatorMode).toBe('fixed')
    expect(decoded.frequencyCoarse).toBe(27)
    expect(decoded.frequencyFine).toBe(73)
    expect(decoded.detune).toBe(12)
  })

  it('normalizes reserved detune nibble 15 without corrupting rate scaling', () => {
    const packed = encodePackedVoice(createInitializedVoice('DETUNE 15'))
    packed[12] = (15 << 3) | 5

    const decoded = decodePackedVoice(packed)
    const reencoded = encodePackedVoice(decoded)

    expect(decoded.operators[5].detune).toBe(14)
    expect(decoded.operators[5].keyboardScaling.rateScaling).toBe(5)
    expect(reencoded[12]).toBe((14 << 3) | 5)

    const invalidVoice = createInitializedVoice('INVALID 15')
    invalidVoice.operators[5].detune = 15
    expect(() => encodePackedVoice(invalidVoice)).toThrow(/detune.*0 to 14/i)
    expect(() => encodeSingleVoiceMessage(invalidVoice)).toThrow(/detune.*0 to 14/i)
  })

  it('normalizes reserved breakpoint value 127 at the raw import boundary and rejects it in the voice model', () => {
    const packed = encodePackedVoice(createInitializedVoice('BREAK 127'))
    const op2BreakpointOffset = 4 * 17 + 8
    packed[op2BreakpointOffset] = 127

    const decoded = decodePackedVoice(packed)
    const reencoded = encodePackedVoice(decoded)

    expect(decoded.operators[1].keyboardScaling.breakPoint).toBe(99)
    expect(reencoded[op2BreakpointOffset]).toBe(99)

    const invalidVoice = createInitializedVoice('INVALID BP')
    invalidVoice.operators[1].keyboardScaling.breakPoint = 127
    expect(() => encodePackedVoice(invalidVoice)).toThrow(/breakpoint.*0 to 99/i)
    expect(() => encodeSingleVoiceMessage(invalidVoice)).toThrow(/breakpoint.*0 to 99/i)

    const voices = Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`))
    const bankVoice = voices[3]
    if (!bankVoice) throw new Error('Missing test bank voice.')
    bankVoice.operators[1].keyboardScaling.breakPoint = 127
    expect(() => encodeVoiceBankMessage(voices)).toThrow(/breakpoint.*0 to 99/i)
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

  it('rejects a bank containing a reserved detune value 15', () => {
    const voices = Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`))
    const invalidVoice = voices[7]
    if (!invalidVoice) throw new Error('Missing test voice.')
    invalidVoice.operators[5].detune = 15

    expect(() => encodeVoiceBankMessage(voices)).toThrow(/detune.*0 to 14/i)
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
