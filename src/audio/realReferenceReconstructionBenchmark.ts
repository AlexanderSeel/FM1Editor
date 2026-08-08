import type { Dx7Voice } from '../domain/voice'
import { createAudioDescriptorProfile } from './audioDescriptors'
import { createAudioDescriptorFingerprint } from './audioDescriptorFingerprint'
import {
  buildCompactPresetDescriptorIndex,
  COMPACT_PRESET_DESCRIPTOR_CONFIG,
  COMPACT_PRESET_PROBES,
  rankCompactPresetDescriptorIndex,
  type CompactPresetRankedCandidate,
} from './compactPresetIndex'
import {
  loadBundledCatalogPresetCandidates,
  type LoadCatalogPresetCandidateOptions,
} from './catalogPresetCandidates'
import {
  createDx7RendererFingerprintObjective,
  refineRetrievedDx7Candidates,
  type Dx7RetrievedRefinementOptions,
} from './dx7CmaEsRefinement'
import { createMsfaOfflineEngine } from './msfaOfflineEngine'
import { frequencyToMidiNote, type PresetIndexCandidate, type PresetRenderProbe } from './nearestPreset'
import { createMemoryPresetFingerprintCache, type PresetFingerprintCache } from './presetFingerprintCache'
import {
  compareReconstructionApproaches,
  type ReconstructionApproach,
  type ReconstructionCandidate,
  type ReconstructionComparisonReport,
} from './reconstructionComparison'
import type { PreparedReferenceAudio } from './referenceAudio'
import type { VirtualDx7OfflineEngine, VirtualDx7SampleRate } from './virtualDx7Engine'

export const REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA = 'fm1-editor.real-reference-reconstruction-benchmark.v1' as const
export const REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES = 256
export const REAL_REFERENCE_BENCHMARK_DEFAULT_RANK_LIMIT = 8
export const REAL_REFERENCE_BENCHMARK_DEFAULT_REFINEMENT_STARTS = 3
export const REAL_REFERENCE_BENCHMARK_DEFAULT_SEED = 2026
/** Retained so older receipts with the pre-admission blocked row remain parseable. */
export const REAL_REFERENCE_LEARNED_BLOCK = 'No license-admitted learned initializer/checkpoint is available yet.' as const
export const REAL_REFERENCE_LEARNED_STATUS = 'Local SpiegeLib simple-FM MLP · 9 OP2 controls + fixed training base' as const

export type RealReferenceAuditionApproachId = 'retrieval' | 'evolutionary' | 'learned-initialization'

export interface RealReferenceBenchmarkAuditionCandidate {
  readonly approachId: RealReferenceAuditionApproachId
  readonly sourceInitialization: string
  readonly distance: number
  /** Exact semantic DX7 winner used for reproducible local audition; raw reference audio and packed provenance bytes are excluded. */
  readonly voice: Dx7Voice
}

export type RealReferenceBenchmarkPhase = 'catalog' | 'index' | 'refinement' | 'comparison'

export interface RealReferenceBenchmarkProgress {
  readonly phase: RealReferenceBenchmarkPhase
  readonly completed: number
  readonly total: number
  readonly current: string
}

export interface RealReferenceReconstructionBenchmarkReport {
  readonly schema: typeof REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA
  readonly createdAt: string
  readonly reference: {
    readonly kind: 'real-isolated-sound'
    readonly declaredIsolated: true
    readonly filename: string
    readonly mimeType: string | null
    readonly contentSha256: string
    readonly sampleRate: number
    readonly durationSeconds: number
    readonly selectedRegion: { readonly startSeconds: number; readonly endSeconds: number }
    readonly analysisPitchHz: number | null
    readonly pitchSource: PreparedReferenceAudio['pitchSource']
  }
  readonly configuration: {
    readonly catalogCandidateCount: number
    readonly requestedMaxVoices: number | null
    readonly rankLimit: number
    readonly refinementStarts: number
    readonly seed: number
    readonly sampleRate: VirtualDx7SampleRate
    readonly probe: PresetRenderProbe
    readonly refinementGroups: readonly ['output-feedback']
  }
  readonly sharedPreparationMs: number
  readonly comparison: ReconstructionComparisonReport
  readonly retrievalVsEvolutionaryDelta: number | null
  /** Present on current receipts so structured listening can reproduce the exact three metric winners. Legacy receipts may omit it. */
  readonly auditionCandidates?: readonly RealReferenceBenchmarkAuditionCandidate[]
  readonly learnedStatus: string
  readonly note: string
}

