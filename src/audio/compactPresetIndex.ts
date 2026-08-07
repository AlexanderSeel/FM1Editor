import type { Dx7Voice } from '../domain/voice'
import {
  createAudioDescriptorProfile,
  DEFAULT_AUDIO_DESCRIPTOR_CONFIG,
  type AudioDescriptorConfig,
} from './audioDescriptors'
import {
  compareAudioDescriptorFingerprints,
  createAudioDescriptorFingerprint,
  type AudioDescriptorFingerprint,
  type FingerprintMetricBreakdown,
} from './audioDescriptorFingerprint'
import { frequencyToMidiNote, type PresetIndexCandidate, type PresetRenderProbe } from './nearestPreset'
import { createPresetFingerprintCacheKey, type PresetFingerprintCache } from './presetFingerprintCache'
import {
  createVirtualDx7RenderPlan,
  type VirtualDx7OfflineEngine,
  type VirtualDx7SampleRate,
} from './virtualDx7Engine'

export const COMPACT_PRESET_INDEX_SCHEMA = 'fm1-editor.compact-preset-index.v1' as const
export const COMPACT_PRESET_DESCRIPTOR_CONFIG: AudioDescriptorConfig = Object.freeze({
  ...DEFAULT_AUDIO_DESCRIPTOR_CONFIG,
  fftSizes: Object.freeze([512, 1024, 2048]),
  maxSpectralFrames: 16,
})
export const COMPACT_PRESET_PROBES: readonly PresetRenderProbe[] = Object.freeze([
  { id: 'c3-soft', midiNote: 48, velocity: 80, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 },
  { id: 'c4-main', midiNote: 60, velocity: 108, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 },
  { id: 'c5-main', midiNote: 72, velocity: 108, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 },
])

export interface CompactPresetIndexedProbe {
  readonly probe: PresetRenderProbe
  readonly renderKey: string
  readonly fingerprint: AudioDescriptorFingerprint
}
export interface CompactPresetIndexEntry {
  readonly id: string
  readonly voice: Dx7Voice
  readonly sourceLabel: string
  readonly probes: readonly CompactPresetIndexedProbe[]
}
export interface CompactPresetDescriptorIndex {
  readonly schema: typeof COMPACT_PRESET_INDEX_SCHEMA
  readonly engineId: string
  readonly engineVersion: string
  readonly sampleRate: VirtualDx7SampleRate
  readonly descriptorConfig: AudioDescriptorConfig
  readonly probes: readonly PresetRenderProbe[]
  readonly entries: readonly CompactPresetIndexEntry[]
}
export interface CompactPresetRankedCandidate {
  readonly id: string
  readonly voice: Dx7Voice
  readonly sourceLabel: string
  readonly matchedProbe: PresetRenderProbe
  readonly renderKey: string
  readonly distance: number
  readonly score: number
  readonly metrics: FingerprintMetricBreakdown
}

function abort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Preset index build was cancelled.', 'AbortError')
}
function copyConfig(config: AudioDescriptorConfig): AudioDescriptorConfig { return { ...config, fftSizes: [...config.fftSizes] } }
function copyProbe(probe: PresetRenderProbe): PresetRenderProbe { return { ...probe } }

