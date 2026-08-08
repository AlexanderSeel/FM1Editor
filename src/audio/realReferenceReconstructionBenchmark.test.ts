import { describe, expect, it } from 'vitest'
import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import type { PresetIndexCandidate, PresetRenderProbe } from './nearestPreset'
import {
  REAL_REFERENCE_LEARNED_STATUS,
  REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA,
  runRealReferenceReconstructionBenchmark,
} from './realReferenceReconstructionBenchmark'
import { REFERENCE_AUDIO_PRIVACY, type PreparedReferenceAudio } from './referenceAudio'
import {
  createVirtualDx7RenderPlan,
  type VirtualDx7OfflineEngine,
  type VirtualDx7PcmRender,
  type VirtualDx7RenderPlan,
} from './virtualDx7Engine'

function withOutputLevel(level: number, feedback: number, name: string): Dx7Voice {
  const base = createInitializedVoice()
  const operators = base.operators.map((operator) => ({ ...operator, outputLevel: level })) as unknown as Dx7Voice['operators']
  return { ...base, name, feedback, operators }
}

const fakeEngine: VirtualDx7OfflineEngine = {
  engineId: 'test-parametric-engine',
  engineVersion: '1',
  licenseSpdx: 'MIT',
  async render(plan: VirtualDx7RenderPlan): Promise<VirtualDx7PcmRender> {
    const averageOutput = plan.voice.operators.reduce((sum, operator) => sum + operator.outputLevel, 0) / plan.voice.operators.length
    const frequency = 120 + averageOutput * 2.1 + plan.voice.feedback * 7
    const samples = new Float32Array(plan.totalFrames)
    for (let index = 0; index < samples.length; index += 1) {
      const attack = Math.min(1, index / Math.max(1, Math.floor(plan.sampleRate * 0.004)))
      const releaseFrames = Math.max(1, plan.totalFrames - plan.noteOnFrames)
      const release = index < plan.noteOnFrames ? 1 : Math.max(0, 1 - (index - plan.noteOnFrames) / releaseFrames)
      samples[index] = Math.sin(2 * Math.PI * frequency * index / plan.sampleRate) * attack * release * 0.7
    }
    return {
      renderKey: plan.renderKey,
      sampleRate: plan.sampleRate,
      channelCount: 1,
      frameCount: samples.length,
      samples,
    }
  },
}

const probe: PresetRenderProbe = {
  id: 'test-c4',
  midiNote: 60,
  velocity: 100,
  noteOnSeconds: 0.08,
  releaseSeconds: 0.02,
  randomSeed: 7,
}

async function createReference(): Promise<PreparedReferenceAudio> {
  const target = withOutputLevel(74, 4, 'REAL TARGET')
  const plan = createVirtualDx7RenderPlan({ voice: target, sampleRate: 48_000, ...probe })
  const render = await fakeEngine.render(plan)
  return {
    sampleRate: render.sampleRate,
    decodedDurationSeconds: render.samples.length / render.sampleRate,
    selectedRegion: { startSeconds: 0, endSeconds: render.samples.length / render.sampleRate },
    trimmedLeadingSeconds: 0,
    trimmedTrailingSeconds: 0,
    durationSeconds: render.samples.length / render.sampleRate,
    samples: render.samples,
    peakBeforeNormalization: 0.7,
    normalizationGain: 1,
    detectedPitchHz: 261.63,
    analysisPitchHz: 261.63,
    pitchSource: 'manual',
    privacy: REFERENCE_AUDIO_PRIVACY,
    filename: 'isolated-real-note.wav',
    mimeType: 'audio/wav',
    sizeBytes: render.samples.byteLength,
    contentSha256: 'a'.repeat(64),
  }
}

function candidates(): readonly PresetIndexCandidate[] {
  return [
    { id: 'start-a', voice: withOutputLevel(66, 3, 'START A'), sourceLabel: 'Synthetic catalog start A' },
    { id: 'start-b', voice: withOutputLevel(54, 2, 'START B'), sourceLabel: 'Synthetic catalog start B' },
    { id: 'start-c', voice: withOutputLevel(42, 1, 'START C'), sourceLabel: 'Synthetic catalog start C' },
  ]
}

describe('real-reference reconstruction benchmark', () => {
  it('creates a privacy-safe comparison receipt with retrieval, evolutionary and admitted local learned rows', async () => {
    const reference = await createReference()
    const report = await runRealReferenceReconstructionBenchmark(reference, {
      declaredIsolated: true,
      maxVoices: 3,
      rankLimit: 3,
      refinementStarts: 1,
      seed: 2026,
      sampleRate: 48_000,
      probeOverride: probe,
      engine: fakeEngine,
      loadCandidates: async () => candidates(),
      cmaEs: { populationSize: 4, maxGenerations: 1, sigma: 0.15, targetScore: 0 },
      createdAt: () => new Date('2026-08-08T08:00:00.000Z'),
    })

    expect(report.schema).toBe(REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA)
    expect(report.reference).toMatchObject({
      kind: 'real-isolated-sound',
      declaredIsolated: true,
      filename: 'isolated-real-note.wav',
      contentSha256: 'a'.repeat(64),
    })
    expect(report.configuration.catalogCandidateCount).toBe(3)
    expect(report.configuration.probe.id).toBe('test-c4')
    expect(report.comparison.results.map((result) => result.approachId)).toEqual([
      'retrieval',
      'evolutionary',
      'learned-initialization',
    ])
    expect(report.comparison.results[0]?.caseKind).toBe('real-isolated-sound')
    expect(report.comparison.results[0]?.candidateCount).toBe(3)
    expect(report.comparison.results[1]?.candidateCount).toBe(1)
    expect(report.comparison.results[2]).toMatchObject({
      candidateCount: 1,
      failure: null,
    })
    expect(report.comparison.results[2]?.bestDistance).not.toBeNull()
    expect(Number.isFinite(report.comparison.results[2]?.bestDistance)).toBe(true)
    expect(report.comparison.results[2]?.sourceInitialization).toMatch(/SpiegeLib simple-FM MLP/)
    expect(report.learnedStatus).toBe(REAL_REFERENCE_LEARNED_STATUS)
    expect(Number.isFinite(report.sharedPreparationMs)).toBe(true)
    expect(JSON.stringify(report)).not.toContain('"samples"')
  })

  it('refuses to label a reference as real isolated sound without explicit declaration', async () => {
    const reference = await createReference()
    await expect(runRealReferenceReconstructionBenchmark(reference, {
      declaredIsolated: false,
      engine: fakeEngine,
      loadCandidates: async () => candidates(),
      probeOverride: probe,
    })).rejects.toThrow(/Confirm that the selected reference is a real isolated sound/)
  })
})
