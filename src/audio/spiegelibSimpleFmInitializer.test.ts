import { describe, expect, it } from 'vitest'
import { encodeSingleVoiceData } from '../sysex/dx7'
import {
  SPIEGELIB_SIMPLE_FM_OUTPUTS,
  applySpiegelibSimpleFmPrediction,
  createSpiegelibSimpleFmBaseVoice,
} from './spiegelibSimpleFmInitializer'

describe('SpiegeLib simple-FM initializer adapter', () => {
  it('pins the nine learned outputs to the explicit ascending Dexed host-parameter order', () => {
    expect(SPIEGELIB_SIMPLE_FM_OUTPUTS.map((definition) => definition.dexedHostParameter)).toEqual([
      46, 47, 48, 50, 51, 52, 55, 56, 57,
    ])
  })

  it('reconstructs the fixed training base instead of using the normal editor INIT voice', () => {
    const voice = createSpiegelibSimpleFmBaseVoice()
    expect(voice.algorithm).toBe(1)
    expect(voice.feedback).toBe(0)
    expect(voice.pitchEnvelope).toEqual({ rates: [0, 0, 0, 0], levels: [0, 0, 0, 0] })
    expect(voice.lfo).toMatchObject({ speed: 0, delay: 0, keySync: false, pitchModulationSensitivity: 0 })
    expect(voice.transpose).toBe(24)

    expect(voice.operators[0].envelope).toEqual({ rates: [89, 89, 89, 89], levels: [99, 99, 99, 0] })
    expect(voice.operators[0]).toMatchObject({ outputLevel: 99, frequencyCoarse: 16, frequencyFine: 0, detune: 7 })
    expect(voice.operators[1].envelope).toEqual({ rates: [89, 0, 0, 0], levels: [99, 0, 0, 0] })
    expect(voice.operators[1].outputLevel).toBe(99)
    for (const operator of voice.operators.slice(2)) expect(operator.outputLevel).toBe(0)
  })

  it('uses Dexed host quantization and emits standards-valid 155-byte Yamaha voice data', () => {
    const voice = applySpiegelibSimpleFmPrediction([
      0,
      0.5,
      1,
      0.25,
      0.75,
      1.2,
      0.5,
      0.505,
      -0.2,
    ])

    expect(voice.operators[1].envelope.rates).toEqual([89, 0, 50, 99])
    expect(voice.operators[1].envelope.levels).toEqual([99, 25, 74, 99])
    expect(voice.operators[1].frequencyCoarse).toBe(16)
    expect(voice.operators[1].frequencyFine).toBe(50)
    expect(voice.operators[1].detune).toBe(0)

    const bytes = encodeSingleVoiceData(voice)
    expect(bytes).toHaveLength(155)
    // Yamaha unpacked order is OP6..OP1, so OP2 begins at byte 84.
    expect([...bytes.slice(84, 92)]).toEqual([89, 0, 50, 99, 99, 25, 74, 99])
    expect(bytes[102]).toBe(16)
    expect(bytes[103]).toBe(50)
    expect(bytes[104]).toBe(0)
  })

  it('rejects malformed model output rather than silently reshaping it', () => {
    expect(() => applySpiegelibSimpleFmPrediction([0, 1])).toThrow(/exactly 9/)
    expect(() => applySpiegelibSimpleFmPrediction([0, 0, 0, 0, 0, 0, 0, Number.NaN, 0])).toThrow(/finite/)
  })
})