export async function buildCompactPresetDescriptorIndex(
  candidates: readonly PresetIndexCandidate[],
  engine: VirtualDx7OfflineEngine,
  options: {
    readonly sampleRate?: VirtualDx7SampleRate
    readonly probes?: readonly PresetRenderProbe[]
    readonly descriptorConfig?: AudioDescriptorConfig
    readonly fingerprintCache?: PresetFingerprintCache
    readonly signal?: AbortSignal
    readonly onCacheHit?: (candidate: PresetIndexCandidate, probe: PresetRenderProbe) => void
    readonly onProgress?: (completed: number, total: number, candidate: PresetIndexCandidate, probe: PresetRenderProbe) => void
  } = {},
): Promise<CompactPresetDescriptorIndex> {
  abort(options.signal)
  const ids = new Set<string>()
  for (const candidate of candidates) {
    if (ids.has(candidate.id)) throw new Error(`Duplicate preset candidate id: ${candidate.id}`)
    ids.add(candidate.id)
  }
  const sampleRate = options.sampleRate ?? 48_000
  const probes = options.probes ?? COMPACT_PRESET_PROBES
  const descriptorConfig = options.descriptorConfig ?? COMPACT_PRESET_DESCRIPTOR_CONFIG
  const entries: CompactPresetIndexEntry[] = []
  let completed = 0
  const total = candidates.length * probes.length
  for (const candidate of candidates) {
    const indexedProbes: CompactPresetIndexedProbe[] = []
    for (const probe of probes) {
      abort(options.signal)
      const plan = createVirtualDx7RenderPlan({ voice: candidate.voice, sampleRate, ...probe })
      const cacheKey = createPresetFingerprintCacheKey({
        engineId: engine.engineId,
        engineVersion: engine.engineVersion,
        renderKey: plan.renderKey,
        descriptorConfig,
      })
      let fingerprint = options.fingerprintCache ? await options.fingerprintCache.get(cacheKey) : null
      abort(options.signal)
      if (fingerprint) {
        options.onCacheHit?.(candidate, probe)
      } else {
        const render = await engine.render(plan, options.signal)
        abort(options.signal)
        fingerprint = createAudioDescriptorFingerprint(
          createAudioDescriptorProfile(render.samples, render.sampleRate, descriptorConfig),
        )
        if (options.fingerprintCache) await options.fingerprintCache.put(cacheKey, fingerprint)
      }
      indexedProbes.push({ probe: copyProbe(probe), renderKey: plan.renderKey, fingerprint })
      completed += 1
      options.onProgress?.(completed, total, candidate, probe)
    }
    entries.push({ id: candidate.id, voice: candidate.voice, sourceLabel: candidate.sourceLabel, probes: indexedProbes })
  }
  return {
    schema: COMPACT_PRESET_INDEX_SCHEMA,
    engineId: engine.engineId,
    engineVersion: engine.engineVersion,
    sampleRate,
    descriptorConfig: copyConfig(descriptorConfig),
    probes: probes.map(copyProbe),
    entries,
  }
}

function targetProbe(probes: readonly PresetRenderProbe[], referencePitchHz?: number | null): PresetRenderProbe | undefined {
  if (probes.length === 0) return undefined
  if (!referencePitchHz || !Number.isFinite(referencePitchHz) || referencePitchHz <= 0) return probes.find((probe) => probe.id === 'c4-main') ?? probes[0]
  const target = frequencyToMidiNote(referencePitchHz)
  return [...probes].sort((left, right) => Math.abs(left.midiNote - target) - Math.abs(right.midiNote - target))[0]
}

export function rankCompactPresetDescriptorIndex(
  reference: AudioDescriptorFingerprint,
  index: CompactPresetDescriptorIndex,
  options: { readonly limit?: number; readonly referencePitchHz?: number | null } = {},
): readonly CompactPresetRankedCandidate[] {
  const probe = targetProbe(index.probes, options.referencePitchHz)
  if (!probe) return []
  const ranked = index.entries.map((entry) => {
    const indexed = entry.probes.find((item) => item.probe.id === probe.id) ?? entry.probes[0]
    if (!indexed) throw new Error(`Preset index entry ${entry.id} contains no probes.`)
    const metrics = compareAudioDescriptorFingerprints(reference, indexed.fingerprint)
    return {
      id: entry.id,
      voice: entry.voice,
      sourceLabel: entry.sourceLabel,
      matchedProbe: indexed.probe,
      renderKey: indexed.renderKey,
      distance: metrics.total,
      score: 1 / (1 + metrics.total),
      metrics,
    }
  }).sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
  return ranked.slice(0, Math.max(1, options.limit ?? 8))
}
