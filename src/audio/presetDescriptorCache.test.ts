import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { type AudioDescriptorConfig } from './audioDescriptors'
import { buildPresetDescriptorIndex } from './nearestPreset'
import {
  createMemoryPresetDescriptorCache,
  createPresetDescriptorCacheKey,
} from './presetDescriptorCache'
import type { VirtualDx7OfflineEngine, VirtualDx7RenderPlan } from './virtualDx7Engine'

const CONFIG: AudioDescriptorConfig = {
  envelopeWindowMs: 20,
  envelopeHopMs: 10,
  fftSizes: [256],
  spectralHopRatio: 0.25,
  melBands: 12,
  mfccCount: 6,
  rolloffFraction: 0.85,
  maxSpectralFrames: 4,
  minimumHz: 20,
  maximumHz: null,
}

describe('preset descriptor cache', () => {
  it('keys descriptors by engine, render identity and descriptor configuration', () => {
    const base = {
      engineId: 'msfa',
      engineVersion: '1',
      renderKey: 'render-a',
      descriptorConfig: CONFIG,
    }
    const first = createPresetDescriptorCacheKey(base)
    expect(createPresetDescriptorCacheKey({ ...base })).toBe(first)
    expect(createPresetDescriptorCacheKey({ ...base, engineVersion: '2' })).not.toBe(first)
    expect(createPresetDescriptorCacheKey({ ...base, renderKey: 'render-b' })).not.toBe(first)
    expect(createPresetDescriptorCacheKey({
      ...base,
      descriptorConfig: { ...CONFIG, mfccCount: 5 },
    })).not.toBe(first)
  })

  it('reuses cached descriptors without rendering unchanged standardized probes', async () => {
    const render = vi.fn(async (plan: VirtualDx7RenderPlan) => ({
      renderKey: plan.renderKey,
      sampleRate: plan.sampleRate,
      channelCount: 1 as const,
      frameCount: plan.totalFrames,
      samples: new Float32Array(plan.totalFrames),
    }))
    const engine: VirtualDx7OfflineEngine = {
      engineId: 'msfa-test',
      engineVersion: 'cache-v1',
      licenseSpdx: 'Apache-2.0',
      render,
    }
    const cache = createMemoryPresetDescriptorCache()
    const candidate = { id: 'voice-1', voice: createInitializedVoice('CACHE'), sourceLabel: 'catalog' }
    const probe = { id: 'c4', midiNote: 60, velocity: 100, noteOnSeconds: 0.1, releaseSeconds: 0.1, randomSeed: 42 }

    const first = await buildPresetDescriptorIndex([candidate], engine, {
      probes: [probe], descriptorConfig: CONFIG, descriptorCache: cache,
    })
    expect(render).toHaveBeenCalledTimes(1)

    const onCacheHit = vi.fn()
    const second = await buildPresetDescriptorIndex([candidate], engine, {
      probes: [probe], descriptorConfig: CONFIG, descriptorCache: cache, onCacheHit,
    })

    expect(render).toHaveBeenCalledTimes(1)
    expect(onCacheHit).toHaveBeenCalledTimes(1)
    expect(second.entries[0]?.probes[0]?.renderKey).toBe(first.entries[0]?.probes[0]?.renderKey)
    expect(Array.from(second.entries[0]?.probes[0]?.descriptor.amplitudeEnvelopeRms ?? [])).toEqual(
      Array.from(first.entries[0]?.probes[0]?.descriptor.amplitudeEnvelopeRms ?? []),
    )
  })

  it('returns isolated descriptor snapshots from the memory cache', async () => {
    const render = vi.fn(async (plan: VirtualDx7RenderPlan) => ({
      renderKey: plan.renderKey,
      sampleRate: plan.sampleRate,
      channelCount: 1 as const,
      frameCount: plan.totalFrames,
      samples: new Float32Array(plan.totalFrames),
    }))
    const engine: VirtualDx7OfflineEngine = { engineId: 'x', engineVersion: '1', licenseSpdx: 'test', render }
    const cache = createMemoryPresetDescriptorCache()
    const candidate = { id: 'one', voice: createInitializedVoice(), sourceLabel: 'catalog' }
    const probe = { id: 'p', midiNote: 60, velocity: 100, noteOnSeconds: 0.1, releaseSeconds: 0.1, randomSeed: 1 }
    const index = await buildPresetDescriptorIndex([candidate], engine, { probes: [probe], descriptorConfig: CONFIG, descriptorCache: cache })
    const stored = index.entries[0]?.probes[0]?.descriptor
    expect(stored).toBeDefined()
    if (stored && stored.amplitudeEnvelopeRms.length > 0) stored.amplitudeEnvelopeRms[0] = 0.75
    const second = await buildPresetDescriptorIndex([candidate], engine, { probes: [probe], descriptorConfig: CONFIG, descriptorCache: cache })
    expect(second.entries[0]?.probes[0]?.descriptor.amplitudeEnvelopeRms[0]).toBe(0)
  })
})
