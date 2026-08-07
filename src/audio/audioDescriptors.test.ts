import { describe, expect, it } from 'vitest'
import {
  AUDIO_DESCRIPTOR_SCHEMA,
  createAudioDescriptorProfile,
  type AudioDescriptorConfig,
} from './audioDescriptors'

const TEST_CONFIG: AudioDescriptorConfig = {
  envelopeWindowMs: 20,
  envelopeHopMs: 10,
  fftSizes: [256, 512, 1024],
  spectralHopRatio: 0.25,
  melBands: 24,
  mfccCount: 10,
  rolloffFraction: 0.85,
  maxSpectralFrames: 24,
  minimumHz: 20,
  maximumHz: null,
}

function sine(frequency: number, sampleRate: number, durationSeconds: number, amplitude = 0.6): Float32Array {
  const samples = new Float32Array(Math.round(sampleRate * durationSeconds))
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate)
  }
  return samples
}

function deterministicNoise(sampleCount: number): Float32Array {
  let state = 0x12345678
  const samples = new Float32Array(sampleCount)
  for (let index = 0; index < sampleCount; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    samples[index] = (state / 0xffffffff * 2 - 1) * 0.5
  }
  return samples
}

function expectFloatArraysEqual(left: Float32Array, right: Float32Array): void {
  expect(left.length).toBe(right.length)
  expect(Array.from(left)).toEqual(Array.from(right))
}

describe('createAudioDescriptorProfile', () => {
  it('is byte-value deterministic for identical reference/render PCM', () => {
    const samples = sine(440, 8_000, 0.4)
    const first = createAudioDescriptorProfile(samples, 8_000, TEST_CONFIG)
    const second = createAudioDescriptorProfile(new Float32Array(samples), 8_000, TEST_CONFIG)

    expect(first.schema).toBe(AUDIO_DESCRIPTOR_SCHEMA)
    expect(first.sampleRate).toBe(8_000)
    expect(first.sampleCount).toBe(samples.length)
    expect(first.config).not.toBe(TEST_CONFIG)
    expect(first.config.fftSizes).not.toBe(TEST_CONFIG.fftSizes)
    expectFloatArraysEqual(first.amplitudeEnvelopeRms, second.amplitudeEnvelopeRms)
    expectFloatArraysEqual(first.amplitudeEnvelopePeak, second.amplitudeEnvelopePeak)
    expect(first.spectral).toHaveLength(3)
    first.spectral.forEach((resolution, index) => {
      const other = second.spectral[index]
      expect(other).toBeDefined()
      expect(resolution.fftSize).toBe(other?.fftSize)
      expect(resolution.totalFrameCount).toBe(other?.totalFrameCount)
      expectFloatArraysEqual(resolution.logMagnitude, other?.logMagnitude ?? new Float32Array())
      expectFloatArraysEqual(resolution.logMelSpectrum, other?.logMelSpectrum ?? new Float32Array())
      expectFloatArraysEqual(resolution.mfcc, other?.mfcc ?? new Float32Array())
      expectFloatArraysEqual(resolution.spectralCentroidHz, other?.spectralCentroidHz ?? new Float32Array())
      expectFloatArraysEqual(resolution.spectralRolloffHz, other?.spectralRolloffHz ?? new Float32Array())
      expectFloatArraysEqual(resolution.spectralFlatness, other?.spectralFlatness ?? new Float32Array())
    })
  })

  it('localizes a steady 440 Hz tone with multi-resolution spectral descriptors', () => {
    const profile = createAudioDescriptorProfile(sine(440, 8_000, 1), 8_000, TEST_CONFIG)

    expect(profile.spectral.map((resolution) => resolution.fftSize)).toEqual([256, 512, 1024])
    for (const resolution of profile.spectral) {
      expect(resolution.sampledFrameStarts.length).toBeLessThanOrEqual(TEST_CONFIG.maxSpectralFrames)
      expect(resolution.logMagnitude.length).toBe(resolution.sampledFrameStarts.length * (resolution.fftSize / 2 + 1))
      expect(resolution.logMelSpectrum.length).toBe(resolution.sampledFrameStarts.length * TEST_CONFIG.melBands)
      expect(resolution.mfcc.length).toBe(resolution.sampledFrameStarts.length * TEST_CONFIG.mfccCount)
      expect(resolution.centroidMoments.mean).toBeGreaterThan(380)
      expect(resolution.centroidMoments.mean).toBeLessThan(520)
      expect(resolution.rolloffMoments.mean).toBeGreaterThan(350)
      expect(resolution.rolloffMoments.mean).toBeLessThan(550)
    }
  })

  it('tracks amplitude envelope changes independently of spectral resolution', () => {
    const sampleRate = 8_000
    const samples = sine(220, sampleRate, 0.5, 0.8)
    for (let index = 0; index < samples.length / 2; index += 1) samples[index] = (samples[index] ?? 0) * 0.1
    const profile = createAudioDescriptorProfile(samples, sampleRate, TEST_CONFIG)
    const midpoint = Math.floor(profile.amplitudeEnvelopeRms.length / 2)
    const early = profile.amplitudeEnvelopeRms.slice(0, Math.max(1, midpoint - 2))
    const late = profile.amplitudeEnvelopeRms.slice(Math.min(profile.amplitudeEnvelopeRms.length - 1, midpoint + 2))
    const mean = (values: Float32Array) => Array.from(values).reduce((sum, value) => sum + value, 0) / values.length

    expect(mean(late)).toBeGreaterThan(mean(early) * 5)
    expect(Math.max(...profile.amplitudeEnvelopePeak)).toBeLessThanOrEqual(0.81)
  })

  it('reports substantially lower spectral flatness for a tone than deterministic broadband noise', () => {
    const sampleRate = 8_000
    const tone = createAudioDescriptorProfile(sine(440, sampleRate, 1), sampleRate, TEST_CONFIG)
    const noise = createAudioDescriptorProfile(deterministicNoise(sampleRate), sampleRate, TEST_CONFIG)
    const toneFlatness = tone.spectral.at(-1)?.flatnessMoments.mean ?? 1
    const noiseFlatness = noise.spectral.at(-1)?.flatnessMoments.mean ?? 0

    expect(toneFlatness).toBeLessThan(0.05)
    expect(noiseFlatness).toBeGreaterThan(toneFlatness * 5)
  })

  it('rejects non-finite and non-normalized PCM instead of silently clipping descriptors', () => {
    expect(() => createAudioDescriptorProfile(new Float32Array([0, Number.NaN]), 48_000, TEST_CONFIG)).toThrow('not finite')
    expect(() => createAudioDescriptorProfile(new Float32Array([0, 1.01]), 48_000, TEST_CONFIG)).toThrow('normalized to [-1, 1]')
    expect(() => createAudioDescriptorProfile(new Float32Array([0]), 0, TEST_CONFIG)).toThrow('greater than zero')
  })
})
