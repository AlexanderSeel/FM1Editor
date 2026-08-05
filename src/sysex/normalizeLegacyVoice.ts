import type { Dx7Operator, Dx7Voice, FourValues } from '../domain/voice'

function normalizeParameter99(value: number): number {
  return Math.min(value, 99)
}

function normalizeFour(values: FourValues): FourValues {
  return [
    normalizeParameter99(values[0]),
    normalizeParameter99(values[1]),
    normalizeParameter99(values[2]),
    normalizeParameter99(values[3]),
  ]
}

function normalizeOperator(operator: Dx7Operator): Dx7Operator {
  return {
    ...operator,
    envelope: {
      rates: normalizeFour(operator.envelope.rates),
      levels: normalizeFour(operator.envelope.levels),
    },
    keyboardScaling: {
      ...operator.keyboardScaling,
      breakPoint: normalizeParameter99(operator.keyboardScaling.breakPoint),
      leftDepth: normalizeParameter99(operator.keyboardScaling.leftDepth),
      rightDepth: normalizeParameter99(operator.keyboardScaling.rightDepth),
    },
    outputLevel: normalizeParameter99(operator.outputLevel),
    frequencyFine: normalizeParameter99(operator.frequencyFine),
    detune: Math.min(operator.detune, 14),
  }
}

/**
 * Some legacy and third-party DX7 banks use reserved 7-bit values 100..127
 * in parameters whose documented range is 0..99. Normalize those values at
 * the import boundary so editing and re-encoding cannot fail one field at a
 * time. Narrow bit-field parameters remain unchanged and strictly validated.
 */
export function normalizeLegacyVoice(voice: Dx7Voice): Dx7Voice {
  const operators = voice.operators.map(normalizeOperator) as [
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
  ]

  return {
    ...voice,
    operators,
    pitchEnvelope: {
      rates: normalizeFour(voice.pitchEnvelope.rates),
      levels: normalizeFour(voice.pitchEnvelope.levels),
    },
    lfo: {
      ...voice.lfo,
      speed: normalizeParameter99(voice.lfo.speed),
      delay: normalizeParameter99(voice.lfo.delay),
      pitchModulationDepth: normalizeParameter99(voice.lfo.pitchModulationDepth),
      amplitudeModulationDepth: normalizeParameter99(voice.lfo.amplitudeModulationDepth),
    },
  }
}
