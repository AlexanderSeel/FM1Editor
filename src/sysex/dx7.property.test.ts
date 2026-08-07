import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import type { Dx7Curve, Dx7LfoWaveform, Dx7Voice, FourValues } from '../domain/voice'
import {
  calculateYamahaChecksum,
  decodePackedVoice,
  decodeSingleVoiceMessage,
  decodeVoiceBankMessage,
  encodePackedVoice,
  encodeSingleVoiceMessage,
  encodeVoiceBankMessage,
} from './dx7'

const curves: readonly Dx7Curve[] = [
  'negative-linear',
  'negative-exponential',
  'positive-exponential',
  'positive-linear',
]

const waveforms: readonly Dx7LfoWaveform[] = [
  'triangle',
  'saw-down',
  'saw-up',
  'square',
  'sine',
  'sample-and-hold',
]

const RANGE_STEP = 37
const SALT_STEP = 17
const GENERATED_CASE_COUNT = 100

function generatedValue(caseIndex: number, maximum: number, salt: number): number {
  return (caseIndex * RANGE_STEP + salt * SALT_STEP) % (maximum + 1)
}

function generatedFour(caseIndex: number, salt: number): FourValues {
  return [
    generatedValue(caseIndex, 99, salt),
    generatedValue(caseIndex, 99, salt + 1),
    generatedValue(caseIndex, 99, salt + 2),
    generatedValue(caseIndex, 99, salt + 3),
  ]
}

function pick<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length]
  if (value === undefined) throw new Error('Generated property source is empty.')
  return value
}

function createGeneratedVoice(caseIndex: number): Dx7Voice {
  const voice = createInitializedVoice(`P${String(caseIndex).padStart(9, '0')}`)

  voice.operators.forEach((operator, operatorIndex) => {
    const salt = operatorIndex * 29
    operator.envelope = {
      rates: generatedFour(caseIndex, salt),
      levels: generatedFour(caseIndex, salt + 4),
    }
    operator.keyboardScaling = {
      breakPoint: generatedValue(caseIndex, 99, salt + 8),
      leftDepth: generatedValue(caseIndex, 99, salt + 9),
      rightDepth: generatedValue(caseIndex, 99, salt + 10),
      leftCurve: pick(curves, generatedValue(caseIndex, curves.length - 1, salt + 11)),
      rightCurve: pick(curves, generatedValue(caseIndex, curves.length - 1, salt + 12)),
      rateScaling: generatedValue(caseIndex, 7, salt + 13),
    }
    operator.amplitudeModulationSensitivity = generatedValue(caseIndex, 3, salt + 14)
    operator.keyVelocitySensitivity = generatedValue(caseIndex, 7, salt + 15)
    operator.outputLevel = generatedValue(caseIndex, 99, salt + 16)
    operator.oscillatorMode = generatedValue(caseIndex, 1, salt + 17) === 0 ? 'ratio' : 'fixed'
    operator.frequencyCoarse = generatedValue(caseIndex, 31, salt + 18)
    operator.frequencyFine = generatedValue(caseIndex, 99, salt + 19)
    operator.detune = generatedValue(caseIndex, 14, salt + 20)
  })

  voice.pitchEnvelope = {
    rates: generatedFour(caseIndex, 181),
    levels: generatedFour(caseIndex, 185),
  }
  voice.algorithm = generatedValue(caseIndex, 31, 189) + 1
  voice.feedback = generatedValue(caseIndex, 7, 190)
  voice.oscillatorKeySync = generatedValue(caseIndex, 1, 191) === 1
  voice.lfo = {
    speed: generatedValue(caseIndex, 99, 192),
    delay: generatedValue(caseIndex, 99, 193),
    pitchModulationDepth: generatedValue(caseIndex, 99, 194),
    amplitudeModulationDepth: generatedValue(caseIndex, 99, 195),
    keySync: generatedValue(caseIndex, 1, 196) === 1,
    waveform: pick(waveforms, generatedValue(caseIndex, waveforms.length - 1, 197)),
    pitchModulationSensitivity: generatedValue(caseIndex, 7, 198),
  }
  voice.transpose = generatedValue(caseIndex, 48, 199)

  return voice
}