export interface RunRealReferenceReconstructionBenchmarkOptions {
  readonly declaredIsolated: boolean
  readonly maxVoices?: number
  readonly rankLimit?: number
  readonly refinementStarts?: number
  readonly seed?: number
  readonly sampleRate?: VirtualDx7SampleRate
  readonly probeOverride?: PresetRenderProbe
  readonly engine?: VirtualDx7OfflineEngine
  readonly fingerprintCache?: PresetFingerprintCache
  readonly loadCandidates?: (options: LoadCatalogPresetCandidateOptions) => Promise<readonly PresetIndexCandidate[]>
  readonly cmaEs?: Dx7RetrievedRefinementOptions['cmaEs']
  readonly signal?: AbortSignal
  readonly now?: () => number
  readonly createdAt?: () => Date
  readonly onProgress?: (progress: RealReferenceBenchmarkProgress) => void
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Real-reference reconstruction benchmark was cancelled.', 'AbortError')
}

function resampleMonoLinear(samples: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) {
    throw new RangeError('Benchmark sample rates must be positive finite numbers.')
  }
  if (sourceRate === targetRate) return samples.slice()
  const targetLength = Math.max(1, Math.round(samples.length * targetRate / sourceRate))
  const output = new Float32Array(targetLength)
  if (samples.length === 1) {
    output.fill(samples[0] ?? 0)
    return output
  }
  for (let index = 0; index < targetLength; index += 1) {
    const sourcePosition = targetLength === 1 ? 0 : index * (samples.length - 1) / (targetLength - 1)
    const left = Math.floor(sourcePosition)
    const right = Math.min(samples.length - 1, left + 1)
    const fraction = sourcePosition - left
    output[index] = (samples[left] ?? 0) * (1 - fraction) + (samples[right] ?? 0) * fraction
  }
  return output
}

function selectProbe(reference: PreparedReferenceAudio): PresetRenderProbe {
  const fallback = COMPACT_PRESET_PROBES.find((probe) => probe.id === 'c4-main') ?? COMPACT_PRESET_PROBES[0]
  if (!fallback) throw new Error('No standardized reconstruction probes are configured.')
  const pitch = reference.analysisPitchHz
  if (!pitch || !Number.isFinite(pitch) || pitch <= 0) return fallback
  const midiNote = frequencyToMidiNote(pitch)
  if (midiNote === null) return fallback
  return [...COMPACT_PRESET_PROBES].sort(
    (left, right) => Math.abs(left.midiNote - midiNote) - Math.abs(right.midiNote - midiNote),
  )[0] ?? fallback
}

function metricRecord(metrics: {
  readonly envelope: number
  readonly mel: number
  readonly mfcc: number
  readonly centroid: number
  readonly rolloff: number
  readonly flatness: number
  readonly total: number
}): Readonly<Record<string, number>> {
  return {
    envelope: metrics.envelope,
    mel: metrics.mel,
    mfcc: metrics.mfcc,
    centroid: metrics.centroid,
    rolloff: metrics.rolloff,
    flatness: metrics.flatness,
    total: metrics.total,
  }
}

function finitePositiveInteger(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved < 1) throw new RangeError(`${label} must be at least 1.`)
  return Math.floor(resolved)
}

