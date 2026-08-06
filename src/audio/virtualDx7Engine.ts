import type {
  Dx7Envelope,
  Dx7Lfo,
  Dx7Operator,
  Dx7Voice,
  FourValues,
} from '../domain/voice'

export const VIRTUAL_DX7_RENDER_SCHEMA = 'fm1-editor.virtual-dx7-render-plan.v1' as const
export const VIRTUAL_DX7_ENGINE_FAMILY = 'msfa-compatible' as const
export const VIRTUAL_DX7_SAMPLE_RATES = [44_100, 48_000] as const

export type VirtualDx7SampleRate = (typeof VIRTUAL_DX7_SAMPLE_RATES)[number]
export type VirtualDx7SemanticVoice = Omit<Dx7Voice, 'name' | 'source'>

export interface VirtualDx7RenderRequest {
  voice: Dx7Voice
  midiNote: number
  velocity: number
  sampleRate: VirtualDx7SampleRate
  noteOnSeconds: number
  releaseSeconds: number
  randomSeed?: number
}

export interface VirtualDx7RenderPlan {
  schema: typeof VIRTUAL_DX7_RENDER_SCHEMA
  engineFamily: typeof VIRTUAL_DX7_ENGINE_FAMILY
  voice: VirtualDx7SemanticVoice
  midiNote: number
  velocity: number
  sampleRate: VirtualDx7SampleRate
  noteOnFrames: number
  releaseFrames: number
  totalFrames: number
  randomSeed: number
  renderKey: string
}

export interface VirtualDx7PcmRender {
  renderKey: string
  sampleRate: VirtualDx7SampleRate
  channelCount: 1
  frameCount: number
  samples: Float32Array
}

export interface VirtualDx7OfflineEngine {
  readonly engineId: string
  readonly engineVersion: string
  readonly licenseSpdx: string
  render(plan: VirtualDx7RenderPlan, signal?: AbortSignal): Promise<VirtualDx7PcmRender>
}

const DX7_CURVES = new Set(['negative-linear', 'negative-exponential', 'positive-exponential', 'positive-linear'])
const DX7_OSCILLATOR_MODES = new Set(['ratio', 'fixed'])
const DX7_LFO_WAVEFORMS = new Set(['triangle', 'saw-down', 'saw-up', 'square', 'sine', 'sample-and-hold'])

const enumValue = (value: string, values: ReadonlySet<string>, path: string): string => {
  if (!values.has(value)) {
    throw new RangeError(`${path} has an unsupported value`)
  }
  return value
}

const integerRange = (value: number, minimum: number, maximum: number, path: string): number => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${path} must be an integer from ${minimum} through ${maximum}`)
  }
  return value
}

const secondsRange = (value: number, minimum: number, maximum: number, path: string): number => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${path} must be a finite number from ${minimum} through ${maximum}`)
  }
  return value
}

