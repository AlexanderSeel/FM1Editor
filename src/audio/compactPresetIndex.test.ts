import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { createAudioDescriptorProfile, type AudioDescriptorConfig } from './audioDescriptors'
import {
  compareAudioDescriptorFingerprints,
  createAudioDescriptorFingerprint,
  fingerprintFloatCount,
} from './audioDescriptorFingerprint'
import { buildCompactPresetDescriptorIndex, rankCompactPresetDescriptorIndex } from './compactPresetIndex'
import { createMemoryPresetFingerprintCache } from './presetFingerprintCache'
import type { VirtualDx7OfflineEngine, VirtualDx7RenderPlan } from './virtualDx7Engine'

const CONFIG: AudioDescriptorConfig = {
  envelopeWindowMs: 20, envelopeHopMs: 10, fftSizes: [256, 512, 1024], spectralHopRatio: 0.25,
  melBands: 24, mfccCount: 10, rolloffFraction: 0.85, maxSpectralFrames: 12, minimumHz: 20, maximumHz: null,
}
function sine(frequency: number, sampleRate = 8_000, seconds = 0.5): Float32Array {
  return Float32Array.from({ length: Math.round(sampleRate * seconds) }, (_, index) => Math.sin(2 * Math.PI * frequency * index / sampleRate) * 0.5)
}
function rawFloatCount(profile: ReturnType<typeof createAudioDescriptorProfile>): number {
  return profile.amplitudeEnvelopeRms.length + profile.amplitudeEnvelopePeak.length + profile.spectral.reduce((sum, item) =>
    sum + item.logMagnitude.length + item.logMelSpectrum.length + item.mfcc.length + item.spectralCentroidHz.length + item.spectralRolloffHz.length + item.spectralFlatness.length, 0)
}

describe('compact audio fingerprints', () => {
  it('is deterministic and substantially smaller than the bounded analysis profile', () => {
    const profile = createAudioDescriptorProfile(sine(440), 8_000, CONFIG)
    const first = createAudioDescriptorFingerprint(profile)
    const second = createAudioDescriptorFingerprint(createAudioDescriptorProfile(sine(440), 8_000, CONFIG))
    expect(first).toEqual(second)
    expect(fingerprintFloatCount(first) * 8).toBeLessThan(rawFloatCount(profile))
  })

  it('gives zero distance to itself and separates a different tone', () => {
    const a = createAudioDescriptorFingerprint(createAudioDescriptorProfile(sine(440), 8_000, CONFIG))
    const b = createAudioDescriptorFingerprint(createAudioDescriptorProfile(sine(880), 8_000, CONFIG))
    expect(compareAudioDescriptorFingerprints(a, a).total).toBe(0)
    expect(compareAudioDescriptorFingerprints(a, b).total).toBeGreaterThan(0)
  })
})

describe('compact preset index', () => {
  it('reuses persistent fingerprints and ranks an exact indexed fingerprint first', async () => {
    const render = vi.fn(async (plan: VirtualDx7RenderPlan) => {
      const frequency = plan.voice.algorithm === 1 ? 440 : 880
      const samples = sine(frequency, plan.sampleRate, plan.totalFrames / plan.sampleRate)
      return { renderKey: plan.renderKey, sampleRate: plan.sampleRate, channelCount: 1 as const, frameCount: plan.totalFrames, samples }
    })
    const engine: VirtualDx7OfflineEngine = { engineId: 'test', engineVersion: '1', licenseSpdx: 'test', render }
    const firstVoice = { ...createInitializedVoice('MATCH'), algorithm: 1 }
    const secondVoice = { ...createInitializedVoice('OTHER'), algorithm: 2 }
    const candidates = [
      { id: 'a', voice: firstVoice, sourceLabel: 'A' },
      { id: 'b', voice: secondVoice, sourceLabel: 'B' },
    ]
    const probes = [{ id: 'c4-main', midiNote: 60, velocity: 100, noteOnSeconds: 0.1, releaseSeconds: 0.1, randomSeed: 42 }]
    const cache = createMemoryPresetFingerprintCache()
    const first = await buildCompactPresetDescriptorIndex(candidates, engine, { probes, descriptorConfig: CONFIG, fingerprintCache: cache })
    expect(render).toHaveBeenCalledTimes(2)
    const cacheHit = vi.fn()
    const second = await buildCompactPresetDescriptorIndex(candidates, engine, { probes, descriptorConfig: CONFIG, fingerprintCache: cache, onCacheHit: cacheHit })
    expect(render).toHaveBeenCalledTimes(2)
    expect(cacheHit).toHaveBeenCalledTimes(2)

    const exactReference = first.entries[0]?.probes[0]?.fingerprint
    expect(exactReference).toBeDefined()
    if (!exactReference) throw new Error('Expected exact indexed reference fingerprint.')
    const ranked = rankCompactPresetDescriptorIndex(exactReference, second, { limit: 2 })
    expect(ranked.map((item) => item.id)).toEqual(['a', 'b'])
    expect(ranked[0]?.distance).toBe(0)
    expect(first.entries).toHaveLength(2)
  })
})
