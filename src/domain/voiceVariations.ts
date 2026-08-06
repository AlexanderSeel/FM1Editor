import { getDx7Algorithm, type Dx7OperatorNumber } from './dx7Algorithms'
import {
  createInitializedVoice,
  type Dx7Curve,
  type Dx7Envelope,
  type Dx7LfoWaveform,
  type Dx7Operator,
  type Dx7Voice,
  type FourValues,
} from './voice'

export type VoiceMutationAmount = 'subtle' | 'medium' | 'strong'
export type InitializedVoiceVariantId = 'basic-sine' | 'bright-stack' | 'soft-bell' | 'solid-bass'
export type RandomSource = () => number

export interface InitializedVoiceVariant {
  readonly id: InitializedVoiceVariantId
  readonly label: string
  readonly description: string
}

export const INITIALIZED_VOICE_VARIANTS: readonly InitializedVoiceVariant[] = [
  { id: 'basic-sine', label: 'Basic sine', description: 'One clean carrier and neutral modulation settings.' },
  { id: 'bright-stack', label: 'Bright stack', description: 'Six additive carriers with harmonic ratios and light detune.' },
  { id: 'soft-bell', label: 'Soft bell', description: 'Three carrier/modulator pairs with decaying metallic overtones.' },
  { id: 'solid-bass', label: 'Solid bass', description: 'A compact modulation chain transposed one octave down.' },
]

const CURVES: readonly Dx7Curve[] = [
  'negative-linear',
  'negative-exponential',
  'positive-exponential',
  'positive-linear',
]

const WAVEFORMS: readonly Dx7LfoWaveform[] = [
  'triangle',
  'saw-down',
  'saw-up',
  'square',
  'sine',
  'sample-and-hold',
]

