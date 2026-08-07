import { describe, expect, it, vi } from 'vitest'
import { createInitializedFxState } from '../domain/fx'
import { createInitializedVoice } from '../domain/voice'
import {
  renderVirtualFm1DryChord,
  renderVirtualFm1PreviewWav,
  type VirtualFm1PreviewProcessor,
} from './virtualFm1WavRenderer'
import type { VirtualDx7OfflineEngine, VirtualDx7RenderPlan } from './virtualDx7Engine'

function engineFor(samplesByNote: Readonly<Record<number, readonly number[]>>): VirtualDx7OfflineEngine {
  return {
    engineId: 'test-engine',
    engineVersion: '1',
    licenseSpdx: 'test',
    async render(plan: VirtualDx7RenderPlan) {
      const source = samplesByNote[plan.midiNote] ?? [0, 0, 0, 0]
      const samples = new Float32Array(plan.totalFrames)
      for (let index = 0; index < samples.length; index += 1) samples[index] = source[index % source.length] ?? 0
      return { renderKey: plan.renderKey, sampleRate: plan.sampleRate, channelCount: 1, frameCount: samples.length, samples }
    },
  }
}

describe('Virtual FM-1 deterministic WAV rendering', () => {
  it('renders one semantic note without unnecessary chord attenuation', async () => {
    const result = await renderVirtualFm1DryChord({
      voice: createInitializedVoice('WAV NOTE'),
      midiNotes: [60],
      sampleRate: 48_000,
      noteOnSeconds: 0.05,
      releaseSeconds: 0,
    }, engineFor({ 60: [0.5, -0.25, 0.1, 0] }))

    expect(result.renderKeys).toHaveLength(1)
    expect(result.mixGain).toBe(1)
    expect(result.peak).toBeCloseTo(0.5, 6)
    expect(Array.from(result.samples.slice(0, 4))).toEqual([0.5, -0.25, 0.10000000149011612, 0])
  })

  it('mixes a chord deterministically and applies peak safety only when required', async () => {
    const result = await renderVirtualFm1DryChord({
      voice: createInitializedVoice('WAV CHORD'),
      midiNotes: [60, 64, 67],
      sampleRate: 48_000,
      noteOnSeconds: 0.05,
      releaseSeconds: 0,
    }, engineFor({ 60: [1], 64: [1], 67: [1] }))

    expect(result.renderKeys).toHaveLength(3)
    expect(result.peak).toBeCloseTo(0.98, 6)
    expect(result.mixGain).toBeLessThan(1 / Math.sqrt(3) + 1e-8)
    expect(result.samples[0]).toBeCloseTo(0.98, 6)
  })

  it('routes the dry mix through the injected preview processor and emits PCM16 WAV', async () => {
    const processor = vi.fn<VirtualFm1PreviewProcessor>(async (samples, _sampleRate, options) => {
      expect(options.fxEnabled).toBe(true)
      expect(options.masterGainDb).toBe(-9)
      return [Float32Array.from(samples, (sample) => sample * 0.5)]
    })
    const result = await renderVirtualFm1PreviewWav({
      voice: createInitializedVoice('WAV FX'),
      midiNotes: [60],
      sampleRate: 48_000,
      noteOnSeconds: 0.05,
      releaseSeconds: 0,
      fxState: createInitializedFxState(),
      fxEnabled: true,
      masterGainDb: -9,
      fxTailSeconds: 0,
    }, { engine: engineFor({ 60: [0.5, -0.5] }), processOutput: processor })

    expect(processor).toHaveBeenCalledTimes(1)
    expect(result.channels).toHaveLength(1)
    expect(result.wav.byteLength).toBeGreaterThan(44)
    expect(String.fromCharCode(...result.wav.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...result.wav.slice(8, 12))).toBe('WAVE')
  })

  it('rejects invalid chord requests before rendering', async () => {
    await expect(renderVirtualFm1DryChord({ voice: createInitializedVoice(), midiNotes: [] }, engineFor({})))
      .rejects.toThrow(/between 1 and 16 notes/)
    await expect(renderVirtualFm1DryChord({ voice: createInitializedVoice(), midiNotes: [128] }, engineFor({})))
      .rejects.toThrow(/midiNotes\[0\]/)
  })
})
