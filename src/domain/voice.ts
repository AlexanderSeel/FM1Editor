export type FourValues = readonly [number, number, number, number]

export interface Dx7Envelope {
  rates: FourValues
  levels: FourValues
}

export type Dx7Curve = 'negative-linear' | 'negative-exponential' | 'positive-exponential' | 'positive-linear'
export type Dx7OscillatorMode = 'ratio' | 'fixed'
export type Dx7LfoWaveform = 'triangle' | 'saw-down' | 'saw-up' | 'square' | 'sine' | 'sample-and-hold'

export interface Dx7KeyboardScaling {
  breakPoint: number
  leftDepth: number
  rightDepth: number
  leftCurve: Dx7Curve
  rightCurve: Dx7Curve
  rateScaling: number
}

export interface Dx7Operator {
  envelope: Dx7Envelope
  keyboardScaling: Dx7KeyboardScaling
  amplitudeModulationSensitivity: number
  keyVelocitySensitivity: number
  outputLevel: number
  oscillatorMode: Dx7OscillatorMode
  frequencyCoarse: number
  frequencyFine: number
  detune: number
}

export interface Dx7Lfo {
  speed: number
  delay: number
  pitchModulationDepth: number
  amplitudeModulationDepth: number
  keySync: boolean
  waveform: Dx7LfoWaveform
  pitchModulationSensitivity: number
}

export interface Dx7VoiceSource {
  packed?: Uint8Array
  unpacked?: Uint8Array
}

export interface Dx7Voice {
  name: string
  /** Operators are stored in UI order: OP1 through OP6. */
  operators: readonly [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator]
  pitchEnvelope: Dx7Envelope
  /** Human-facing algorithm number, 1 through 32. */
  algorithm: number
  feedback: number
  oscillatorKeySync: boolean
  lfo: Dx7Lfo
  transpose: number
  source?: Dx7VoiceSource
}

const initializedOperator = (): Dx7Operator => ({
  envelope: {
    rates: [99, 99, 99, 99],
    levels: [99, 99, 99, 0],
  },
  keyboardScaling: {
    breakPoint: 39,
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
  frequencyCoarse: 1,
  frequencyFine: 0,
  detune: 7,
})

export function createInitializedVoice(name = 'INIT VOICE'): Dx7Voice {
  const operators = Array.from({ length: 6 }, initializedOperator) as [
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
  ]

  operators[0] = { ...operators[0], outputLevel: 99 }

  return {
    name,
    operators,
    pitchEnvelope: {
      rates: [99, 99, 99, 99],
      levels: [50, 50, 50, 50],
    },
    algorithm: 1,
    feedback: 0,
    oscillatorKeySync: true,
    lfo: {
      speed: 35,
      delay: 0,
      pitchModulationDepth: 0,
      amplitudeModulationDepth: 0,
      keySync: true,
      waveform: 'triangle',
      pitchModulationSensitivity: 3,
    },
    transpose: 24,
  }
}
