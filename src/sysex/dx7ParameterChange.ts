import type { Dx7FunctionParameterId } from '../domain/dx7FunctionState'
import { DX7_MANUFACTURER_ID, Dx7SysexError } from './dx7'

export interface Dx7FunctionParameterDefinition {
  id: Dx7FunctionParameterId
  label: string
  minimum: number
  maximum: number
}

export const DX7_FUNCTION_PARAMETERS: readonly Dx7FunctionParameterDefinition[] = [
  { id: 64, label: 'Mono / poly mode', minimum: 0, maximum: 1 },
  { id: 65, label: 'Pitch bend range', minimum: 0, maximum: 12 },
  { id: 66, label: 'Pitch bend step', minimum: 0, maximum: 12 },
  { id: 67, label: 'Portamento mode', minimum: 0, maximum: 1 },
  { id: 68, label: 'Portamento glissando', minimum: 0, maximum: 1 },
  { id: 69, label: 'Portamento time', minimum: 0, maximum: 99 },
  { id: 70, label: 'Modulation wheel range', minimum: 0, maximum: 99 },
  { id: 71, label: 'Modulation wheel assignment', minimum: 0, maximum: 7 },
  { id: 72, label: 'Foot controller range', minimum: 0, maximum: 99 },
  { id: 73, label: 'Foot controller assignment', minimum: 0, maximum: 7 },
  { id: 74, label: 'Breath controller range', minimum: 0, maximum: 99 },
  { id: 75, label: 'Breath controller assignment', minimum: 0, maximum: 7 },
  { id: 76, label: 'Aftertouch range', minimum: 0, maximum: 99 },
  { id: 77, label: 'Aftertouch assignment', minimum: 0, maximum: 7 },
]

const FUNCTION_GROUP = 2

function assertIntegerRange(label: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Dx7SysexError(`${label} must be an integer from ${minimum} to ${maximum}; received ${value}.`)
  }
}

export function getDx7FunctionParameterDefinition(
  parameter: Dx7FunctionParameterId,
): Dx7FunctionParameterDefinition {
  const definition = DX7_FUNCTION_PARAMETERS.find((candidate) => candidate.id === parameter)
  if (!definition) throw new Dx7SysexError(`Unsupported DX7 function parameter ${parameter}.`)
  return definition
}

/**
 * Encodes Yamaha DX7 parameter-change format 1-2-4:
 * F0 43 1n 0gggggpp 0ppppppp 0ddddddd F7.
 *
 * Function parameters use group 2 and documented parameters 64 through 77.
 * The public API intentionally does not expose unchecked voice-parameter writes.
 */
export function encodeDx7FunctionParameterChange(
  parameter: Dx7FunctionParameterId,
  value: number,
  midiChannel = 1,
): Uint8Array {
  assertIntegerRange('DX7 MIDI channel', midiChannel, 1, 16)
  const definition = getDx7FunctionParameterDefinition(parameter)
  assertIntegerRange(`DX7 ${definition.label}`, value, definition.minimum, definition.maximum)

  const parameterGroupAndHighBits = (FUNCTION_GROUP << 2) | ((parameter >> 7) & 0x03)
  return Uint8Array.of(
    0xf0,
    DX7_MANUFACTURER_ID,
    0x10 | (midiChannel - 1),
    parameterGroupAndHighBits,
    parameter & 0x7f,
    value,
    0xf7,
  )
}
