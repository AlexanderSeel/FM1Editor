import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { createAudioDescriptorProfile, type AudioDescriptorConfig } from './audioDescriptors'
import {
  buildPresetDescriptorIndex,
  compareAudioDescriptors,
  frequencyToMidiNote,
  rankPresetDescriptorIndex,
  type PresetDescriptorIndex,
} from './nearestPreset'
import type { VirtualDx7OfflineEngine, VirtualDx7RenderPlan } from './virtualDx7Engine'

const CONFIG: AudioDescriptorConfig = {
  envelopeWindowMs: 20,
  envelopeHopMs: 10,
  fftSizes: [256, 512],
  spectralHopRatio: 0.25,
  melBands: 20,
  mfccCount: 8,
  rolloffFraction: 0.85,
  maxSpectralFrames: 12,
  minimumHz: 20,
  maximumHz: null,
}

function sine(frequency: number, sampleRate = 8_000, seconds = 0.4, amplitude = 0.6): Float32Array {
  const samples = new Float32Array(Math.round(sampleRate * seconds))
  for (let index = 0; index < samples.length; index += 1) samples[index] = amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate)
  return samples
}

function noise(sampleCount: number): Float32Array {
  let state = 1
  const samples = new Float32Array(sampleCount)
  for (let index = 0; index < sampleCount; index += 1) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    samples[index] = (state / 0xffffffff * 2 - 1) * 0.5
  }
  return samples
}

function descriptor(samples: Float32Array) {
  return createAudioDescriptorProfile(samples, 8_000, CONFIG)
}

describe('nearest preset descriptor comparison', () => {
  it('returns a zero distance for identical descriptors and ranks the exact timbre first', () => {
    const reference = descriptor(sine(440))
    const different = descriptor(noise(3_200))
    const voiceA = createInitializedVoice('MATCH')
    const voiceB = createInitializedVoice('NOISE')
    const index: PresetDescriptorIndex = {
      schema: 'fm1-editor.preset-descriptor-index.v1',
      engineId: 'test',
      engineVersion: '1',
      sampleRate: 48_000,
      descriptorConfig: CONFIG,
      probes: [{ id: 'c4', midiNote: 60, velocity: 100, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }],
      entries: [
        { id: 'a', voice: voiceA, sourceLabel: 'A', probes: [{ probe: { id: 'c4', midiNote: 60, velocity: 100, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }, renderKey: 'a', descriptor: reference }] },
        { id: 'b', voice: voiceB, sourceLabel: 'B', probes: [{ probe: { id: 'c4', midiNote: 60, velocity: 100, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }, renderKey: 'b', descriptor: different }] },
      ],
    }

    const exact = compareAudioDescriptors(reference, reference)
    expect(exact.total).toBe(0)
    const ranked = rankPresetDescriptorIndex(reference, index, { limit: 2, referencePitchHz: 261.625565 })
    expect(ranked.map((candidate) => candidate.id)).toEqual(['a', 'b'])
    expect(ranked[0]?.score).toBe(1)
    expect(ranked[0]?.metrics.total).toBe(0)
    expect((ranked[1]?.distance ?? 0)).toBeGreaterThan(0)
  })

  it('uses detected/reference pitch only to choose the standardized probe, then ranks by descriptor distance', () => {
    const reference = descriptor(sine(880))
    const voice = createInitializedVoice('MULTI')
    const c3 = { id: 'c3', midiNote: 48, velocity: 80, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }
    const c5 = { id: 'c5', midiNote: 72, velocity: 108, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 }
    const index: PresetDescriptorIndex = {
      schema: 'fm1-editor.preset-descriptor-index.v1', engineId: 'test', engineVersion: '1', sampleRate: 48_000, descriptorConfig: CONFIG,
      probes: [c3, c5],
      entries: [{ id: 'voice', voice, sourceLabel: 'source', probes: [
        { probe: c3, renderKey: 'c3', descriptor: reference },
        { probe: c5, renderKey: 'c5', descriptor: descriptor(sine(440)) },
      ] }],
    }

    const ranked = rankPresetDescriptorIndex(reference, index, { referencePitchHz: 880 })
    expect(frequencyToMidiNote(880)).toBe(81)
    expect(ranked[0]?.matchedProbe.id).toBe('c5')
    expect((ranked[0]?.distance ?? 0)).toBeGreaterThan(0)
  })
})

describe('buildPresetDescriptorIndex', () => {
  it('renders candidates sequentially at standardized probes and reports deterministic progress', async () => {
    const render = vi.fn(async (plan: VirtualDx7RenderPlan) => ({
      renderKey: plan.renderKey,
      sampleRate: plan.sampleRate,
      channelCount: 1 as const,
      frameCount: plan.totalFrames,
      samples: new Float32Array(plan.totalFrames),
    }))
    const engine: VirtualDx7OfflineEngine = { engineId: 'fake', engineVersion: '1', licenseSpdx: 'test', render }
    const candidates = [
      { id: 'one', voice: createInitializedVoice('ONE'), sourceLabel: 'catalog' },
      { id: 'two', voice: createInitializedVoice('TWO'), sourceLabel: 'catalog' },
    ]
    const probes = [
      { id: 'a', midiNote: 48, velocity: 80, noteOnSeconds: 0.1, releaseSeconds: 0.1, randomSeed: 1 },
      { id: 'b', midiNote: 60, velocity: 100, noteOnSeconds: 0.1, releaseSeconds: 0.1, randomSeed: 1 },
    ]
    const progress = vi.fn()

    const index = await buildPresetDescriptorIndex(candidates, engine, {
      sampleRate: 48_000,
      probes,
      descriptorConfig: { ...CONFIG, fftSizes: [256], maxSpectralFrames: 4 },
      onProgress: progress,
    })

    expect(render).toHaveBeenCalledTimes(4)
    expect(render.mock.calls.map(([plan]) => [plan.midiNote, plan.velocity])).toEqual([[48, 80], [60, 100], [48, 80], [60, 100]])
    expect(progress.mock.calls.map(([done, total, candidate, probe]) => [done, total, candidate.id, probe.id])).toEqual([
      [1, 4, 'one', 'a'], [2, 4, 'one', 'b'], [3, 4, 'two', 'a'], [4, 4, 'two', 'b'],
    ])
    expect(index.engineId).toBe('fake')
    expect(index.entries).toHaveLength(2)
    expect(index.entries[0]?.probes).toHaveLength(2)
  })

  it('fails closed on duplicate ids and observes cancellation before rendering', async () => {
    const engine: VirtualDx7OfflineEngine = {
      engineId: 'fake', engineVersion: '1', licenseSpdx: 'test',
      render: vi.fn(async () => { throw new Error('should not render') }),
    }
    const voice = createInitializedVoice()
    await expect(buildPresetDescriptorIndex([
      { id: 'same', voice, sourceLabel: 'a' },
      { id: 'same', voice, sourceLabel: 'b' },
    ], engine)).rejects.toThrow('Duplicate')

    const controller = new AbortController()
    controller.abort()
    await expect(buildPresetDescriptorIndex([{ id: 'one', voice, sourceLabel: 'a' }], engine, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
})
