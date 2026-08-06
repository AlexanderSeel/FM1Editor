import type { Dx7Operator, Dx7Voice, FourValues } from '../domain/voice'

export interface Dx7CompatibilityNormalization {
  path: string
  originalValue: number
  normalizedValue: number
}

export interface NormalizedLegacyVoice {
  voice: Dx7Voice
  normalizations: readonly Dx7CompatibilityNormalization[]
}

function normalizeParameter(
  value: number,
  maximum: number,
  path: string,
  normalizations: Dx7CompatibilityNormalization[],
): number {
  const normalizedValue = Math.min(value, maximum)
  if (normalizedValue !== value) {
    normalizations.push({ path, originalValue: value, normalizedValue })
  }
  return normalizedValue
}

function normalizeFour(
  values: FourValues,
  path: string,
  normalizations: Dx7CompatibilityNormalization[],
): FourValues {
  return [
    normalizeParameter(values[0], 99, `${path}[1]`, normalizations),
    normalizeParameter(values[1], 99, `${path}[2]`, normalizations),
    normalizeParameter(values[2], 99, `${path}[3]`, normalizations),
    normalizeParameter(values[3], 99, `${path}[4]`, normalizations),
  ]
}

function normalizeOperator(
  operator: Dx7Operator,
  operatorIndex: number,
  normalizations: Dx7CompatibilityNormalization[],
): Dx7Operator {
  const path = `OP${operatorIndex + 1}`
  return {
    ...operator,
    envelope: {
      rates: normalizeFour(operator.envelope.rates, `${path}.envelope.rates`, normalizations),
      levels: normalizeFour(operator.envelope.levels, `${path}.envelope.levels`, normalizations),
    },
    keyboardScaling: {
      ...operator.keyboardScaling,
      breakPoint: normalizeParameter(operator.keyboardScaling.breakPoint, 99, `${path}.keyboardScaling.breakPoint`, normalizations),
      leftDepth: normalizeParameter(operator.keyboardScaling.leftDepth, 99, `${path}.keyboardScaling.leftDepth`, normalizations),
      rightDepth: normalizeParameter(operator.keyboardScaling.rightDepth, 99, `${path}.keyboardScaling.rightDepth`, normalizations),
    },
    outputLevel: normalizeParameter(operator.outputLevel, 99, `${path}.outputLevel`, normalizations),
    frequencyFine: normalizeParameter(operator.frequencyFine, 99, `${path}.frequencyFine`, normalizations),
    detune: normalizeParameter(operator.detune, 14, `${path}.detune`, normalizations),
  }
}

/**
 * Some legacy and third-party DX7 banks use reserved 7-bit values 100..127
 * in parameters whose documented range is 0..99, or detune value 15 where
 * 0..14 is defined. Normalize those values only at the import boundary and
 * retain a structured record of every changed parameter.
 */
export function normalizeLegacyVoiceWithReport(voice: Dx7Voice): NormalizedLegacyVoice {
  const normalizations: Dx7CompatibilityNormalization[] = []
  const operators = voice.operators.map((operator, index) =>
    normalizeOperator(operator, index, normalizations),
  ) as [
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
  ]

  return {
    voice: {
      ...voice,
      operators,
      pitchEnvelope: {
        rates: normalizeFour(voice.pitchEnvelope.rates, 'pitchEnvelope.rates', normalizations),
        levels: normalizeFour(voice.pitchEnvelope.levels, 'pitchEnvelope.levels', normalizations),
      },
      lfo: {
        ...voice.lfo,
        speed: normalizeParameter(voice.lfo.speed, 99, 'lfo.speed', normalizations),
        delay: normalizeParameter(voice.lfo.delay, 99, 'lfo.delay', normalizations),
        pitchModulationDepth: normalizeParameter(
          voice.lfo.pitchModulationDepth,
          99,
          'lfo.pitchModulationDepth',
          normalizations,
        ),
        amplitudeModulationDepth: normalizeParameter(
          voice.lfo.amplitudeModulationDepth,
          99,
          'lfo.amplitudeModulationDepth',
          normalizations,
        ),
      },
    },
    normalizations,
  }
}

export function normalizeLegacyVoice(voice: Dx7Voice): Dx7Voice {
  return normalizeLegacyVoiceWithReport(voice).voice
}
