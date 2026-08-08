import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Dx7Voice } from '../domain/voice'
import { createAudioDescriptorProfile } from './audioDescriptors'
import { compareAudioDescriptorFingerprints, createAudioDescriptorFingerprint } from './audioDescriptorFingerprint'
import { COMPACT_PRESET_DESCRIPTOR_CONFIG, COMPACT_PRESET_PROBES, type CompactPresetRankedCandidate } from './compactPresetIndex'
import { createDx7RendererFingerprintObjective, refineRetrievedDx7Candidates } from './dx7CmaEsRefinement'
import { createMsfaOfflineEngine, type MsfaEmscriptenModule } from './msfaOfflineEngine'
import { createMemoryPresetFingerprintCache } from './presetFingerprintCache'
import { compareReconstructionApproaches, type ReconstructionApproach, type ReconstructionComparisonCase } from './reconstructionComparison'
import { createVirtualDx7ReferenceVoice } from './virtualDx7ReferenceFixture'
import { createVirtualDx7RenderPlan } from './virtualDx7Engine'

async function loadPackagedModule(): Promise<MsfaEmscriptenModule> {
  const moduleUrl = new URL('../../public/virtual-dx7/fm1-msfa.mjs', import.meta.url)
  const wasmUrl = new URL('../../public/virtual-dx7/fm1-msfa.wasm', import.meta.url)
  const imported = await import(/* @vite-ignore */ moduleUrl.href) as {
    default?: (options?: { wasmBinary?: Uint8Array }) => Promise<MsfaEmscriptenModule>
  }
  if (typeof imported.default !== 'function') throw new Error('Packaged MSFA factory is unavailable')
  return imported.default({ wasmBinary: new Uint8Array(readFileSync(wasmUrl)) })
}

function withOutputOffsets(voice: Dx7Voice, offsets: readonly number[], feedback: number, name: string): Dx7Voice {
  const operators = voice.operators.map((operator, index) => ({
    ...operator,
    outputLevel: Math.max(0, Math.min(99, operator.outputLevel + (offsets[index] ?? 0))),
  })) as unknown as Dx7Voice['operators']
  const { source, ...semantic } = voice
  void source
  return { ...semantic, name, operators, feedback }
}

