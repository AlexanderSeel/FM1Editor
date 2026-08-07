import type { Dx7Voice } from '../domain/voice'
import {
  createAudioDescriptorProfile,
  type AudioDescriptorConfig,
} from './audioDescriptors'
import {
  compareAudioDescriptorFingerprints,
  createAudioDescriptorFingerprint,
  type AudioDescriptorFingerprint,
  type FingerprintMetricBreakdown,
} from './audioDescriptorFingerprint'
import {
  COMPACT_PRESET_DESCRIPTOR_CONFIG,
  type CompactPresetRankedCandidate,
} from './compactPresetIndex'
import {
  refineDx7VoiceWithCmaEs,
  type Dx7CmaEsOptions,
  type Dx7CmaEsResult,
  type Dx7EvolutionParameterGroup,
} from './dx7CmaEs'
import {
  createPresetFingerprintCacheKey,
  type PresetFingerprintCache,
} from './presetFingerprintCache'
import type { PresetRenderProbe } from './nearestPreset'
import {
  createVirtualDx7RenderPlan,
  type VirtualDx7OfflineEngine,
  type VirtualDx7SampleRate,
} from './virtualDx7Engine'

export const DX7_RENDERER_REFINEMENT_SCHEMA = 'fm1-editor.dx7-renderer-refinement.v1' as const

export interface Dx7RendererObjectiveEvaluation {
  readonly voice: Dx7Voice
  readonly renderKey: string
  readonly distance: number
  readonly metrics: FingerprintMetricBreakdown
  readonly cacheHit: boolean
}

export interface Dx7RendererFingerprintObjective {
  evaluate(voice: Dx7Voice, signal?: AbortSignal): Promise<Dx7RendererObjectiveEvaluation>
}

export interface Dx7RetrievedRefinementOptions {
  readonly startCount?: number
  readonly groups?: readonly Dx7EvolutionParameterGroup[]
  readonly seed?: number
  readonly sampleRate?: VirtualDx7SampleRate
  readonly descriptorConfig?: AudioDescriptorConfig
  readonly fingerprintCache?: PresetFingerprintCache
  readonly cmaEs?: Omit<Dx7CmaEsOptions, 'groups' | 'seed' | 'signal'>
  readonly signal?: AbortSignal
  readonly onProgress?: (progress: Dx7RetrievedRefinementProgress) => void
}

export interface Dx7RetrievedRefinementProgress {
  readonly startIndex: number
  readonly startCount: number
  readonly sourceCandidate: CompactPresetRankedCandidate
  readonly generation: number
  readonly evaluations: number
  readonly bestDistance: number
}

export interface Dx7RetrievedRefinementResult {
  readonly schema: typeof DX7_RENDERER_REFINEMENT_SCHEMA
  readonly sourceCandidate: CompactPresetRankedCandidate
  readonly initialDistance: number
  readonly bestDistance: number
  readonly improvement: number
  readonly bestVoice: Dx7Voice
  readonly initialMetrics: FingerprintMetricBreakdown
  readonly bestMetrics: FingerprintMetricBreakdown
  readonly optimizer: Dx7CmaEsResult
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('DX7 renderer-backed refinement was cancelled.', 'AbortError')
}

