import type { Dx7Voice } from '../domain/voice'
import {
  createAudioDescriptorProfile,
  DEFAULT_AUDIO_DESCRIPTOR_CONFIG,
  type AudioDescriptorConfig,
  type AudioDescriptorProfile,
  type AudioSpectralResolutionDescriptor,
} from './audioDescriptors'
import {
  createVirtualDx7RenderPlan,
  type VirtualDx7OfflineEngine,
  type VirtualDx7SampleRate,
} from './virtualDx7Engine'

export const PRESET_DESCRIPTOR_INDEX_SCHEMA = 'fm1-editor.preset-descriptor-index.v1' as const

export interface PresetRenderProbe {
  readonly id: string
  readonly midiNote: number
  readonly velocity: number
  readonly noteOnSeconds: number
  readonly releaseSeconds: number
  readonly randomSeed: number
}

export const DEFAULT_PRESET_RENDER_PROBES: readonly PresetRenderProbe[] = Object.freeze([
  Object.freeze({ id: 'c3-medium', midiNote: 48, velocity: 80, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }),
  Object.freeze({ id: 'c4-strong', midiNote: 60, velocity: 108, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }),
  Object.freeze({ id: 'c5-strong', midiNote: 72, velocity: 108, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }),
])

export interface PresetIndexCandidate {
  readonly id: string
  readonly voice: Dx7Voice
  readonly sourceLabel: string
  readonly sourceId?: string
}

export interface PresetIndexedProbe {
  readonly probe: PresetRenderProbe
  readonly renderKey: string
  readonly descriptor: AudioDescriptorProfile
}

export interface PresetDescriptorIndexEntry {
  readonly id: string
  readonly voice: Dx7Voice
  readonly sourceLabel: string
  readonly sourceId?: string
  readonly probes: readonly PresetIndexedProbe[]
}

export interface PresetDescriptorIndex {
  readonly schema: typeof PRESET_DESCRIPTOR_INDEX_SCHEMA
  readonly engineId: string
  readonly engineVersion: string
  readonly sampleRate: VirtualDx7SampleRate
  readonly descriptorConfig: AudioDescriptorConfig
  readonly probes: readonly PresetRenderProbe[]
  readonly entries: readonly PresetDescriptorIndexEntry[]
}

export interface BuildPresetDescriptorIndexOptions {
  readonly sampleRate?: VirtualDx7SampleRate
  readonly probes?: readonly PresetRenderProbe[]
  readonly descriptorConfig?: AudioDescriptorConfig
  readonly signal?: AbortSignal
  readonly onProgress?: (completedRenders: number, totalRenders: number, candidate: PresetIndexCandidate, probe: PresetRenderProbe) => void
}

export interface DescriptorMetricBreakdown {
  readonly envelope: number
  readonly mel: number
  readonly mfcc: number
  readonly centroid: number
  readonly rolloff: number
  readonly flatness: number
  readonly total: number
}

export interface RankedPresetCandidate {
  readonly id: string
  readonly voice: Dx7Voice
  readonly sourceLabel: string
  readonly sourceId?: string
  readonly score: number
  readonly distance: number
  readonly matchedProbe: PresetRenderProbe
  readonly metrics: DescriptorMetricBreakdown
}

function abortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('Preset indexing was cancelled', 'AbortError')
  const error = new Error('Preset indexing was cancelled')
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError()
}

function validateProbe(probe: PresetRenderProbe): void {
  if (!probe.id) throw new Error('Preset render probe id is required.')
  if (!Number.isInteger(probe.midiNote) || probe.midiNote < 0 || probe.midiNote > 127) throw new RangeError(`${probe.id} MIDI note must be 0 through 127.`)
  if (!Number.isInteger(probe.velocity) || probe.velocity < 1 || probe.velocity > 127) throw new RangeError(`${probe.id} velocity must be 1 through 127.`)
  if (!Number.isFinite(probe.noteOnSeconds) || probe.noteOnSeconds < 0.01 || probe.noteOnSeconds > 30) throw new RangeError(`${probe.id} note-on duration is invalid.`)
  if (!Number.isFinite(probe.releaseSeconds) || probe.releaseSeconds < 0 || probe.releaseSeconds > 10) throw new RangeError(`${probe.id} release duration is invalid.`)
  if (!Number.isInteger(probe.randomSeed) || probe.randomSeed < 0 || probe.randomSeed > 0xffff_ffff) throw new RangeError(`${probe.id} random seed is invalid.`)
}

function cloneProbe(probe: PresetRenderProbe): PresetRenderProbe {
  return { ...probe }
}

