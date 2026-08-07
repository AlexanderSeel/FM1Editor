import type { Fm1FxState } from '../domain/fx'
import type { Dx7Voice } from '../domain/voice'
import { encodePcm16Wav } from './recorder'
import { createMsfaOfflineEngine } from './msfaOfflineEngine'
import { createVirtualFm1OutputRoute, VIRTUAL_FM1_MASTER_GAIN_DEFAULT_DB } from './virtualFm1OutputRoute'
import {
  createVirtualDx7RenderPlan,
  type VirtualDx7OfflineEngine,
  type VirtualDx7SampleRate,
} from './virtualDx7Engine'

export interface VirtualFm1DryChordRequest {
  readonly voice: Dx7Voice
  readonly midiNotes: readonly number[]
  readonly velocity?: number
  readonly sampleRate?: VirtualDx7SampleRate
  readonly noteOnSeconds?: number
  readonly releaseSeconds?: number
  readonly randomSeed?: number
}

export interface VirtualFm1DryChordRender {
  readonly sampleRate: VirtualDx7SampleRate
  readonly samples: Float32Array
  readonly renderKeys: readonly string[]
  readonly mixGain: number
  readonly peak: number
}

export interface VirtualFm1PreviewWavRequest extends VirtualFm1DryChordRequest {
  readonly fxState: Fm1FxState
  readonly fxEnabled?: boolean
  readonly masterGainDb?: number
  readonly fxTailSeconds?: number
}

export interface VirtualFm1PreviewWavResult {
  readonly sampleRate: VirtualDx7SampleRate
  readonly channels: readonly Float32Array[]
  readonly wav: Uint8Array
  readonly renderKeys: readonly string[]
  readonly dryMixPeak: number
  readonly dryMixGain: number
  readonly fxEnabled: boolean
  readonly masterGainDb: number
}

export type VirtualFm1PreviewProcessor = (
  samples: Float32Array,
  sampleRate: VirtualDx7SampleRate,
  options: {
    readonly fxState: Fm1FxState
    readonly fxEnabled: boolean
    readonly masterGainDb: number
    readonly fxTailSeconds: number
  },
) => Promise<readonly Float32Array[]>

function integerRange(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} through ${maximum}`)
  }
  return value
}

function finiteRange(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}`)
  }
  return value
}

function peakOf(samples: Float32Array): number {
  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  return peak
}

export async function renderVirtualFm1DryChord(
  request: VirtualFm1DryChordRequest,
  engine: VirtualDx7OfflineEngine = createMsfaOfflineEngine(),
  signal?: AbortSignal,
): Promise<VirtualFm1DryChordRender> {
  if (request.midiNotes.length === 0 || request.midiNotes.length > 16) {
    throw new RangeError('midiNotes must contain between 1 and 16 notes')
  }
  const notes = request.midiNotes.map((note, index) => integerRange(note, 0, 127, `midiNotes[${index}]`))
  const velocity = integerRange(request.velocity ?? 105, 1, 127, 'velocity')
  const sampleRate = request.sampleRate ?? 48_000
  const noteOnSeconds = finiteRange(request.noteOnSeconds ?? 1.5, 0.05, 30, 'noteOnSeconds')
  const releaseSeconds = finiteRange(request.releaseSeconds ?? 1, 0, 30, 'releaseSeconds')
  const randomSeed = integerRange(request.randomSeed ?? 42, 0, 0xffff_ffff, 'randomSeed')

  const renders = [] as Awaited<ReturnType<VirtualDx7OfflineEngine['render']>>[]
  for (const midiNote of notes) {
    if (signal?.aborted) throw new DOMException('Virtual FM-1 WAV render was cancelled.', 'AbortError')
    const plan = createVirtualDx7RenderPlan({
      voice: request.voice,
      midiNote,
      velocity,
      sampleRate,
      noteOnSeconds,
      releaseSeconds,
      randomSeed,
    })
    renders.push(await engine.render(plan, signal))
  }

  const frameCount = renders[0]?.frameCount ?? 0
  if (frameCount <= 0 || renders.some((render) => render.frameCount !== frameCount || render.sampleRate !== sampleRate)) {
    throw new Error('Virtual FM-1 note renders returned inconsistent PCM shapes.')
  }
  const mixed = new Float32Array(frameCount)
  const baseGain = 1 / Math.sqrt(renders.length)
  for (const render of renders) {
    for (let index = 0; index < frameCount; index += 1) {
      mixed[index] = (mixed[index] ?? 0) + (render.samples[index] ?? 0) * baseGain
    }
  }
  const unboundedPeak = peakOf(mixed)
  const safetyGain = unboundedPeak > 0.98 ? 0.98 / unboundedPeak : 1
  if (safetyGain !== 1) {
    for (let index = 0; index < mixed.length; index += 1) mixed[index] = (mixed[index] ?? 0) * safetyGain
  }
  return {
    sampleRate,
    samples: mixed,
    renderKeys: renders.map((render) => render.renderKey),
    mixGain: baseGain * safetyGain,
    peak: peakOf(mixed),
  }
}

