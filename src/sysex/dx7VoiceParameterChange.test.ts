import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  diffDx7VoiceParameterValues,
  encodeDx7VoiceParameterChange,
  getDx7VoiceParameterDefinition,
  getDx7VoiceParameterValues,
  type Dx7VoiceParameterValue,
} from './dx7VoiceParameterChange'

describe('DX7 voice parameter changes', () => {
  it('maps the semantic voice and edit-session mask to parameters 0 through 155', () => {
    const values = getDx7VoiceParameterValues(createInitializedVoice(), 0x2a)

    expect(values).toHaveLength(156)
    expect(values.map((value) => value.parameter)).toEqual(Array.from({ length: 156 }, (_, index) => index))
    expect(values[155]).toMatchObject({ label: 'Operator enable mask', value: 0x2a })
  })

  it('uses Yamaha OP6-first parameter blocks while the model remains OP1-first', () => {
    const voice = createInitializedVoice()
    const operators = [...voice.operators] as typeof voice.operators
    operators[0] = { ...operators[0], outputLevel: 88 }
    operators[5] = { ...operators[5], outputLevel: 66 }
    const values = getDx7VoiceParameterValues({ ...voice, operators })

    expect(values[16]).toMatchObject({ label: 'OP6 output level', value: 66 })
    expect(values[121]).toMatchObject({ label: 'OP1 output level', value: 88 })
  })

  it('maps common parameters, printable name bytes and zero-based algorithm data', () => {
    const voice = {
      ...createInitializedVoice('Ab c'),
      algorithm: 32,
      feedback: 7,
      transpose: 48,
    }
    const values = getDx7VoiceParameterValues(voice)

    expect(values[134]).toMatchObject({ label: 'Algorithm', value: 31 })
    expect(values[135]).toMatchObject({ label: 'Feedback', value: 7 })
    expect(values[144]).toMatchObject({ label: 'Transpose', value: 48 })
    expect(values.slice(145, 155).map((value) => value.value)).toEqual(
      Array.from('AB C      ', (character) => character.charCodeAt(0)),
    )
  })

  it('encodes common parameters with Yamaha high parameter bits', () => {
    const algorithm = getDx7VoiceParameterValues(createInitializedVoice())[134]
    expect(algorithm).toBeDefined()
    expect(Array.from(encodeDx7VoiceParameterChange(algorithm!, 1))).toEqual([
      0xf0, 0x43, 0x10, 0x01, 0x06, 0x00, 0xf7,
    ])
  })

  it('reports only changed semantic parameters', () => {
    const beforeVoice = createInitializedVoice()
    const afterVoice = { ...beforeVoice, feedback: 6, transpose: 36 }
    const changes = diffDx7VoiceParameterValues(
      getDx7VoiceParameterValues(beforeVoice),
      getDx7VoiceParameterValues(afterVoice),
    )

    expect(changes.map((change) => [change.parameter, change.value])).toEqual([
      [135, 6],
      [144, 36],
    ])
  })

  it('rejects invalid semantic values and malformed comparison sets', () => {
    const invalid: Dx7VoiceParameterValue = {
      ...getDx7VoiceParameterDefinition(20),
      value: 15,
    }
    expect(() => encodeDx7VoiceParameterChange(invalid)).toThrow(/0 to 14/)
    expect(() => getDx7VoiceParameterValues(createInitializedVoice(), 64)).toThrow(/0 to 63/)
    expect(() => diffDx7VoiceParameterValues([], [])).toThrow(/exactly 156/)
  })
})
