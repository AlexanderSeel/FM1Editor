import type { Dx7Voice } from '../domain/voice'
import { encodeSingleVoiceData } from '../sysex/dx7'

export const FM1_PARAMETER_MIN = 0
export const FM1_PARAMETER_MAX = 155
export const FM1_VALUE_MIN = 0
export const FM1_VALUE_MAX = 127

export type Fm1RealtimeMessage = 'clock' | 'start' | 'continue' | 'stop'

const realtimeBytes: Record<Fm1RealtimeMessage, number> = {
  clock: 0xf8,
  start: 0xfa,
  continue: 0xfb,
  stop: 0xfc,
}

function assertIntegerRange(label: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}; received ${value}.`)
  }
}

/**
 * Official FM-1 V15 document: F0 43 10 pp qq vv F7.
 * Parameter = pp * 128 + qq. The document fixes the device byte to 0x10.
 */
export function encodeFm1ParameterWrite(parameter: number, value: number): Uint8Array {
  assertIntegerRange('FM-1 parameter', parameter, FM1_PARAMETER_MIN, FM1_PARAMETER_MAX)
  assertIntegerRange('FM-1 parameter value', value, FM1_VALUE_MIN, FM1_VALUE_MAX)

  return Uint8Array.of(
    0xf0,
    0x43,
    0x10,
    (parameter >> 7) & 0x7f,
    parameter & 0x7f,
    value & 0x7f,
    0xf7,
  )
}

export interface Fm1ParameterChange {
  parameter: number
  value: number
  message: Uint8Array
}

/**
 * Experimental mapping boundary.
 *
 * It compares Yamaha DX7 155-byte edit-buffer data and maps changed byte indexes
 * to FM-1 parameter IDs. The FM-1 document gives IDs 0..155 but does not publish
 * a semantic table, so callers must keep this behind an explicit experimental UI.
 */
export function createExperimentalVoiceParameterChanges(
  previous: Dx7Voice,
  next: Dx7Voice,
): Fm1ParameterChange[] {
  const before = encodeSingleVoiceData(previous)
  const after = encodeSingleVoiceData(next)
  const changes: Fm1ParameterChange[] = []

  for (let parameter = 0; parameter < after.length; parameter += 1) {
    const value = after[parameter]
    if (value !== undefined && value !== before[parameter]) {
      changes.push({ parameter, value, message: encodeFm1ParameterWrite(parameter, value) })
    }
  }

  return changes
}

export function encodeControlChange(channel: number, controller: number, value: number): Uint8Array {
  assertIntegerRange('MIDI channel', channel, 1, 16)
  assertIntegerRange('MIDI controller', controller, 0, 127)
  assertIntegerRange('MIDI controller value', value, 0, 127)
  return Uint8Array.of(0xb0 | (channel - 1), controller, value)
}

export function encodeProgramChange(channel: number, program: number): Uint8Array {
  assertIntegerRange('MIDI channel', channel, 1, 16)
  assertIntegerRange('MIDI program', program, 0, 127)
  return Uint8Array.of(0xc0 | (channel - 1), program)
}

export function encodeNoteOn(channel: number, note: number, velocity: number): Uint8Array {
  assertIntegerRange('MIDI channel', channel, 1, 16)
  assertIntegerRange('MIDI note', note, 0, 127)
  assertIntegerRange('MIDI velocity', velocity, 1, 127)
  return Uint8Array.of(0x90 | (channel - 1), note, velocity)
}

export function encodeNoteOff(channel: number, note: number, velocity = 0): Uint8Array {
  assertIntegerRange('MIDI channel', channel, 1, 16)
  assertIntegerRange('MIDI note', note, 0, 127)
  assertIntegerRange('MIDI release velocity', velocity, 0, 127)
  return Uint8Array.of(0x80 | (channel - 1), note, velocity)
}

export function encodeRealtimeMessage(message: Fm1RealtimeMessage): Uint8Array {
  return Uint8Array.of(realtimeBytes[message])
}
