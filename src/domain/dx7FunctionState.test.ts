import { describe, expect, it } from 'vitest'
import {
  createInitializedDx7FunctionState,
  decodeDx7ControllerAssignment,
  encodeDx7ControllerAssignment,
  getDx7FunctionParameterValues,
  validateDx7FunctionState,
} from './dx7FunctionState'
import { createInitializedVoice } from './voice'
import { encodePackedVoice, encodeSingleVoiceData } from '../sysex/dx7'

describe('DX7 detached function state', () => {
  it('initializes all documented function parameters at valid minimums', () => {
    const state = createInitializedDx7FunctionState()
    const values = getDx7FunctionParameterValues(state)

    expect(values.map((entry) => entry.parameter)).toEqual([
      64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77,
    ])
    expect(values.every((entry) => entry.value === 0)).toBe(true)
  })

  it('encodes controller assignment bits independently', () => {
    expect(encodeDx7ControllerAssignment({ pitch: true, amplitude: false, egBias: false })).toBe(1)
    expect(encodeDx7ControllerAssignment({ pitch: false, amplitude: true, egBias: false })).toBe(2)
    expect(encodeDx7ControllerAssignment({ pitch: false, amplitude: false, egBias: true })).toBe(4)
    expect(encodeDx7ControllerAssignment({ pitch: true, amplitude: true, egBias: true })).toBe(7)

    for (let value = 0; value <= 7; value += 1) {
      expect(encodeDx7ControllerAssignment(decodeDx7ControllerAssignment(value))).toBe(value)
    }
  })

  it('maps semantic state to function parameters 64 through 77', () => {
    const state = createInitializedDx7FunctionState()
    state.monoPolyMode = 'mono'
    state.pitchBendRange = 12
    state.pitchBendStep = 3
    state.portamentoMode = 'follow'
    state.portamentoGlissando = true
    state.portamentoTime = 99
    state.modulationWheel = {
      range: 80,
      assignment: { pitch: true, amplitude: true, egBias: false },
    }

    expect(getDx7FunctionParameterValues(state).slice(0, 8)).toEqual([
      { parameter: 64, value: 1 },
      { parameter: 65, value: 12 },
      { parameter: 66, value: 3 },
      { parameter: 67, value: 1 },
      { parameter: 68, value: 1 },
      { parameter: 69, value: 99 },
      { parameter: 70, value: 80 },
      { parameter: 71, value: 3 },
    ])
  })

  it('rejects values outside documented function ranges', () => {
    const state = createInitializedDx7FunctionState()
    state.pitchBendRange = 13
    expect(() => validateDx7FunctionState(state)).toThrow(/pitch bend range.*0 to 12/i)

    state.pitchBendRange = 0
    state.aftertouch.range = 100
    expect(() => validateDx7FunctionState(state)).toThrow(/aftertouch range.*0 to 99/i)
    expect(() => decodeDx7ControllerAssignment(8)).toThrow(/0 to 7/)
  })

  it('never changes voice payload sizes or embeds function parameters', () => {
    const voice = createInitializedVoice('FUNCTIONS')
    const state = createInitializedDx7FunctionState()
    state.monoPolyMode = 'mono'
    state.portamentoTime = 99

    expect(getDx7FunctionParameterValues(state)).toHaveLength(14)
    expect(encodeSingleVoiceData(voice)).toHaveLength(155)
    expect(encodePackedVoice(voice)).toHaveLength(128)
  })
})