function expectSevenBitData(data: Uint8Array): void {
  expect(Array.from(data).every((value) => value <= 0x7f)).toBe(true)
}

describe('DX7 generated codec properties', () => {
  it('covers every value in each declared numeric range family', () => {
    for (const maximum of [99, 48, 31, 14, 7, 5, 3, 1]) {
      const generated = new Set(
        Array.from({ length: maximum + 1 }, (_, caseIndex) => generatedValue(caseIndex, maximum, 0)),
      )
      expect(generated).toEqual(new Set(Array.from({ length: maximum + 1 }, (_, value) => value)))
    }
  })

  it('round-trips generated voices through all valid single-message channels', () => {
    for (let caseIndex = 0; caseIndex < GENERATED_CASE_COUNT; caseIndex += 1) {
      const voice = createGeneratedVoice(caseIndex)
      const channel = caseIndex % 16
      const message = encodeSingleVoiceMessage(voice, channel)
      const payload = message.slice(6, 161)

      expectSevenBitData(payload)
      expect(message[161]).toBe(calculateYamahaChecksum(payload))

      const decoded = decodeSingleVoiceMessage(message)
      expect(decoded.channel).toBe(channel)
      expect(decoded.voice).toMatchObject(voice)
      expect(encodeSingleVoiceMessage(decoded.voice, channel)).toEqual(message)
    }
  })

  it('round-trips generated packed voices byte-for-byte', () => {
    for (let caseIndex = 0; caseIndex < GENERATED_CASE_COUNT; caseIndex += 1) {
      const voice = createGeneratedVoice(caseIndex)
      const packed = encodePackedVoice(voice)

      expectSevenBitData(packed)

      const decoded = decodePackedVoice(packed)
      expect(decoded).toMatchObject(voice)
      expect(encodePackedVoice(decoded)).toEqual(packed)
    }
  })

  it('preserves every legal seven-bit reserved field in packed voices', () => {
    for (let caseIndex = 0; caseIndex < GENERATED_CASE_COUNT; caseIndex += 1) {
      const voice = createGeneratedVoice(caseIndex)
      const packed = encodePackedVoice(voice)

      for (let block = 0; block < 6; block += 1) {
        const offset = block * 17
        // Canonical Yamaha spare bits live above the actual fields in bytes
        // 11, 13 and 15. Bytes 12, 14 and 16 are fully occupied by
        // detune/rate-scaling, output level and fine frequency respectively.
        packed[offset + 11] = (packed[offset + 11] ?? 0) | (((caseIndex + block) & 0x07) << 4)
        packed[offset + 13] = (packed[offset + 13] ?? 0) | (((caseIndex + block) & 0x03) << 5)
        packed[offset + 15] = (packed[offset + 15] ?? 0) | (((caseIndex + block) & 0x01) << 6)
      }
      packed[111] = (packed[111] ?? 0) | ((caseIndex & 0x07) << 4)

      expectSevenBitData(packed)

      const decoded = decodePackedVoice(packed)
      expect(decoded).toMatchObject(voice)
      expect(encodePackedVoice(decoded)).toEqual(packed)
    }
  })

  it('round-trips generated 32-voice banks on every MIDI channel', () => {
    for (let channel = 0; channel < 16; channel += 1) {
      const voices = Array.from({ length: 32 }, (_, index) => createGeneratedVoice(channel * 32 + index))
      const message = encodeVoiceBankMessage(voices, channel)
      const payload = message.slice(6, 4102)

      expectSevenBitData(payload)
      expect(message[4102]).toBe(calculateYamahaChecksum(payload))

      const decoded = decodeVoiceBankMessage(message)
      expect(decoded.channel).toBe(channel)
      decoded.voices.forEach((voice, index) => {
        const expected = voices[index]
        if (!expected) throw new Error(`Missing generated bank voice ${index + 1}.`)
        expect(voice).toMatchObject(expected)
      })
      expect(encodeVoiceBankMessage(decoded.voices, channel)).toEqual(message)
    }
  })
})