export async function processVirtualFm1PreviewWithOfflineWebAudio(
  samples: Float32Array,
  sampleRate: VirtualDx7SampleRate,
  options: {
    readonly fxState: Fm1FxState
    readonly fxEnabled: boolean
    readonly masterGainDb: number
    readonly fxTailSeconds: number
  },
): Promise<readonly Float32Array[]> {
  if (typeof OfflineAudioContext === 'undefined') {
    throw new Error('Offline Web Audio is required for Virtual FM-1 preview WAV rendering.')
  }
  const tailFrames = Math.max(0, Math.ceil(finiteRange(options.fxTailSeconds, 0, 10, 'fxTailSeconds') * sampleRate))
  const context = new OfflineAudioContext(2, samples.length + tailFrames, sampleRate)
  const route = createVirtualFm1OutputRoute(context, options.fxState, {
    fxBypassed: !options.fxEnabled,
    masterGainDb: options.masterGainDb,
  })
  const buffer = context.createBuffer(1, samples.length, sampleRate)
  buffer.copyToChannel(Float32Array.from(samples), 0)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(route.input)
  source.start()
  try {
    const rendered = await context.startRendering()
    return Array.from({ length: rendered.numberOfChannels }, (_, channel) => rendered.getChannelData(channel).slice())
  } finally {
    route.dispose()
  }
}

export async function renderVirtualFm1PreviewWav(
  request: VirtualFm1PreviewWavRequest,
  dependencies: {
    readonly engine?: VirtualDx7OfflineEngine
    readonly processOutput?: VirtualFm1PreviewProcessor
  } = {},
  signal?: AbortSignal,
): Promise<VirtualFm1PreviewWavResult> {
  const dry = await renderVirtualFm1DryChord(request, dependencies.engine ?? createMsfaOfflineEngine(), signal)
  if (signal?.aborted) throw new DOMException('Virtual FM-1 WAV render was cancelled.', 'AbortError')
  const fxEnabled = request.fxEnabled ?? false
  const masterGainDb = request.masterGainDb ?? VIRTUAL_FM1_MASTER_GAIN_DEFAULT_DB
  const fxTailSeconds = request.fxTailSeconds ?? (fxEnabled ? 6 : 0.2)
  const processOutput = dependencies.processOutput ?? processVirtualFm1PreviewWithOfflineWebAudio
  const channels = await processOutput(dry.samples, dry.sampleRate, {
    fxState: request.fxState,
    fxEnabled,
    masterGainDb,
    fxTailSeconds,
  })
  if (channels.length === 0 || channels.some((channel) => channel.length === 0)) {
    throw new Error('Virtual FM-1 preview output processor returned no PCM channels.')
  }
  return {
    sampleRate: dry.sampleRate,
    channels,
    wav: encodePcm16Wav(channels, dry.sampleRate),
    renderKeys: dry.renderKeys,
    dryMixPeak: dry.peak,
    dryMixGain: dry.mixGain,
    fxEnabled,
    masterGainDb,
  }
}
