import { FM1_FX_PARAMETERS, type Fm1FxState } from '../domain/fx'
import { encodeControlChange } from './fm1Protocol'

export interface Fm1FxMessage {
  parameterId: string
  controller: number
  value: number
  data: Uint8Array
}

export function encodeFm1FxParameter(
  midiChannel: number,
  parameterId: string,
  value: number,
): Fm1FxMessage {
  const parameter = FM1_FX_PARAMETERS.find((candidate) => candidate.id === parameterId)
  if (!parameter) throw new Error(`Unknown FM-1 FX parameter ${parameterId}.`)
  if (!Number.isInteger(value) || value < parameter.minimum || value > parameter.maximum) {
    throw new RangeError(`${parameter.label} must be between ${parameter.minimum} and ${parameter.maximum}.`)
  }
  return {
    parameterId,
    controller: parameter.controller,
    value,
    data: encodeControlChange(midiChannel, parameter.controller, value),
  }
}

export function encodeFm1FxState(state: Fm1FxState): readonly Fm1FxMessage[] {
  return FM1_FX_PARAMETERS.map((parameter) =>
    encodeFm1FxParameter(state.midiChannel, parameter.id, state.values[parameter.id] ?? parameter.minimum),
  )
}
