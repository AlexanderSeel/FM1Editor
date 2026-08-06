import { describe, expect, it } from 'vitest'
import type { Dx7FunctionParameterId } from '../domain/dx7FunctionState'
import {
  DX7_FUNCTION_PARAMETERS,
  encodeDx7FunctionParameterChange,
} from './dx7ParameterChange'

describe('DX7 function parameter changes', () => {
  it('encodes Yamaha function group 2 on every MIDI channel', () => {
    for (let midiChannel = 1; midiChannel <= 16; midiChannel += 1) {
      expect(Array.from(encodeDx7FunctionParameterChange(64, 1, midiChannel))).toEqual([
        0xf0,
        0x43,
        0x10 | (midiChannel - 1),
        0x08,
        0x40,
        0x01,
        0xf7,
      ])
    }
  })

  it('accepts every documented minimum and maximum', () => {
    for (const definition of DX7_FUNCTION_PARAMETERS) {
      expect(encodeDx7FunctionParameterChange(definition.id, definition.minimum)).toHaveLength(7)
      expect(encodeDx7FunctionParameterChange(definition.id, definition.maximum)).toHaveLength(7)
    }
  })

  it('rejects values outside each documented semantic range', () => {
    for (const definition of DX7_FUNCTION_PARAMETERS) {
      expect(() => encodeDx7FunctionParameterChange(definition.id, definition.minimum - 1)).toThrow(RangeError)
      expect(() => encodeDx7FunctionParameterChange(definition.id, definition.maximum + 1)).toThrow(RangeError)
    }
  })

  it('rejects invalid MIDI channels and unsupported parameter identifiers', () => {
    expect(() => encodeDx7FunctionParameterChange(64, 0, 0)).toThrow(RangeError)
    expect(() => encodeDx7FunctionParameterChange(64, 0, 17)).toThrow(RangeError)
    expect(() => encodeDx7FunctionParameterChange(63 as Dx7FunctionParameterId, 0)).toThrow(/Unsupported/)
    expect(() => encodeDx7FunctionParameterChange(78 as Dx7FunctionParameterId, 0)).toThrow(/Unsupported/)
  })
})
