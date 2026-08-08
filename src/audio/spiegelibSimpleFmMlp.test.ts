import { describe, expect, it } from 'vitest'
import {
  SPIEGELIB_SIMPLE_FM_MLP_SCHEMA,
  runSpiegelibSimpleFmMlp,
  validateSpiegelibSimpleFmMlpModel,
  type SpiegelibSimpleFmDenseLayer,
  type SpiegelibSimpleFmMlpModel,
} from './spiegelibSimpleFmMlp'

function layer(
  name: string,
  inputSize: number,
  outputSize: number,
  activation: 'relu' | 'linear',
  biasValue = 0,
): SpiegelibSimpleFmDenseLayer {
  return {
    name,
    inputSize,
    outputSize,
    activation,
    kernel: new Array<number>(inputSize * outputSize).fill(0),
    bias: new Array<number>(outputSize).fill(biasValue),
  }
}

function model(): SpiegelibSimpleFmMlpModel {
  return {
    schema: SPIEGELIB_SIMPLE_FM_MLP_SCHEMA,
    source: {
      repository: 'spiegelib/vst-fm-sound-match',
      commit: 'e1baab7fbeb0bc3f4d4946f8348e77dd18028080',
      path: 'saved_models/simple_fm_mlp.h5',
      sha256: '96f1d58d3190fc7590f62d1293bb5d39d4d1dbde74c1a754ad5c576c26c32c4f',
      license: 'MIT',
      copyright: 'Copyright (c) 2020 spiegel-lib',
    },
    inputSize: 572,
    outputSize: 9,
    layers: [
      layer('dense', 572, 50, 'relu', 1),
      layer('dense_1', 50, 40, 'relu', 2),
      layer('dense_2', 40, 30, 'relu', 3),
      layer('dense_3', 30, 9, 'linear', 4),
    ],
  }
}

describe('SpiegeLib simple-FM MLP runner', () => {
  it('validates and executes only the pinned architecture', () => {
    const pinned = model()
    expect(() => validateSpiegelibSimpleFmMlpModel(pinned)).not.toThrow()
    expect([...runSpiegelibSimpleFmMlp(pinned, new Float32Array(572))]).toEqual(new Array<number>(9).fill(4))
  })

  it('rejects wrong tensor lengths instead of applying partial weights', () => {
    const pinned = model()
    const bad = {
      ...pinned,
      layers: [
        { ...pinned.layers[0]!, kernel: [0] },
        ...pinned.layers.slice(1),
      ],
    }
    expect(() => validateSpiegelibSimpleFmMlpModel(bad)).toThrow(/kernel/)
    expect(() => runSpiegelibSimpleFmMlp(pinned, new Float32Array(571))).toThrow(/572/)
  })

  it('rejects non-finite feature and weight values', () => {
    const pinned = model()
    const input = new Float32Array(572)
    input[10] = Number.NaN
    expect(() => runSpiegelibSimpleFmMlp(pinned, input)).toThrow(/input\[10\]/)

    const badBias = [...pinned.layers[3]!.bias]
    badBias[0] = Number.POSITIVE_INFINITY
    expect(() => validateSpiegelibSimpleFmMlpModel({
      ...pinned,
      layers: [...pinned.layers.slice(0, 3), { ...pinned.layers[3]!, bias: badBias }],
    })).toThrow(/bias\[0\]/)
  })
})
