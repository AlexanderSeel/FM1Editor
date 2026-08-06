import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  calculateYamahaChecksum,
  decodePackedVoice,
  decodeVoiceBankMessage,
  encodePackedVoice,
  encodeVoiceBankMessage,
} from './dx7'
import { analyzeSysexFile, importSysexFile } from './importSysex'
import {
  normalizeLegacyVoice,
  normalizeLegacyVoiceWithReport,
} from './normalizeLegacyVoice'

describe('legacy DX7 voice normalization', () => {
  it('normalizes every 0-99 parameter group and records each changed path', () => {
    const voice = createInitializedVoice('LEGACY 127')
    const operator = voice.operators[5]
    operator.envelope.rates = [99, 99, 127, 99]
    operator.envelope.levels = [127, 99, 99, 0]
    operator.keyboardScaling.breakPoint = 127
    operator.keyboardScaling.leftDepth = 127
    operator.keyboardScaling.rightDepth = 127
    operator.outputLevel = 127
    operator.frequencyFine = 127
    operator.keyboardScaling.rateScaling = 7
    voice.pitchEnvelope.rates = [127, 99, 99, 99]
    voice.pitchEnvelope.levels = [127, 50, 50, 50]
    voice.lfo.speed = 127
    voice.lfo.delay = 127
    voice.lfo.pitchModulationDepth = 127
    voice.lfo.amplitudeModulationDepth = 127

    const result = normalizeLegacyVoiceWithReport(voice)
    const normalizedOperator = result.voice.operators[5]

    expect(normalizedOperator.envelope.rates[2]).toBe(99)
    expect(normalizedOperator.envelope.levels[0]).toBe(99)
    expect(normalizedOperator.keyboardScaling.breakPoint).toBe(99)
    expect(normalizedOperator.keyboardScaling.leftDepth).toBe(99)
    expect(normalizedOperator.keyboardScaling.rightDepth).toBe(99)
    expect(normalizedOperator.outputLevel).toBe(99)
    expect(normalizedOperator.frequencyFine).toBe(99)
    expect(normalizedOperator.keyboardScaling.rateScaling).toBe(7)
    expect(result.voice.pitchEnvelope.rates[0]).toBe(99)
    expect(result.voice.pitchEnvelope.levels[0]).toBe(99)
    expect(result.voice.lfo.speed).toBe(99)
    expect(result.voice.lfo.delay).toBe(99)
    expect(result.voice.lfo.pitchModulationDepth).toBe(99)
    expect(result.voice.lfo.amplitudeModulationDepth).toBe(99)
    expect(result.normalizations).toContainEqual({
      path: 'OP6.envelope.rates[3]',
      originalValue: 127,
      normalizedValue: 99,
    })
    expect(result.normalizations).toContainEqual({
      path: 'lfo.amplitudeModulationDepth',
      originalValue: 127,
      normalizedValue: 99,
    })
    expect(normalizeLegacyVoice(voice)).toEqual(result.voice)
  })

  it('records breakpoint 127 and detune 15 preserved in packed source bytes', () => {
    const packed = encodePackedVoice(createInitializedVoice('SOURCE RAW'))
    const op6BreakpointOffset = 8
    const op6DetuneOffset = 16
    packed[op6BreakpointOffset] = 127
    packed[op6DetuneOffset] = 0x3f

    const decoded = decodePackedVoice(packed)
    const result = normalizeLegacyVoiceWithReport(decoded)

    expect(result.voice.operators[5].keyboardScaling.breakPoint).toBe(99)
    expect(result.voice.operators[5].detune).toBe(14)
    expect(result.normalizations).toContainEqual({
      path: 'OP6.keyboardScaling.breakPoint',
      originalValue: 127,
      normalizedValue: 99,
    })
    expect(result.normalizations).toContainEqual({
      path: 'OP6.detune',
      originalValue: 15,
      normalizedValue: 14,
    })
  })

  it('records bank import normalizations and emits visible diagnostics', () => {
    const message = encodeVoiceBankMessage(
      Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`)),
    )
    const op6EnvelopeRate3Offset = 6 + 2
    message[op6EnvelopeRate3Offset] = 127
    message[4102] = calculateYamahaChecksum(message.slice(6, 4102))

    const report = analyzeSysexFile(message)
    const imported = importSysexFile(message)
    const bank = imported.find((entry) => entry.kind === 'voice-bank')

    expect(bank?.kind).toBe('voice-bank')
    if (bank?.kind !== 'voice-bank') throw new Error('Expected imported bank.')
    expect(bank.voices[0]?.operators[5].envelope.rates[2]).toBe(99)
    expect(bank.normalizations).toContainEqual({
      path: 'voice[1].OP6.envelope.rates[3]',
      originalValue: 127,
      normalizedValue: 99,
    })
    expect(report.diagnostics).toContainEqual(expect.objectContaining({
      code: 'compatibility-normalization',
      severity: 'warning',
      message: expect.stringContaining('voice[1].OP6.envelope.rates[3] from 127 to 99'),
    }))

    const reencoded = encodeVoiceBankMessage(bank.voices)
    expect(decodeVoiceBankMessage(reencoded).voices[0]?.operators[5].envelope.rates[2]).toBe(99)
  })
})
