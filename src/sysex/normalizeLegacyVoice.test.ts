import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  calculateYamahaChecksum,
  decodeVoiceBankMessage,
  encodeVoiceBankMessage,
} from './dx7'
import { importSysexFile } from './importSysex'
import { normalizeLegacyVoice } from './normalizeLegacyVoice'

describe('legacy DX7 voice normalization', () => {
  it('normalizes every 0-99 parameter group without changing narrow fields', () => {
    const voice = createInitializedVoice('LEGACY 127')
    const operator = voice.operators[5]
    operator.envelope.rates = [99, 99, 127, 99]
    operator.envelope.levels = [127, 99, 99, 0]
    operator.keyboardScaling.breakPoint = 127
    operator.keyboardScaling.leftDepth = 127
    operator.keyboardScaling.rightDepth = 127
    operator.outputLevel = 127
    operator.frequencyFine = 127
    operator.rateScaling = 7
    voice.pitchEnvelope.rates = [127, 99, 99, 99]
    voice.pitchEnvelope.levels = [127, 50, 50, 50]
    voice.lfo.speed = 127
    voice.lfo.delay = 127
    voice.lfo.pitchModulationDepth = 127
    voice.lfo.amplitudeModulationDepth = 127

    const normalized = normalizeLegacyVoice(voice)
    const normalizedOperator = normalized.operators[5]

    expect(normalizedOperator.envelope.rates[2]).toBe(99)
    expect(normalizedOperator.envelope.levels[0]).toBe(99)
    expect(normalizedOperator.keyboardScaling.breakPoint).toBe(99)
    expect(normalizedOperator.keyboardScaling.leftDepth).toBe(99)
    expect(normalizedOperator.keyboardScaling.rightDepth).toBe(99)
    expect(normalizedOperator.outputLevel).toBe(99)
    expect(normalizedOperator.frequencyFine).toBe(99)
    expect(normalizedOperator.keyboardScaling.rateScaling).toBe(7)
    expect(normalized.pitchEnvelope.rates[0]).toBe(99)
    expect(normalized.pitchEnvelope.levels[0]).toBe(99)
    expect(normalized.lfo.speed).toBe(99)
    expect(normalized.lfo.delay).toBe(99)
    expect(normalized.lfo.pitchModulationDepth).toBe(99)
    expect(normalized.lfo.amplitudeModulationDepth).toBe(99)
  })

  it('normalizes OP6 envelope rate 3 while importing a complete bank', () => {
    const message = encodeVoiceBankMessage(
      Array.from({ length: 32 }, (_, index) => createInitializedVoice(`VOICE ${index + 1}`)),
    )
    const op6EnvelopeRate3Offset = 6 + 2
    message[op6EnvelopeRate3Offset] = 127
    message[4102] = calculateYamahaChecksum(message.slice(6, 4102))

    const imported = importSysexFile(message)
    const bank = imported.find((entry) => entry.kind === 'voice-bank')

    expect(bank?.kind).toBe('voice-bank')
    if (bank?.kind !== 'voice-bank') throw new Error('Expected imported bank.')
    expect(bank.voices[0]?.operators[5].envelope.rates[2]).toBe(99)

    const reencoded = encodeVoiceBankMessage(bank.voices)
    expect(decodeVoiceBankMessage(reencoded).voices[0]?.operators[5].envelope.rates[2]).toBe(99)
  })
})
