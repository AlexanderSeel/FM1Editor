import type { Dx7Voice } from '../domain/voice'
import { encodeSingleVoiceData, Dx7SysexError } from './dx7'
import {
  assertDx7IntegerRange,
  encodeDx7ParameterChangeFrame,
} from './dx7ParameterChange'

export interface Dx7VoiceParameterDefinition {
  parameter: number
  label: string
  minimum: number
  maximum: number
}

export interface Dx7VoiceParameterValue extends Dx7VoiceParameterDefinition {
  value: number
}

const OPERATOR_PARAMETER_LABELS = [
  'EG rate 1', 'EG rate 2', 'EG rate 3', 'EG rate 4',
  'EG level 1', 'EG level 2', 'EG level 3', 'EG level 4',
  'keyboard break point', 'keyboard left depth', 'keyboard right depth',
  'keyboard left curve', 'keyboard right curve', 'keyboard rate scaling',
  'amplitude modulation sensitivity', 'key velocity sensitivity', 'output level',
  'oscillator mode', 'frequency coarse', 'frequency fine', 'detune',
] as const

const OPERATOR_MAXIMUMS = [
  99, 99, 99, 99,
  99, 99, 99, 99,
  99, 99, 99,
  3, 3, 7,
  3, 7, 99,
  1, 31, 99, 14,
] as const

const COMMON_DEFINITIONS: readonly Omit<Dx7VoiceParameterDefinition, 'parameter'>[] = [
  { label: 'Pitch EG rate 1', minimum: 0, maximum: 99 },
  { label: 'Pitch EG rate 2', minimum: 0, maximum: 99 },
  { label: 'Pitch EG rate 3', minimum: 0, maximum: 99 },
  { label: 'Pitch EG rate 4', minimum: 0, maximum: 99 },
  { label: 'Pitch EG level 1', minimum: 0, maximum: 99 },
  { label: 'Pitch EG level 2', minimum: 0, maximum: 99 },
  { label: 'Pitch EG level 3', minimum: 0, maximum: 99 },
  { label: 'Pitch EG level 4', minimum: 0, maximum: 99 },
  { label: 'Algorithm', minimum: 0, maximum: 31 },
  { label: 'Feedback', minimum: 0, maximum: 7 },
  { label: 'Oscillator key sync', minimum: 0, maximum: 1 },
  { label: 'LFO speed', minimum: 0, maximum: 99 },
  { label: 'LFO delay', minimum: 0, maximum: 99 },
  { label: 'LFO pitch modulation depth', minimum: 0, maximum: 99 },
  { label: 'LFO amplitude modulation depth', minimum: 0, maximum: 99 },
  { label: 'LFO key sync', minimum: 0, maximum: 1 },
  { label: 'LFO waveform', minimum: 0, maximum: 5 },
  { label: 'LFO pitch modulation sensitivity', minimum: 0, maximum: 7 },
  { label: 'Transpose', minimum: 0, maximum: 48 },
  ...Array.from({ length: 10 }, (_, index) => ({
    label: `Voice name character ${index + 1}`,
    minimum: 0x20,
    maximum: 0x7e,
  })),
]

export function getDx7VoiceParameterDefinition(parameter: number): Dx7VoiceParameterDefinition {
  assertDx7IntegerRange('DX7 voice parameter number', parameter, 0, 155)

  if (parameter <= 125) {
    const operatorBlock = Math.floor(parameter / 21)
    const offset = parameter % 21
    const operatorNumber = 6 - operatorBlock
    const label = OPERATOR_PARAMETER_LABELS[offset]
    const maximum = OPERATOR_MAXIMUMS[offset]
    if (label === undefined || maximum === undefined) {
      throw new Dx7SysexError(`Unsupported DX7 operator parameter ${parameter}.`)
    }
    return {
      parameter,
      label: `OP${operatorNumber} ${label}`,
      minimum: 0,
      maximum,
    }
  }

  if (parameter <= 154) {
    const definition = COMMON_DEFINITIONS[parameter - 126]
    if (!definition) throw new Dx7SysexError(`Unsupported DX7 common voice parameter ${parameter}.`)
    return { parameter, ...definition }
  }

  return {
    parameter: 155,
    label: 'Operator enable mask',
    minimum: 0,
    maximum: 63,
  }
}

/**
 * Converts the semantic voice model into Yamaha parameters 0–154. The existing
 * single-voice encoder is the canonical map, because its byte offsets are the
 * documented DX7 common-voice parameter numbers. Parameter 155 is edit-session
 * state and is supplied separately as a six-operator mask.
 */
export function getDx7VoiceParameterValues(
  voice: Dx7Voice,
  operatorEnableMask = 0x3f,
): readonly Dx7VoiceParameterValue[] {
  assertDx7IntegerRange('DX7 operator enable mask', operatorEnableMask, 0, 63)
  const data = encodeSingleVoiceData(voice)
  const values = Array.from(data, (value, parameter) => ({
    ...getDx7VoiceParameterDefinition(parameter),
    value,
  }))
  values.push({
    ...getDx7VoiceParameterDefinition(155),
    value: operatorEnableMask,
  })
  return values
}

export function diffDx7VoiceParameterValues(
  previous: readonly Dx7VoiceParameterValue[],
  current: readonly Dx7VoiceParameterValue[],
): readonly Dx7VoiceParameterValue[] {
  if (previous.length !== 156 || current.length !== 156) {
    throw new Dx7SysexError('DX7 voice parameter comparisons require exactly 156 values.')
  }
  return current.filter((value, index) => previous[index]?.value !== value.value)
}

export function encodeDx7VoiceParameterChange(
  change: Dx7VoiceParameterValue,
  midiChannel = 1,
): Uint8Array {
  const definition = getDx7VoiceParameterDefinition(change.parameter)
  assertDx7IntegerRange(
    `DX7 ${definition.label}`,
    change.value,
    definition.minimum,
    definition.maximum,
  )
  return encodeDx7ParameterChangeFrame(0, change.parameter, change.value, midiChannel)
}
