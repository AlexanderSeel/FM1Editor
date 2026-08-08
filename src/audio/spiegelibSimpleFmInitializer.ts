import type { Dx7Operator, Dx7Voice } from '../domain/voice'

export const SPIEGELIB_SIMPLE_FM_UPSTREAM_COMMIT = 'e1baab7fbeb0bc3f4d4946f8348e77dd18028080' as const
export const SPIEGELIB_SIMPLE_FM_MODEL_PATH = 'saved_models/simple_fm_mlp.h5' as const
export const SPIEGELIB_SIMPLE_FM_CONFIG_PATH = 'synth_params/dexed_simple_fm.json' as const
export const SPIEGELIB_SIMPLE_FM_SCALER_PATH = 'data_simple_fm_mfcc/data_scaler.pkl' as const
export const SPIEGELIB_SIMPLE_FM_INPUT_SIZE = 572
export const SPIEGELIB_SIMPLE_FM_OUTPUT_SIZE = 9

export interface SpiegelibSimpleFmOutputDefinition {
  readonly outputIndex: number
  readonly dexedHostParameter: number
  readonly label: string
  readonly semanticField:
    | 'op2.envelope.rate2'
    | 'op2.envelope.rate3'
    | 'op2.envelope.rate4'
    | 'op2.envelope.level2'
    | 'op2.envelope.level3'
    | 'op2.envelope.level4'
    | 'op2.frequencyCoarse'
    | 'op2.frequencyFine'
    | 'op2.detune'
  readonly steps: 99 | 31 | 14
}

/**
 * Explicit training-label order for the nine non-overridden Dexed host parameters.
 * The upstream dataset generator stores SynthVST.get_patch() values in host-parameter
 * order. We persist that order here rather than reusing SpiegeLib's set-difference
 * expansion, whose ordering is not an API guarantee.
 */
export const SPIEGELIB_SIMPLE_FM_OUTPUTS: readonly SpiegelibSimpleFmOutputDefinition[] = Object.freeze([
  { outputIndex: 0, dexedHostParameter: 46, label: 'OP2 EG RATE 2', semanticField: 'op2.envelope.rate2', steps: 99 },
  { outputIndex: 1, dexedHostParameter: 47, label: 'OP2 EG RATE 3', semanticField: 'op2.envelope.rate3', steps: 99 },
  { outputIndex: 2, dexedHostParameter: 48, label: 'OP2 EG RATE 4', semanticField: 'op2.envelope.rate4', steps: 99 },
  { outputIndex: 3, dexedHostParameter: 50, label: 'OP2 EG LEVEL 2', semanticField: 'op2.envelope.level2', steps: 99 },
  { outputIndex: 4, dexedHostParameter: 51, label: 'OP2 EG LEVEL 3', semanticField: 'op2.envelope.level3', steps: 99 },
  { outputIndex: 5, dexedHostParameter: 52, label: 'OP2 EG LEVEL 4', semanticField: 'op2.envelope.level4', steps: 99 },
  { outputIndex: 6, dexedHostParameter: 55, label: 'OP2 F COARSE', semanticField: 'op2.frequencyCoarse', steps: 31 },
  { outputIndex: 7, dexedHostParameter: 56, label: 'OP2 F FINE', semanticField: 'op2.frequencyFine', steps: 99 },
  { outputIndex: 8, dexedHostParameter: 57, label: 'OP2 OSC DETUNE', semanticField: 'op2.detune', steps: 14 },
])

function dexedHostToInteger(value: number, steps: number): number {
  if (!Number.isFinite(value)) throw new RangeError('SpiegeLib model outputs must be finite numbers.')
  return Math.round(Math.min(1, Math.max(0, value)) * steps)
}

function frozenOperator(overrides: Partial<Dx7Operator> = {}): Dx7Operator {
  return {
    envelope: { rates: [0, 0, 0, 0], levels: [0, 0, 0, 0] },
    keyboardScaling: {
      breakPoint: 0,
      leftDepth: 0,
      rightDepth: 0,
      leftCurve: 'negative-linear',
      rightCurve: 'negative-linear',
      rateScaling: 0,
    },
    amplitudeModulationSensitivity: 0,
    keyVelocitySensitivity: 0,
    outputLevel: 0,
    oscillatorMode: 'ratio',
    frequencyCoarse: 0,
    frequencyFine: 0,
    detune: 0,
    ...overrides,
  }
}

/**
 * Reconstruct the fixed Dexed state used to generate the SpiegeLib simple-FM dataset.
 * Operator switches are not part of Yamaha's 155-byte voice payload; inactive OP3–OP6
 * are represented by the frozen zero output levels used by the upstream experiment.
 */
export function createSpiegelibSimpleFmBaseVoice(name = 'SPGL SIMPLE'): Dx7Voice {
  const op1 = frozenOperator({
    envelope: { rates: [89, 89, 89, 89], levels: [99, 99, 99, 0] },
    outputLevel: 99,
    frequencyCoarse: 16,
    detune: 7,
  })
  const op2 = frozenOperator({
    envelope: { rates: [89, 0, 0, 0], levels: [99, 0, 0, 0] },
    outputLevel: 99,
    detune: 0,
  })
  const silent = () => frozenOperator()

  return {
    name,
    operators: [op1, op2, silent(), silent(), silent(), silent()],
    pitchEnvelope: { rates: [0, 0, 0, 0], levels: [0, 0, 0, 0] },
    algorithm: 1,
    feedback: 0,
    oscillatorKeySync: true,
    lfo: {
      speed: 0,
      delay: 0,
      pitchModulationDepth: 0,
      amplitudeModulationDepth: 0,
      keySync: false,
      waveform: 'triangle',
      pitchModulationSensitivity: 0,
    },
    transpose: 24,
  }
}

export function applySpiegelibSimpleFmPrediction(
  prediction: ArrayLike<number>,
  name = 'SPGL MLP',
): Dx7Voice {
  if (prediction.length !== SPIEGELIB_SIMPLE_FM_OUTPUT_SIZE) {
    throw new RangeError(`SpiegeLib simple-FM prediction must contain exactly ${SPIEGELIB_SIMPLE_FM_OUTPUT_SIZE} values.`)
  }

  const voice = createSpiegelibSimpleFmBaseVoice(name)
  const op2 = voice.operators[1]
  const rates = [...op2.envelope.rates] as [number, number, number, number]
  const levels = [...op2.envelope.levels] as [number, number, number, number]

  rates[1] = dexedHostToInteger(prediction[0] ?? 0, 99)
  rates[2] = dexedHostToInteger(prediction[1] ?? 0, 99)
  rates[3] = dexedHostToInteger(prediction[2] ?? 0, 99)
  levels[1] = dexedHostToInteger(prediction[3] ?? 0, 99)
  levels[2] = dexedHostToInteger(prediction[4] ?? 0, 99)
  levels[3] = dexedHostToInteger(prediction[5] ?? 0, 99)

  const nextOp2: Dx7Operator = {
    ...op2,
    envelope: { rates, levels },
    frequencyCoarse: dexedHostToInteger(prediction[6] ?? 0, 31),
    frequencyFine: dexedHostToInteger(prediction[7] ?? 0, 99),
    detune: dexedHostToInteger(prediction[8] ?? 0, 14),
  }

  return {
    ...voice,
    operators: [voice.operators[0], nextOp2, voice.operators[2], voice.operators[3], voice.operators[4], voice.operators[5]],
  }
}