const booleanValue = (value: boolean, path: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${path} must be a boolean`)
  }
  return value
}

const assertEnvelope = (envelope: Dx7Envelope, path: string): void => {
  if (envelope.rates.length !== 4 || envelope.levels.length !== 4) {
    throw new RangeError(`${path} must contain four rates and four levels`)
  }
  envelope.rates.forEach((value, index) => integerRange(value, 0, 99, `${path}.rates[${index}]`))
  envelope.levels.forEach((value, index) => integerRange(value, 0, 99, `${path}.levels[${index}]`))
}

const assertSemanticVoice = (voice: Dx7Voice): void => {
  if (voice.operators.length !== 6) {
    throw new RangeError('voice.operators must contain exactly six operators')
  }
  voice.operators.forEach((operator, index) => {
    const path = `voice.operators[${index}]`
    assertEnvelope(operator.envelope, `${path}.envelope`)
    integerRange(operator.keyboardScaling.breakPoint, 0, 99, `${path}.keyboardScaling.breakPoint`)
    integerRange(operator.keyboardScaling.leftDepth, 0, 99, `${path}.keyboardScaling.leftDepth`)
    integerRange(operator.keyboardScaling.rightDepth, 0, 99, `${path}.keyboardScaling.rightDepth`)
    integerRange(operator.keyboardScaling.rateScaling, 0, 7, `${path}.keyboardScaling.rateScaling`)
    enumValue(operator.keyboardScaling.leftCurve, DX7_CURVES, `${path}.keyboardScaling.leftCurve`)
    enumValue(operator.keyboardScaling.rightCurve, DX7_CURVES, `${path}.keyboardScaling.rightCurve`)
    integerRange(operator.amplitudeModulationSensitivity, 0, 3, `${path}.amplitudeModulationSensitivity`)
    integerRange(operator.keyVelocitySensitivity, 0, 7, `${path}.keyVelocitySensitivity`)
    integerRange(operator.outputLevel, 0, 99, `${path}.outputLevel`)
    enumValue(operator.oscillatorMode, DX7_OSCILLATOR_MODES, `${path}.oscillatorMode`)
    integerRange(operator.frequencyCoarse, 0, 31, `${path}.frequencyCoarse`)
    integerRange(operator.frequencyFine, 0, 99, `${path}.frequencyFine`)
    integerRange(operator.detune, 0, 14, `${path}.detune`)
  })
  assertEnvelope(voice.pitchEnvelope, 'voice.pitchEnvelope')
  integerRange(voice.algorithm, 1, 32, 'voice.algorithm')
  integerRange(voice.feedback, 0, 7, 'voice.feedback')
  booleanValue(voice.oscillatorKeySync, 'voice.oscillatorKeySync')
  integerRange(voice.lfo.speed, 0, 99, 'voice.lfo.speed')
  integerRange(voice.lfo.delay, 0, 99, 'voice.lfo.delay')
  integerRange(voice.lfo.pitchModulationDepth, 0, 99, 'voice.lfo.pitchModulationDepth')
  integerRange(voice.lfo.amplitudeModulationDepth, 0, 99, 'voice.lfo.amplitudeModulationDepth')
  booleanValue(voice.lfo.keySync, 'voice.lfo.keySync')
  enumValue(voice.lfo.waveform, DX7_LFO_WAVEFORMS, 'voice.lfo.waveform')
  integerRange(voice.lfo.pitchModulationSensitivity, 0, 7, 'voice.lfo.pitchModulationSensitivity')
  integerRange(voice.transpose, 0, 48, 'voice.transpose')
}

const copyFourValues = (values: FourValues): FourValues => [
  values[0],
  values[1],
  values[2],
  values[3],
]

const copyEnvelope = (envelope: Dx7Envelope): Dx7Envelope => ({
  rates: copyFourValues(envelope.rates),
  levels: copyFourValues(envelope.levels),
})

const copyOperator = (operator: Dx7Operator): Dx7Operator => ({
  envelope: copyEnvelope(operator.envelope),
  keyboardScaling: { ...operator.keyboardScaling },
  amplitudeModulationSensitivity: operator.amplitudeModulationSensitivity,
  keyVelocitySensitivity: operator.keyVelocitySensitivity,
  outputLevel: operator.outputLevel,
  oscillatorMode: operator.oscillatorMode,
  frequencyCoarse: operator.frequencyCoarse,
  frequencyFine: operator.frequencyFine,
  detune: operator.detune,
})

const copyLfo = (lfo: Dx7Lfo): Dx7Lfo => ({ ...lfo })

function snapshotSemanticVoice(voice: Dx7Voice): VirtualDx7SemanticVoice {
  const operators = voice.operators.map(copyOperator) as [
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
  ]

  return {
    operators,
    pitchEnvelope: copyEnvelope(voice.pitchEnvelope),
    algorithm: voice.algorithm,
    feedback: voice.feedback,
    oscillatorKeySync: voice.oscillatorKeySync,
    lfo: copyLfo(voice.lfo),
    transpose: voice.transpose,
  }
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function createVirtualDx7RenderPlan(request: VirtualDx7RenderRequest): VirtualDx7RenderPlan {
  if (!VIRTUAL_DX7_SAMPLE_RATES.some((sampleRate) => sampleRate === request.sampleRate)) {
    throw new RangeError('sampleRate must be 44100 or 48000')
  }
  assertSemanticVoice(request.voice)
  const midiNote = integerRange(request.midiNote, 0, 127, 'midiNote')
  const velocity = integerRange(request.velocity, 1, 127, 'velocity')
  const randomSeed = integerRange(request.randomSeed ?? 0, 0, 0xffff_ffff, 'randomSeed')
  const noteOnSeconds = secondsRange(request.noteOnSeconds, 0.01, 30, 'noteOnSeconds')
  const releaseSeconds = secondsRange(request.releaseSeconds, 0, 10, 'releaseSeconds')
  const voice = snapshotSemanticVoice(request.voice)
  const noteOnFrames = Math.ceil(noteOnSeconds * request.sampleRate)
  const releaseFrames = Math.ceil(releaseSeconds * request.sampleRate)
  const identity = {
    schema: VIRTUAL_DX7_RENDER_SCHEMA,
    engineFamily: VIRTUAL_DX7_ENGINE_FAMILY,
    voice,
    midiNote,
    velocity,
    sampleRate: request.sampleRate,
    noteOnFrames,
    releaseFrames,
    randomSeed,
  }

  return {
    ...identity,
    totalFrames: noteOnFrames + releaseFrames,
    renderKey: `dx7-render-v1-${fnv1a32(JSON.stringify(identity))}`,
  }
}

export function assertVirtualDx7PcmRender(
  plan: VirtualDx7RenderPlan,
  render: VirtualDx7PcmRender,
): void {
  if (render.renderKey !== plan.renderKey) {
    throw new Error('The PCM render key does not match the render plan')
  }
  if (render.sampleRate !== plan.sampleRate) {
    throw new Error('The PCM sample rate does not match the render plan')
  }
  if (render.channelCount !== 1) {
    throw new Error('The feasibility boundary accepts dry mono PCM only')
  }
  if (render.frameCount !== plan.totalFrames || render.samples.length !== plan.totalFrames) {
    throw new Error('The PCM frame count does not match the render plan')
  }
  for (let index = 0; index < render.samples.length; index += 1) {
    const sample = render.samples[index]
    if (sample === undefined || !Number.isFinite(sample) || sample < -1 || sample > 1) {
      throw new RangeError(`PCM sample ${index} must be finite and normalized to -1 through 1`)
    }
  }
}