export async function buildPresetDescriptorIndex(
  candidates: readonly PresetIndexCandidate[],
  engine: VirtualDx7OfflineEngine,
  options: BuildPresetDescriptorIndexOptions = {},
): Promise<PresetDescriptorIndex> {
  if (candidates.length === 0) throw new Error('Preset indexing requires at least one candidate voice.')
  const ids = new Set<string>()
  for (const candidate of candidates) {
    if (!candidate.id) throw new Error('Every preset index candidate requires an id.')
    if (ids.has(candidate.id)) throw new Error(`Duplicate preset index candidate id ${candidate.id}.`)
    ids.add(candidate.id)
  }
  const probes = options.probes ?? DEFAULT_PRESET_RENDER_PROBES
  if (probes.length === 0) throw new Error('Preset indexing requires at least one render probe.')
  probes.forEach(validateProbe)
  const sampleRate = options.sampleRate ?? 48_000
  const descriptorConfig = options.descriptorConfig ?? DEFAULT_AUDIO_DESCRIPTOR_CONFIG
  const totalRenders = candidates.length * probes.length
  let completedRenders = 0
  const entries: PresetDescriptorIndexEntry[] = []

  for (const candidate of candidates) {
    throwIfAborted(options.signal)
    const indexedProbes: PresetIndexedProbe[] = []
    for (const probe of probes) {
      throwIfAborted(options.signal)
      const plan = createVirtualDx7RenderPlan({
        voice: candidate.voice,
        midiNote: probe.midiNote,
        velocity: probe.velocity,
        sampleRate,
        noteOnSeconds: probe.noteOnSeconds,
        releaseSeconds: probe.releaseSeconds,
        randomSeed: probe.randomSeed,
      })
      const render = await engine.render(plan, options.signal)
      throwIfAborted(options.signal)
      const descriptor = createAudioDescriptorProfile(render.samples, render.sampleRate, descriptorConfig)
      indexedProbes.push({ probe: cloneProbe(probe), renderKey: render.renderKey, descriptor })
      completedRenders += 1
      options.onProgress?.(completedRenders, totalRenders, candidate, probe)
    }
    entries.push({
      id: candidate.id,
      voice: candidate.voice,
      sourceLabel: candidate.sourceLabel,
      ...(candidate.sourceId ? { sourceId: candidate.sourceId } : {}),
      probes: indexedProbes,
    })
  }

  return {
    schema: PRESET_DESCRIPTOR_INDEX_SCHEMA,
    engineId: engine.engineId,
    engineVersion: engine.engineVersion,
    sampleRate,
    descriptorConfig: { ...descriptorConfig, fftSizes: [...descriptorConfig.fftSizes] },
    probes: probes.map(cloneProbe),
    entries,
  }
}

function resample(values: Float32Array, targetLength: number): Float64Array {
  if (targetLength <= 0) return new Float64Array()
  const result = new Float64Array(targetLength)
  if (values.length === 0) return result
  if (values.length === 1) {
    result.fill(values[0] ?? 0)
    return result
  }
  if (targetLength === 1) {
    result[0] = values[0] ?? 0
    return result
  }
  for (let index = 0; index < targetLength; index += 1) {
    const position = index * (values.length - 1) / (targetLength - 1)
    const left = Math.floor(position)
    const right = Math.min(values.length - 1, left + 1)
    const fraction = position - left
    const leftValue = values[left] ?? 0
    const rightValue = values[right] ?? leftValue
    result[index] = leftValue + (rightValue - leftValue) * fraction
  }
  return result
}

function rootMeanSquareDifference(left: ArrayLike<number>, right: ArrayLike<number>): number {
  const length = Math.min(left.length, right.length)
  if (length === 0) return 0
  let sum = 0
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    sum += difference * difference
  }
  return Math.sqrt(sum / length)
}

function meanFrames(values: Float32Array, frameCount: number, width: number): Float64Array {
  const result = new Float64Array(width)
  if (frameCount <= 0 || width <= 0) return result
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let column = 0; column < width; column += 1) {
      result[column] = (result[column] ?? 0) + (values[frame * width + column] ?? 0) / frameCount
    }
  }
  return result
}

function normalizedMomentDifference(left: number, right: number, scale: number): number {
  return Math.abs(left - right) / Math.max(scale, 1e-9)
}

function matchingSpectralResolution(
  reference: AudioDescriptorProfile,
  candidate: AudioDescriptorProfile,
): readonly [AudioSpectralResolutionDescriptor, AudioSpectralResolutionDescriptor][] {
  const candidateBySize = new Map(candidate.spectral.map((resolution) => [resolution.fftSize, resolution] as const))
  return reference.spectral.flatMap((resolution) => {
    const match = candidateBySize.get(resolution.fftSize)
    return match ? [[resolution, match] as const] : []
  })
}