export async function runRealReferenceReconstructionBenchmark(
  reference: PreparedReferenceAudio,
  options: RunRealReferenceReconstructionBenchmarkOptions,
): Promise<RealReferenceReconstructionBenchmarkReport> {
  if (!options.declaredIsolated) {
    throw new Error('Confirm that the selected reference is a real isolated sound before creating a real-sound benchmark receipt.')
  }
  if (!reference.filename || !reference.contentSha256) {
    throw new Error('A reproducible real-sound benchmark requires an uploaded file with filename and SHA-256 metadata.')
  }
  throwIfAborted(options.signal)

  const sampleRate = options.sampleRate ?? 48_000
  const rankLimit = finitePositiveInteger(options.rankLimit, REAL_REFERENCE_BENCHMARK_DEFAULT_RANK_LIMIT, 'rankLimit')
  const refinementStarts = finitePositiveInteger(options.refinementStarts, REAL_REFERENCE_BENCHMARK_DEFAULT_REFINEMENT_STARTS, 'refinementStarts')
  const seed = (options.seed ?? REAL_REFERENCE_BENCHMARK_DEFAULT_SEED) >>> 0
  const requestedMaxVoices = options.maxVoices === undefined
    ? null
    : finitePositiveInteger(options.maxVoices, REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES, 'maxVoices')
  const now = options.now ?? (() => performance.now())
  const preparationStartedAt = now()
  const loader = options.loadCandidates ?? loadBundledCatalogPresetCandidates
  const candidates = await loader({
    ...(requestedMaxVoices === null ? {} : { maxVoices: requestedMaxVoices }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    onProgress: (progress) => options.onProgress?.({
      phase: 'catalog',
      completed: progress.entriesScanned,
      total: progress.totalEligibleEntries,
      current: `${progress.currentEntry} · ${progress.voicesFound} voices`,
    }),
  })
  throwIfAborted(options.signal)
  if (candidates.length === 0) throw new Error('No checksum-valid catalog voices were available for the benchmark.')

  const probe = options.probeOverride ?? selectProbe(reference)
  const referenceSamples = resampleMonoLinear(reference.samples, reference.sampleRate, sampleRate)
  const referenceFingerprint = createAudioDescriptorFingerprint(
    createAudioDescriptorProfile(referenceSamples, sampleRate, COMPACT_PRESET_DESCRIPTOR_CONFIG),
  )
  const engine = options.engine ?? createMsfaOfflineEngine()
  const fingerprintCache = options.fingerprintCache ?? createMemoryPresetFingerprintCache()
  const sharedPreparationMs = Math.max(0, now() - preparationStartedAt)

  let rankedPromise: Promise<readonly CompactPresetRankedCandidate[]> | null = null
  const ensureRanked = (): Promise<readonly CompactPresetRankedCandidate[]> => {
    if (rankedPromise) return rankedPromise
    rankedPromise = (async () => {
      const index = await buildCompactPresetDescriptorIndex(candidates, engine, {
        sampleRate,
        probes: [probe],
        descriptorConfig: COMPACT_PRESET_DESCRIPTOR_CONFIG,
        fingerprintCache,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        onProgress: (completed, total, candidate) => options.onProgress?.({
          phase: 'index',
          completed,
          total,
          current: candidate.voice.name || candidate.sourceLabel,
        }),
      })
      throwIfAborted(options.signal)
      return rankCompactPresetDescriptorIndex(referenceFingerprint, index, {
        limit: rankLimit,
        referencePitchHz: reference.analysisPitchHz,
      })
    })()
    return rankedPromise
  }

  let retrievalCandidates: readonly ReconstructionCandidate[] = []
  let evolutionaryCandidates: readonly ReconstructionCandidate[] = []
  let learnedCandidates: readonly ReconstructionCandidate[] = []

  const retrieval: ReconstructionApproach<null> = {
    id: 'retrieval',
    label: 'Retrieval only',
    async run() {
      const ranked = await ensureRanked()
      const output = ranked.map((candidate) => ({ voice: candidate.voice, sourceInitialization: candidate.sourceLabel }))
      retrievalCandidates = output
      return output
    },
  }
  const evolutionary: ReconstructionApproach<null> = {
    id: 'evolutionary',
    label: 'Seeded constrained CMA-ES',
    async run(_testCase, signal) {
      const ranked = await ensureRanked()
      if (ranked.length === 0) return []
      const refined = await refineRetrievedDx7Candidates(ranked, referenceFingerprint, engine, {
        startCount: Math.min(refinementStarts, ranked.length),
        groups: ['output-feedback'],
        seed,
        sampleRate,
        descriptorConfig: COMPACT_PRESET_DESCRIPTOR_CONFIG,
        fingerprintCache,
        ...(signal === undefined ? {} : { signal }),
        ...(options.cmaEs === undefined ? {} : { cmaEs: options.cmaEs }),
        onProgress: (progress) => options.onProgress?.({
          phase: 'refinement',
          completed: progress.startIndex,
          total: progress.startCount,
          current: `${progress.sourceCandidate.voice.name || progress.sourceCandidate.sourceLabel} · generation ${progress.generation} · ${progress.evaluations} evaluations`,
        }),
      })
      const output = refined.map((result) => ({
        voice: result.bestVoice,
        sourceInitialization: `CMA from ${result.sourceCandidate.sourceLabel}`,
      }))
      evolutionaryCandidates = output
      return output
    },
  }
  const learned: ReconstructionApproach<null> = {
    id: 'learned-initialization',
    label: 'SpiegeLib learned initialization',
    async run(_testCase, signal) {
      throwIfAborted(signal)
      const { createSpiegelibSimpleFmCandidate072 } = await import('./spiegelibSimpleFmCandidate072')
      throwIfAborted(signal)
      const candidate = createSpiegelibSimpleFmCandidate072(reference.samples, reference.sampleRate, 'SPGL MLP')
      throwIfAborted(signal)
      const output = [{
        voice: candidate.voice,
        sourceInitialization: `${candidate.source} · nine OP2 controls + fixed training base`,
      }]
      learnedCandidates = output
      return output
    },
  }

  const objective = createDx7RendererFingerprintObjective(referenceFingerprint, engine, probe, {
    sampleRate,
    descriptorConfig: COMPACT_PRESET_DESCRIPTOR_CONFIG,
    fingerprintCache,
  })
  options.onProgress?.({ phase: 'comparison', completed: 0, total: 3, current: 'Comparing retrieval, CMA-ES and local SpiegeLib learned initialization' })
  const comparison = await compareReconstructionApproaches(
    [{
      id: `real:${reference.contentSha256.slice(0, 16)}`,
      label: reference.filename,
      kind: 'real-isolated-sound',
      reference: null,
    }],
    [retrieval, evolutionary, learned],
    {
      async evaluateCandidate(_testCase, candidate, signal) {
        const evaluated = await objective.evaluate(candidate.voice, signal)
        return { distance: evaluated.distance, metrics: metricRecord(evaluated.metrics) }
      },
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      now,
      ...(options.createdAt === undefined ? {} : { createdAt: options.createdAt }),
    },
  )
  throwIfAborted(options.signal)
  options.onProgress?.({ phase: 'comparison', completed: 3, total: 3, current: 'Comparison complete' })

  const retrievalResult = comparison.results.find((result) => result.approachId === 'retrieval')
  const evolutionaryResult = comparison.results.find((result) => result.approachId === 'evolutionary')
  const retrievalVsEvolutionaryDelta = retrievalResult?.bestDistance !== null
    && retrievalResult?.bestDistance !== undefined
    && evolutionaryResult?.bestDistance !== null
    && evolutionaryResult?.bestDistance !== undefined
    ? retrievalResult.bestDistance - evolutionaryResult.bestDistance
    : null

  const candidateSets: Readonly<Record<RealReferenceAuditionApproachId, readonly ReconstructionCandidate[]>> = {
    retrieval: retrievalCandidates,
    evolutionary: evolutionaryCandidates,
    'learned-initialization': learnedCandidates,
  }
  const auditionCandidates: RealReferenceBenchmarkAuditionCandidate[] = []
  for (const approachId of ['retrieval', 'evolutionary', 'learned-initialization'] as const) {
    const result = comparison.results.find((entry) => entry.approachId === approachId)
    if (!result || result.failure !== null || result.bestCandidateIndex === null || result.bestDistance === null) continue
    const candidate = candidateSets[approachId][result.bestCandidateIndex]
    if (!candidate) throw new Error(`Benchmark ${approachId} winner index no longer resolves to its evaluated candidate.`)
    const { source: _source, ...semanticVoice } = candidate.voice
    auditionCandidates.push({
      approachId,
      sourceInitialization: candidate.sourceInitialization,
      distance: result.bestDistance,
      voice: semanticVoice,
    })
  }

  return {
    schema: REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA,
    createdAt: comparison.createdAt,
    reference: {
      kind: 'real-isolated-sound',
      declaredIsolated: true,
      filename: reference.filename,
      mimeType: reference.mimeType ?? null,
      contentSha256: reference.contentSha256,
      sampleRate: reference.sampleRate,
      durationSeconds: reference.durationSeconds,
      selectedRegion: { ...reference.selectedRegion },
      analysisPitchHz: reference.analysisPitchHz,
      pitchSource: reference.pitchSource,
    },
    configuration: {
      catalogCandidateCount: candidates.length,
      requestedMaxVoices,
      rankLimit,
      refinementStarts: Math.min(refinementStarts, rankLimit, candidates.length),
      seed,
      sampleRate,
      probe: { ...probe },
      refinementGroups: ['output-feedback'],
    },
    sharedPreparationMs,
    comparison,
    retrievalVsEvolutionaryDelta,
    auditionCandidates,
    learnedStatus: REAL_REFERENCE_LEARNED_STATUS,
    note: 'User-declared isolated reference; audio remains local and is not embedded in this report. Current receipts retain the exact semantic DX7 winner for each successful benchmark approach so listening evidence can be reproduced without embedding audio or packed catalog provenance bytes. The learned row is a local SpiegeLib simple-FM MLP candidate that predicts nine historical Dexed OP2 controls over a fixed training base. Similarity metrics are comparative estimates, not proof of patch identity or exact FM-1 hardware equivalence.',
  }
}