export function createDx7RendererFingerprintObjective(
  reference: AudioDescriptorFingerprint,
  engine: VirtualDx7OfflineEngine,
  probe: PresetRenderProbe,
  options: {
    readonly sampleRate?: VirtualDx7SampleRate
    readonly descriptorConfig?: AudioDescriptorConfig
    readonly fingerprintCache?: PresetFingerprintCache
  } = {},
): Dx7RendererFingerprintObjective {
  const sampleRate = options.sampleRate ?? 48_000
  const descriptorConfig = options.descriptorConfig ?? COMPACT_PRESET_DESCRIPTOR_CONFIG
  const memory = new Map<string, AudioDescriptorFingerprint>()

  return {
    async evaluate(voice, signal) {
      throwIfAborted(signal)
      const plan = createVirtualDx7RenderPlan({ voice, sampleRate, ...probe })
      const cacheKey = createPresetFingerprintCacheKey({
        engineId: engine.engineId,
        engineVersion: engine.engineVersion,
        renderKey: plan.renderKey,
        descriptorConfig,
      })
      let cacheHit = false
      let fingerprint = memory.get(cacheKey) ?? null
      if (fingerprint) {
        cacheHit = true
      } else if (options.fingerprintCache) {
        fingerprint = await options.fingerprintCache.get(cacheKey)
        cacheHit = fingerprint !== null
      }
      throwIfAborted(signal)
      if (!fingerprint) {
        const render = await engine.render(plan, signal)
        throwIfAborted(signal)
        fingerprint = createAudioDescriptorFingerprint(
          createAudioDescriptorProfile(render.samples, render.sampleRate, descriptorConfig),
        )
        if (options.fingerprintCache) await options.fingerprintCache.put(cacheKey, fingerprint)
      }
      memory.set(cacheKey, fingerprint)
      const metrics = compareAudioDescriptorFingerprints(reference, fingerprint)
      return { voice, renderKey: plan.renderKey, distance: metrics.total, metrics, cacheHit }
    },
  }
}

export async function refineRetrievedDx7Candidates(
  candidates: readonly CompactPresetRankedCandidate[],
  reference: AudioDescriptorFingerprint,
  engine: VirtualDx7OfflineEngine,
  options: Dx7RetrievedRefinementOptions = {},
): Promise<readonly Dx7RetrievedRefinementResult[]> {
  throwIfAborted(options.signal)
  if (candidates.length === 0) return []
  const startCount = Math.max(1, Math.min(candidates.length, Math.floor(options.startCount ?? 3)))
  const groups = options.groups?.length ? [...new Set(options.groups)] : ['output-feedback'] as const
  const baseSeed = (options.seed ?? 42) >>> 0
  const results: Dx7RetrievedRefinementResult[] = []

  for (let startIndex = 0; startIndex < startCount; startIndex += 1) {
    throwIfAborted(options.signal)
    const sourceCandidate = candidates[startIndex]
    if (!sourceCandidate) continue
    const objective = createDx7RendererFingerprintObjective(reference, engine, sourceCandidate.matchedProbe, {
      ...(options.sampleRate === undefined ? {} : { sampleRate: options.sampleRate }),
      ...(options.descriptorConfig === undefined ? {} : { descriptorConfig: options.descriptorConfig }),
      ...(options.fingerprintCache === undefined ? {} : { fingerprintCache: options.fingerprintCache }),
    })
    const initial = await objective.evaluate(sourceCandidate.voice, options.signal)
    const optimizer = await refineDx7VoiceWithCmaEs(
      sourceCandidate.voice,
      async (voice, context) => (await objective.evaluate(voice, context.signal)).distance,
      {
        ...options.cmaEs,
        groups,
        seed: (baseSeed + Math.imul(startIndex, 0x9E3779B9)) >>> 0,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        onProgress: (progress) => {
          options.cmaEs?.onProgress?.(progress)
          options.onProgress?.({
            startIndex,
            startCount,
            sourceCandidate,
            generation: progress.generation,
            evaluations: progress.evaluations,
            bestDistance: progress.bestScore,
          })
        },
      },
    )
    const best = await objective.evaluate(optimizer.bestVoice, options.signal)
    results.push({
      schema: DX7_RENDERER_REFINEMENT_SCHEMA,
      sourceCandidate,
      initialDistance: initial.distance,
      bestDistance: best.distance,
      improvement: initial.distance - best.distance,
      bestVoice: optimizer.bestVoice,
      initialMetrics: initial.metrics,
      bestMetrics: best.metrics,
      optimizer,
    })
  }

  return results.sort((left, right) => left.bestDistance - right.bestDistance || left.sourceCandidate.id.localeCompare(right.sourceCandidate.id))
}
