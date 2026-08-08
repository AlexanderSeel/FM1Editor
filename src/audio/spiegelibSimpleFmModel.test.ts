import { describe, expect, it } from 'vitest'
import { encodeSingleVoiceData } from '../sysex/dx7'
import { applySpiegelibSimpleFmPrediction } from './spiegelibSimpleFmInitializer'
import {
  getSpiegelibSimpleFmMlpModel,
  inferSpiegelibSimpleFmFromStandardizedMfcc,
} from './spiegelibSimpleFmModel'

const H5_NUMPY_ZERO_REFERENCE = [
  0.6124379929800317,
  0.5408504640884475,
  0.5041409913266433,
  0.2920537433005924,
  0.6022224477065428,
  0.5019347547822712,
  0.6914192139253964,
  0.46468255912922046,
  0.4895537459963921,
] as const

describe('converted SpiegeLib simple-FM model', () => {
  it('loads the pinned MIT tensor package and matches the H5 zero-vector reference', () => {
    const model = getSpiegelibSimpleFmMlpModel()
    expect(model.source).toMatchObject({
      repository: 'spiegelib/vst-fm-sound-match',
      commit: 'e1baab7fbeb0bc3f4d4946f8348e77dd18028080',
      sha256: '96f1d58d3190fc7590f62d1293bb5d39d4d1dbde74c1a754ad5c576c26c32c4f',
      license: 'MIT',
    })

    const output = inferSpiegelibSimpleFmFromStandardizedMfcc(new Float32Array(572))
    expect(output).toHaveLength(9)
    output.forEach((value, index) => {
      expect(value).toBeCloseTo(H5_NUMPY_ZERO_REFERENCE[index] ?? 0, 5)
    })
  })

  it('turns the real model output into standards-valid Yamaha voice data', () => {
    const output = inferSpiegelibSimpleFmFromStandardizedMfcc(new Float32Array(572))
    const voice = applySpiegelibSimpleFmPrediction(output, 'SPGL REF')
    expect(encodeSingleVoiceData(voice)).toHaveLength(155)
    expect(voice.operators[1].outputLevel).toBe(99)
    expect(voice.operators[1].frequencyCoarse).toBeGreaterThanOrEqual(0)
    expect(voice.operators[1].frequencyCoarse).toBeLessThanOrEqual(31)
  })
})
