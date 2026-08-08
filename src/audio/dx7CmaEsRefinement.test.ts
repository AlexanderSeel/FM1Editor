import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import { createAudioDescriptorProfile, type AudioDescriptorConfig } from './audioDescriptors'
import { createAudioDescriptorFingerprint, type FingerprintMetricBreakdown } from './audioDescriptorFingerprint'
import type { CompactPresetRankedCandidate } from './compactPresetIndex'
import { createDx7RendererFingerprintObjective, refineRetrievedDx7Candidates } from './dx7CmaEsRefinement'
import { createMemoryPresetFingerprintCache } from './presetFingerprintCache'
import type { PresetRenderProbe } from './nearestPreset'
import { createVirtualDx7RenderPlan, type VirtualDx7OfflineEngine, type VirtualDx7RenderPlan } from './virtualDx7Engine'

const CONFIG: AudioDescriptorConfig = {
  envelopeWindowMs: 20,
  envelopeHopMs: 10,
  fftSizes: [256],
  spectralHopRatio: 0.5,
  melBands: 12,
  mfccCount: 6,
  rolloffFraction: 0.85,
  maxSpectralFrames: 4,
  minimumHz: 20,
  maximumHz: null,
}
const PROBE: PresetRenderProbe = {
  id: 'test-c4', midiNote: 60, velocity: 100, noteOnSeconds: 0.08, releaseSeconds: 0.04, randomSeed: 42,
}

function withTargetFields(voice: Dx7Voice, outputLevel: number, feedback: number): Dx7Voice {
  const operators = [...voice.operators] as [...Dx7Voice['operators']]
  operators[0] = { ...operators[0], outputLevel }
  return { ...voice, operators, feedback }
}

function fakeEngine() {
  const render = vi.fn(async (plan: VirtualDx7RenderPlan) => {
    const amplitude = 0.08 + (plan.voice.operators[0].outputLevel / 99) * 0.6
    const frequency = 180 + plan.voice.feedback * 55
    const samples = new Float32Array(plan.totalFrames)
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin(2 * Math.PI * frequency * index / plan.sampleRate) * amplitude
    }
    return { renderKey: plan.renderKey, sampleRate: plan.sampleRate, channelCount: 1 as const, frameCount: samples.length, samples }
  })
  const engine: VirtualDx7OfflineEngine = { engineId: 'refine-test', engineVersion: '1', licenseSpdx: 'test', render }
  return { engine, render }
}

async function targetFingerprint(engine: VirtualDx7OfflineEngine, voice: Dx7Voice) {
  const plan = createVirtualDx7RenderPlan({ voice, sampleRate: 48_000, ...PROBE })
  const render = await engine.render(plan)
  return createAudioDescriptorFingerprint(createAudioDescriptorProfile(render.samples, render.sampleRate, CONFIG))
}

const ZERO_METRICS: FingerprintMetricBreakdown = {
  envelope: 0, mel: 0, mfcc: 0, centroid: 0, rolloff: 0, flatness: 0, total: 0,
}

function rankedCandidate(voice: Dx7Voice): CompactPresetRankedCandidate {
  return {
    id: 'start',
    voice,
    sourceLabel: 'Synthetic retrieved start',
    matchedProbe: PROBE,
    renderKey: 'start-render',
    distance: 1,
    score: 0.5,
    metrics: ZERO_METRICS,
  }
}

describe('renderer-backed DX7 fingerprint objective', () => {
  it('scores the exact rendered target at zero and reuses a cached semantic render', async () => {
    const { engine, render } = fakeEngine()
    const target = withTargetFields(createInitializedVoice('TARGET'), 28, 5)
    const reference = await targetFingerprint(engine, target)
    const cache = createMemoryPresetFingerprintCache()
    const objective = createDx7RendererFingerprintObjective(reference, engine, PROBE, {
      descriptorConfig: CONFIG,
      fingerprintCache: cache,
    })
    render.mockClear()

    const exact = await objective.evaluate(target)
    expect(exact.distance).toBeCloseTo(0, 12)
    expect(exact.cacheHit).toBe(false)
    expect(render).toHaveBeenCalledTimes(1)

    const repeated = await objective.evaluate(target)
    expect(repeated.distance).toBeCloseTo(0, 12)
    expect(repeated.cacheHit).toBe(true)
    expect(render).toHaveBeenCalledTimes(1)

    const different = await objective.evaluate(withTargetFields(target, 90, 0))
    expect(different.distance).toBeGreaterThan(0)
  })
})

describe('retrieved-candidate renderer refinement', () => {
  it('improves the accepted render/fingerprint objective from a retrieved semantic voice', async () => {
    const { engine } = fakeEngine()
    const target = withTargetFields(createInitializedVoice('TARGET'), 25, 5)
    const reference = await targetFingerprint(engine, target)
    const start = withTargetFields(createInitializedVoice('START'), 92, 0)

    const results = await refineRetrievedDx7Candidates([rankedCandidate(start)], reference, engine, {
      startCount: 1,
      groups: ['output-feedback'],
      seed: 2026,
      descriptorConfig: CONFIG,
      fingerprintCache: createMemoryPresetFingerprintCache(),
      cmaEs: { populationSize: 10, maxGenerations: 12, sigma: 0.25, targetScore: 0 },
    })

    expect(results).toHaveLength(1)
    const result = results[0]
    expect(result).toBeDefined()
    if (!result) throw new Error('Expected renderer refinement result.')
    expect(result.bestDistance).toBeLessThan(result.initialDistance)
    expect(result.improvement).toBeGreaterThan(0)
    expect(result.optimizer.parameterCount).toBe(7)
    expect(result.bestVoice.source).toBeUndefined()
  })

  it('fails fast when already cancelled', async () => {
    const { engine } = fakeEngine()
    const voice = createInitializedVoice()
    const reference = await targetFingerprint(engine, voice)
    const controller = new AbortController()
    controller.abort()
    await expect(refineRetrievedDx7Candidates([rankedCandidate(voice)], reference, engine, {
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' })
  })
})
