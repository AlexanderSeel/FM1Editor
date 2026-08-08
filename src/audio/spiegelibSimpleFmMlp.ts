export const SPIEGELIB_SIMPLE_FM_MLP_SCHEMA = 'fm1-editor.spiegelib-simple-fm-mlp.v1' as const

export interface SpiegelibSimpleFmDenseLayer {
  readonly name: string
  readonly inputSize: number
  readonly outputSize: number
  readonly activation: 'relu' | 'linear'
  readonly kernel: readonly number[]
  readonly bias: readonly number[]
}

export interface SpiegelibSimpleFmMlpModel {
  readonly schema: typeof SPIEGELIB_SIMPLE_FM_MLP_SCHEMA
  readonly source: {
    readonly repository: string
    readonly commit: string
    readonly path: string
    readonly sha256: string
    readonly license: string
    readonly copyright: string
  }
  readonly inputSize: 572
  readonly outputSize: 9
  readonly layers: readonly SpiegelibSimpleFmDenseLayer[]
}

const EXPECTED_LAYERS = Object.freeze([
  { name: 'dense', inputSize: 572, outputSize: 50, activation: 'relu' as const },
  { name: 'dense_1', inputSize: 50, outputSize: 40, activation: 'relu' as const },
  { name: 'dense_2', inputSize: 40, outputSize: 30, activation: 'relu' as const },
  { name: 'dense_3', inputSize: 30, outputSize: 9, activation: 'linear' as const },
])

function assertFiniteArray(label: string, values: readonly number[], expectedLength: number): void {
  if (values.length !== expectedLength) throw new Error(`${label} must contain exactly ${expectedLength} values.`)
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) throw new Error(`${label}[${index}] must be finite.`)
  }
}

export function validateSpiegelibSimpleFmMlpModel(value: unknown): asserts value is SpiegelibSimpleFmMlpModel {
  if (typeof value !== 'object' || value === null) throw new Error('SpiegeLib MLP model must be an object.')
  const model = value as Partial<SpiegelibSimpleFmMlpModel>
  if (model.schema !== SPIEGELIB_SIMPLE_FM_MLP_SCHEMA) throw new Error('Unsupported SpiegeLib MLP model schema.')
  if (model.inputSize !== 572 || model.outputSize !== 9) throw new Error('SpiegeLib MLP model must use the pinned 572-input/9-output shape.')
  if (!Array.isArray(model.layers) || model.layers.length !== EXPECTED_LAYERS.length) {
    throw new Error(`SpiegeLib MLP model must contain exactly ${EXPECTED_LAYERS.length} Dense layers.`)
  }

  model.layers.forEach((layer, index) => {
    const expected = EXPECTED_LAYERS[index]
    if (!expected) throw new Error(`Unexpected Dense layer ${index}.`)
    if (layer.name !== expected.name
      || layer.inputSize !== expected.inputSize
      || layer.outputSize !== expected.outputSize
      || layer.activation !== expected.activation) {
      throw new Error(`SpiegeLib MLP layer ${index} does not match the pinned architecture.`)
    }
    assertFiniteArray(`${layer.name}.kernel`, layer.kernel, layer.inputSize * layer.outputSize)
    assertFiniteArray(`${layer.name}.bias`, layer.bias, layer.outputSize)
  })
}

function dense(
  input: Float32Array,
  layer: SpiegelibSimpleFmDenseLayer,
): Float32Array {
  const output = new Float32Array(layer.outputSize)
  for (let outputIndex = 0; outputIndex < layer.outputSize; outputIndex += 1) {
    let sum = Math.fround(layer.bias[outputIndex] ?? 0)
    for (let inputIndex = 0; inputIndex < layer.inputSize; inputIndex += 1) {
      const weight = layer.kernel[inputIndex * layer.outputSize + outputIndex] ?? 0
      sum = Math.fround(sum + Math.fround((input[inputIndex] ?? 0) * weight))
    }
    output[outputIndex] = layer.activation === 'relu' ? Math.max(0, sum) : sum
  }
  return output
}

export function runSpiegelibSimpleFmMlp(
  model: SpiegelibSimpleFmMlpModel,
  standardizedFeatures: ArrayLike<number>,
): Float32Array {
  validateSpiegelibSimpleFmMlpModel(model)
  if (standardizedFeatures.length !== model.inputSize) {
    throw new Error(`SpiegeLib MLP input must contain exactly ${model.inputSize} standardized MFCC values.`)
  }

  let current = new Float32Array(model.inputSize)
  for (let index = 0; index < model.inputSize; index += 1) {
    const value = standardizedFeatures[index]
    if (value === undefined || !Number.isFinite(value)) throw new Error(`SpiegeLib MLP input[${index}] must be finite.`)
    current[index] = value
  }
  for (const layer of model.layers) current = dense(current, layer)
  return current
}