const MUTATION_SETTINGS: Readonly<Record<VoiceMutationAmount, { chance: number; span99: number; spanSmall: number }>> = {
  subtle: { chance: 0.24, span99: 5, spanSmall: 1 },
  medium: { chance: 0.46, span99: 12, spanSmall: 2 },
  strong: { chance: 0.72, span99: 25, spanSmall: 4 },
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

function cloneFour(values: FourValues): FourValues {
  return [values[0], values[1], values[2], values[3]]
}

function cloneEnvelope(envelope: Dx7Envelope): Dx7Envelope {
  return { rates: cloneFour(envelope.rates), levels: cloneFour(envelope.levels) }
}

function cloneOperator(operator: Dx7Operator): Dx7Operator {
  return {
    ...operator,
    envelope: cloneEnvelope(operator.envelope),
    keyboardScaling: { ...operator.keyboardScaling },
  }
}

export function cloneDx7Voice(voice: Dx7Voice): Dx7Voice {
  const source = voice.source
    ? {
        ...(voice.source.packed ? { packed: voice.source.packed.slice() } : {}),
        ...(voice.source.unpacked ? { unpacked: voice.source.unpacked.slice() } : {}),
      }
    : null

  return {
    ...voice,
    operators: voice.operators.map(cloneOperator) as [
      Dx7Operator,
      Dx7Operator,
      Dx7Operator,
      Dx7Operator,
      Dx7Operator,
      Dx7Operator,
    ],
    pitchEnvelope: cloneEnvelope(voice.pitchEnvelope),
    lfo: { ...voice.lfo },
    ...(source ? { source } : {}),
  }
}

function editableCopy(voice: Dx7Voice): Dx7Voice {
  const copy = cloneDx7Voice(voice)
  const { source: _source, ...editable } = copy
  return editable
}

function randomUnit(random: RandomSource): number {
  return Math.min(0.999999999, Math.max(0, random()))
}

function randomInteger(random: RandomSource, minimum: number, maximum: number): number {
  return minimum + Math.floor(randomUnit(random) * (maximum - minimum + 1))
}

function randomChoice<T>(random: RandomSource, values: readonly T[]): T {
  const choice = values[randomInteger(random, 0, values.length - 1)]
  if (choice === undefined) throw new Error('Cannot choose from an empty collection.')
  return choice
}

function replaceOperator(
  voice: Dx7Voice,
  index: number,
  operator: Dx7Operator,
): Dx7Voice {
  const operators = [...voice.operators] as [
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
  ]
  operators[index] = operator
  return { ...voice, operators }
}

function applyCarrierOutputs(voice: Dx7Voice, carrierLevel: number, modulatorLevel: number): Dx7Voice {
  const carriers = new Set(getDx7Algorithm(voice.algorithm).carriers)
  return voice.operators.reduce((current, operator, index) => replaceOperator(current, index, {
    ...operator,
    outputLevel: carriers.has((index + 1) as Dx7OperatorNumber) ? carrierLevel : modulatorLevel,
  }), voice)
}

export function createInitializedVoiceVariant(id: InitializedVoiceVariantId): Dx7Voice {
  if (id === 'basic-sine') return createInitializedVoice('INIT SINE')

  if (id === 'bright-stack') {
    const outputLevels = [99, 88, 78, 68, 58, 48]
    const coarse = [1, 2, 3, 4, 5, 6]
    const detune = [7, 8, 6, 9, 5, 10]
    let voice = createInitializedVoice('BRIGHTSTK')
    voice = { ...voice, algorithm: 32, feedback: 0 }
    return voice.operators.reduce((current, operator, index) => replaceOperator(current, index, {
      ...operator,
      envelope: { rates: [99, 82, 70, 58], levels: [99, 92, 80, 0] },
      outputLevel: outputLevels[index] ?? 48,
      frequencyCoarse: coarse[index] ?? 1,
      frequencyFine: 0,
      detune: detune[index] ?? 7,
      keyVelocitySensitivity: 2,
    }), voice)
  }

  if (id === 'soft-bell') {
    const coarse = [1, 2, 2, 3, 3, 5]
    const fine = [0, 18, 0, 36, 0, 64]
    let voice = createInitializedVoice('SOFT BELL')
    voice = { ...voice, algorithm: 5, feedback: 2, oscillatorKeySync: true }
    voice = applyCarrierOutputs(voice, 88, 66)
    return voice.operators.reduce((current, operator, index) => replaceOperator(current, index, {
      ...operator,
      envelope: {
        rates: [99, 72 - index * 3, 52 - index * 2, 38],
        levels: [99, 82, 36, 0],
      },
      frequencyCoarse: coarse[index] ?? 1,
      frequencyFine: fine[index] ?? 0,
      detune: index % 2 === 0 ? 7 : 8,
      keyVelocitySensitivity: 4,
      keyboardScaling: { ...operator.keyboardScaling, rightDepth: 18, rightCurve: 'negative-exponential' },
    }), voice)
  }

  let voice = createInitializedVoice('SOLID BASS')
  voice = { ...voice, algorithm: 1, feedback: 3, transpose: 12 }
  voice = applyCarrierOutputs(voice, 99, 68)
  const coarse = [1, 1, 2, 1, 3, 1]
  return voice.operators.reduce((current, operator, index) => replaceOperator(current, index, {
    ...operator,
    envelope: {
      rates: [99, 86 - index * 2, 62, 48],
      levels: [99, 92, index === 0 ? 78 : 58, 0],
    },
    frequencyCoarse: coarse[index] ?? 1,
    frequencyFine: index % 2 === 0 ? 0 : 12,
    detune: 7,
    keyVelocitySensitivity: 3,
  }), voice)
}

export function randomizeVoice(random: RandomSource = Math.random): Dx7Voice {
  const algorithm = randomInteger(random, 1, 32)
  const carriers = new Set(getDx7Algorithm(algorithm).carriers)
  const base = createInitializedVoice('RANDOM')
  const operators = base.operators.map((operator, index) => {
    const carrier = carriers.has((index + 1) as Dx7OperatorNumber)
    return {
      ...operator,
      envelope: {
        rates: [
          randomInteger(random, 65, 99),
          randomInteger(random, 45, 99),
          randomInteger(random, 35, 92),
          randomInteger(random, 28, 85),
        ] as FourValues,
        levels: [
          randomInteger(random, 72, 99),
          randomInteger(random, 45, 99),
          randomInteger(random, carrier ? 35 : 10, carrier ? 92 : 80),
          randomInteger(random, 0, 24),
        ] as FourValues,
      },
      keyboardScaling: {
        breakPoint: randomInteger(random, 24, 74),
        leftDepth: randomInteger(random, 0, 34),
        rightDepth: randomInteger(random, 0, 34),
        leftCurve: randomChoice(random, CURVES),
        rightCurve: randomChoice(random, CURVES),
        rateScaling: randomInteger(random, 0, 4),
      },
      amplitudeModulationSensitivity: randomInteger(random, 0, 2),
      keyVelocitySensitivity: randomInteger(random, 0, 5),
      outputLevel: carrier ? randomInteger(random, 68, 99) : randomInteger(random, 8, 86),
      oscillatorMode: 'ratio' as const,
      frequencyCoarse: randomInteger(random, 1, carrier ? 6 : 12),
      frequencyFine: randomInteger(random, 0, 99),
      detune: randomInteger(random, 4, 10),
    }
  }) as [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator]

  return {
    ...base,
    operators,
    algorithm,
    feedback: randomInteger(random, 0, 5),
    oscillatorKeySync: randomUnit(random) >= 0.35,
    pitchEnvelope: {
      rates: [
        randomInteger(random, 55, 99),
        randomInteger(random, 45, 99),
        randomInteger(random, 45, 99),
        randomInteger(random, 55, 99),
      ],
      levels: [
        randomInteger(random, 46, 54),
        randomInteger(random, 46, 54),
        randomInteger(random, 46, 54),
        50,
      ],
    },
    lfo: {
      speed: randomInteger(random, 20, 78),
      delay: randomInteger(random, 0, 55),
      pitchModulationDepth: randomInteger(random, 0, 32),
      amplitudeModulationDepth: randomInteger(random, 0, 32),
      keySync: randomUnit(random) >= 0.35,
      waveform: randomChoice(random, WAVEFORMS),
      pitchModulationSensitivity: randomInteger(random, 0, 4),
    },
    transpose: 24,
  }
}

function mutateValue(
  value: number,
  minimum: number,
  maximum: number,
  span: number,
  chance: number,
  random: RandomSource,
): number {
  if (randomUnit(random) >= chance) return value
  return clamp(value + randomInteger(random, -span, span), minimum, maximum)
}

function mutateFour(
  values: FourValues,
  span: number,
  chance: number,
  random: RandomSource,
): FourValues {
  return [
    mutateValue(values[0], 0, 99, span, chance, random),
    mutateValue(values[1], 0, 99, span, chance, random),
    mutateValue(values[2], 0, 99, span, chance, random),
    mutateValue(values[3], 0, 99, span, chance, random),
  ]
}

export function mutateVoice(
  voice: Dx7Voice,
  amount: VoiceMutationAmount,
  random: RandomSource = Math.random,
): Dx7Voice {
  const settings = MUTATION_SETTINGS[amount]
  const editable = editableCopy(voice)
  const carriers = new Set(getDx7Algorithm(editable.algorithm).carriers)
  const curveChance = amount === 'strong' ? settings.chance * 0.18 : settings.chance * 0.06

  const operators = editable.operators.map((operator, index) => {
    const carrier = carriers.has((index + 1) as Dx7OperatorNumber)
    return {
      ...operator,
      envelope: {
        rates: mutateFour(operator.envelope.rates, settings.span99, settings.chance, random),
        levels: mutateFour(operator.envelope.levels, settings.span99, settings.chance, random),
      },
      keyboardScaling: {
        ...operator.keyboardScaling,
        breakPoint: mutateValue(operator.keyboardScaling.breakPoint, 0, 99, settings.span99, settings.chance * 0.55, random),
        leftDepth: mutateValue(operator.keyboardScaling.leftDepth, 0, 99, settings.span99, settings.chance * 0.7, random),
        rightDepth: mutateValue(operator.keyboardScaling.rightDepth, 0, 99, settings.span99, settings.chance * 0.7, random),
        leftCurve: randomUnit(random) < curveChance ? randomChoice(random, CURVES) : operator.keyboardScaling.leftCurve,
        rightCurve: randomUnit(random) < curveChance ? randomChoice(random, CURVES) : operator.keyboardScaling.rightCurve,
        rateScaling: mutateValue(operator.keyboardScaling.rateScaling, 0, 7, settings.spanSmall, settings.chance * 0.55, random),
      },
      amplitudeModulationSensitivity: mutateValue(operator.amplitudeModulationSensitivity, 0, 3, settings.spanSmall, settings.chance * 0.45, random),
      keyVelocitySensitivity: mutateValue(operator.keyVelocitySensitivity, 0, 7, settings.spanSmall, settings.chance * 0.55, random),
      outputLevel: mutateValue(operator.outputLevel, carrier ? 30 : 0, 99, settings.span99, settings.chance, random),
      frequencyCoarse: mutateValue(operator.frequencyCoarse, 0, 31, settings.spanSmall, settings.chance * 0.55, random),
      frequencyFine: mutateValue(operator.frequencyFine, 0, 99, settings.span99, settings.chance * 0.7, random),
      detune: mutateValue(operator.detune, 0, 14, settings.spanSmall, settings.chance * 0.7, random),
    }
  }) as [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator]

  return {
    ...editable,
    operators,
    pitchEnvelope: {
      rates: mutateFour(editable.pitchEnvelope.rates, settings.span99, settings.chance * 0.45, random),
      levels: mutateFour(editable.pitchEnvelope.levels, settings.span99, settings.chance * 0.35, random),
    },
    feedback: mutateValue(editable.feedback, 0, 7, settings.spanSmall, settings.chance * 0.5, random),
    lfo: {
      ...editable.lfo,
      speed: mutateValue(editable.lfo.speed, 0, 99, settings.span99, settings.chance * 0.55, random),
      delay: mutateValue(editable.lfo.delay, 0, 99, settings.span99, settings.chance * 0.45, random),
      pitchModulationDepth: mutateValue(editable.lfo.pitchModulationDepth, 0, 99, settings.span99, settings.chance * 0.45, random),
      amplitudeModulationDepth: mutateValue(editable.lfo.amplitudeModulationDepth, 0, 99, settings.span99, settings.chance * 0.45, random),
      pitchModulationSensitivity: mutateValue(editable.lfo.pitchModulationSensitivity, 0, 7, settings.spanSmall, settings.chance * 0.4, random),
      waveform: amount === 'strong' && randomUnit(random) < 0.12
        ? randomChoice(random, WAVEFORMS)
        : editable.lfo.waveform,
    },
  }
}