describe('packaged-engine reconstruction comparison', () => {
  it('records retrieval, evolutionary and unavailable learned-initialization outcomes on repository-owned synthetic ground truth', async () => {
    const probe = COMPACT_PRESET_PROBES.find((candidate) => candidate.id === 'c4-main') ?? COMPACT_PRESET_PROBES[0]
    if (!probe) throw new Error('Missing standardized C4 comparison probe.')

    const module = await loadPackagedModule()
    const engine = createMsfaOfflineEngine({ moduleFactory: async () => module })
    const targetVoice = createVirtualDx7ReferenceVoice()
    const targetPlan = createVirtualDx7RenderPlan({ voice: targetVoice, sampleRate: 48_000, ...probe })
    const targetRender = await engine.render(targetPlan)
    const referenceFingerprint = createAudioDescriptorFingerprint(
      createAudioDescriptorProfile(targetRender.samples, targetRender.sampleRate, COMPACT_PRESET_DESCRIPTOR_CONFIG),
    )
    const objective = createDx7RendererFingerprintObjective(referenceFingerprint, engine, probe, {
      descriptorConfig: COMPACT_PRESET_DESCRIPTOR_CONFIG,
      fingerprintCache: createMemoryPresetFingerprintCache(),
    })

    const starts = [
      withOutputOffsets(targetVoice, [-10, -8, -6, -8, -5, -4], 2, 'SYNTH START A'),
      withOutputOffsets(targetVoice, [-22, -18, -16, -20, -14, -12], 1, 'SYNTH START B'),
      withOutputOffsets(targetVoice, [-35, -28, -24, -30, -22, -18], 0, 'SYNTH START C'),
    ]

    const ranked: CompactPresetRankedCandidate[] = []
    for (let index = 0; index < starts.length; index += 1) {
      const voice = starts[index]
      if (!voice) continue
      const evaluated = await objective.evaluate(voice)
      ranked.push({
        id: `synthetic-start-${index + 1}`,
        voice,
        sourceLabel: `Repository-owned synthetic start ${index + 1}`,
        matchedProbe: probe,
        renderKey: evaluated.renderKey,
        distance: evaluated.distance,
        score: 1 / (1 + evaluated.distance),
        metrics: evaluated.metrics,
      })
    }
    ranked.sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))

    const testCase: ReconstructionComparisonCase<{ fingerprintId: string }> = {
      id: 'repo-synthetic-fm1-ref-v1',
      label: 'Repository synthetic FM1 REF V1',
      kind: 'synthetic-ground-truth',
      reference: { fingerprintId: targetPlan.renderKey },
      groundTruthVoice: targetVoice,
    }

    const retrieval: ReconstructionApproach<{ fingerprintId: string }> = {
      id: 'retrieval',
      label: 'Retrieval only',
      async run() {
        return ranked.map((candidate) => ({ voice: candidate.voice, sourceInitialization: candidate.sourceLabel }))
      },
    }

    const evolutionary: ReconstructionApproach<{ fingerprintId: string }> = {
      id: 'evolutionary',
      label: 'Seeded constrained CMA-ES',
      async run(_case, signal) {
        const refined = await refineRetrievedDx7Candidates(ranked, referenceFingerprint, engine, {
          startCount: 2,
          groups: ['output-feedback'],
          seed: 2026,
          descriptorConfig: COMPACT_PRESET_DESCRIPTOR_CONFIG,
          fingerprintCache: createMemoryPresetFingerprintCache(),
          ...(signal === undefined ? {} : { signal }),
          cmaEs: { populationSize: 8, maxGenerations: 8, sigma: 0.2, targetScore: 0 },
        })
        return refined.map((result) => ({
          voice: result.bestVoice,
          sourceInitialization: `CMA from ${result.sourceCandidate.sourceLabel}`,
        }))
      },
    }

    const learned: ReconstructionApproach<{ fingerprintId: string }> = {
      id: 'learned-initialization',
      label: 'Learned initialization',
      async run() {
        throw new Error('No license-admitted learned initializer/checkpoint is available yet.')
      },
    }

    const report = await compareReconstructionApproaches([testCase], [retrieval, evolutionary, learned], {
      async evaluateCandidate(_case, candidate, signal) {
        const evaluated = await objective.evaluate(candidate.voice, signal)
        const metrics: Readonly<Record<string, number>> = {
          envelope: evaluated.metrics.envelope,
          mel: evaluated.metrics.mel,
          mfcc: evaluated.metrics.mfcc,
          centroid: evaluated.metrics.centroid,
          rolloff: evaluated.metrics.rolloff,
          flatness: evaluated.metrics.flatness,
          total: evaluated.metrics.total,
        }
        return { distance: evaluated.distance, metrics }
      },
    })

    const retrievalResult = report.results.find((result) => result.approachId === 'retrieval')
    const evolutionaryResult = report.results.find((result) => result.approachId === 'evolutionary')
    const learnedResult = report.results.find((result) => result.approachId === 'learned-initialization')
    expect(retrievalResult?.candidateCount).toBe(3)
    expect(retrievalResult?.bestDistance).not.toBeNull()
    expect(evolutionaryResult?.candidateCount).toBe(2)
    expect(evolutionaryResult?.bestDistance).not.toBeNull()
    expect(learnedResult).toMatchObject({ candidateCount: 0, bestDistance: null, failure: 'No license-admitted learned initializer/checkpoint is available yet.' })

    if (retrievalResult?.bestDistance === null || retrievalResult?.bestDistance === undefined || evolutionaryResult?.bestDistance === null || evolutionaryResult?.bestDistance === undefined) {
      throw new Error('Synthetic comparison did not produce retrieval/evolutionary distances.')
    }

    const directTargetMetrics = compareAudioDescriptorFingerprints(referenceFingerprint, referenceFingerprint)
    expect(directTargetMetrics.total).toBeCloseTo(0, 12)
    expect(Number.isFinite(retrievalResult.runtimeMs)).toBe(true)
    expect(Number.isFinite(evolutionaryResult.runtimeMs)).toBe(true)

    const outputPath = process.env.FM1_RECONSTRUCTION_COMPARISON_RESULT
    if (outputPath) {
      writeFileSync(outputPath, `${JSON.stringify({
        ...report,
        benchmark: {
          engineId: engine.engineId,
          engineVersion: engine.engineVersion,
          sampleRate: 48_000,
          probe,
          retrievalVsEvolutionaryDelta: retrievalResult.bestDistance - evolutionaryResult.bestDistance,
          learnedStatus: learnedResult?.failure ?? null,
          note: 'Repository-owned synthetic ground truth only; no real isolated-sound claim.',
        },
      }, null, 2)}\n`, 'utf8')
    }

    console.info('synthetic-reconstruction-comparison', JSON.stringify({
      retrievalDistance: retrievalResult.bestDistance,
      evolutionaryDistance: evolutionaryResult.bestDistance,
      retrievalRuntimeMs: retrievalResult.runtimeMs,
      evolutionaryRuntimeMs: evolutionaryResult.runtimeMs,
      learnedFailure: learnedResult?.failure,
    }))
  }, 60_000)
})