export function compareAudioDescriptors(reference: AudioDescriptorProfile, candidate: AudioDescriptorProfile): DescriptorMetricBreakdown {
  const envelopeReference = resample(reference.amplitudeEnvelopeRms, 64)
  const envelopeCandidate = resample(candidate.amplitudeEnvelopeRms, 64)
  const envelope = rootMeanSquareDifference(envelopeReference, envelopeCandidate)

  const pairs = matchingSpectralResolution(reference, candidate)
  if (pairs.length === 0) throw new Error('Reference and candidate descriptors share no FFT resolution.')
  let mel = 0
  let mfcc = 0
  let centroid = 0
  let rolloff = 0
  let flatness = 0
  for (const [left, right] of pairs) {
    const leftFrames = left.sampledFrameStarts.length
    const rightFrames = right.sampledFrameStarts.length
    const leftMelWidth = reference.config.melBands
    const rightMelWidth = candidate.config.melBands
    const melWidth = Math.min(leftMelWidth, rightMelWidth)
    const leftMfccWidth = reference.config.mfccCount
    const rightMfccWidth = candidate.config.mfccCount
    const mfccWidth = Math.min(leftMfccWidth, rightMfccWidth)
    mel += rootMeanSquareDifference(
      meanFrames(left.logMelSpectrum, leftFrames, leftMelWidth).slice(0, melWidth),
      meanFrames(right.logMelSpectrum, rightFrames, rightMelWidth).slice(0, melWidth),
    ) / 12
    mfcc += rootMeanSquareDifference(
      meanFrames(left.mfcc, leftFrames, leftMfccWidth).slice(0, mfccWidth),
      meanFrames(right.mfcc, rightFrames, rightMfccWidth).slice(0, mfccWidth),
    ) / 20
    const nyquist = Math.min(reference.sampleRate, candidate.sampleRate) / 2
    centroid += normalizedMomentDifference(left.centroidMoments.mean, right.centroidMoments.mean, nyquist)
    rolloff += normalizedMomentDifference(left.rolloffMoments.mean, right.rolloffMoments.mean, nyquist)
    flatness += Math.abs(left.flatnessMoments.mean - right.flatnessMoments.mean)
  }
  mel /= pairs.length
  mfcc /= pairs.length
  centroid /= pairs.length
  rolloff /= pairs.length
  flatness /= pairs.length

  const total = envelope * 1.25 + mel * 1.5 + mfcc * 1.25 + centroid + rolloff * 0.75 + flatness
  return { envelope, mel, mfcc, centroid, rolloff, flatness, total }
}

function midiDistance(probe: PresetRenderProbe, referenceMidiNote: number | null): number {
  return referenceMidiNote === null ? 0 : Math.abs(probe.midiNote - referenceMidiNote)
}

export function frequencyToMidiNote(frequencyHz: number | null | undefined): number | null {
  if (frequencyHz === null || frequencyHz === undefined) return null
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return null
  return Math.max(0, Math.min(127, Math.round(69 + 12 * Math.log2(frequencyHz / 440))))
}

export function rankPresetDescriptorIndex(
  reference: AudioDescriptorProfile,
  index: PresetDescriptorIndex,
  options: { readonly limit?: number; readonly referencePitchHz?: number | null } = {},
): readonly RankedPresetCandidate[] {
  const limit = options.limit ?? 8
  if (!Number.isInteger(limit) || limit <= 0) throw new RangeError('Nearest-preset result limit must be a positive integer.')
  const referenceMidiNote = frequencyToMidiNote(options.referencePitchHz)
  const ranked: RankedPresetCandidate[] = []

  for (const entry of index.entries) {
    if (entry.probes.length === 0) continue
    const candidates = entry.probes.map((probe) => ({
      probe,
      metrics: compareAudioDescriptors(reference, probe.descriptor),
      pitchDistance: midiDistance(probe.probe, referenceMidiNote),
    }))
    candidates.sort((left, right) => (
      left.pitchDistance - right.pitchDistance
      || left.metrics.total - right.metrics.total
      || left.probe.probe.id.localeCompare(right.probe.probe.id)
    ))
    const selected = candidates[0]
    if (!selected) continue
    const distance = selected.metrics.total
    ranked.push({
      id: entry.id,
      voice: entry.voice,
      sourceLabel: entry.sourceLabel,
      ...(entry.sourceId ? { sourceId: entry.sourceId } : {}),
      score: 1 / (1 + distance),
      distance,
      matchedProbe: selected.probe.probe,
      metrics: selected.metrics,
    })
  }

  return ranked
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
    .slice(0, limit)
}
