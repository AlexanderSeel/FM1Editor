import { describe, expect, it } from 'vitest'
import {
  estimateReferencePitchHz,
  findReferenceSilenceBounds,
  mixReferenceChannelsToMono,
  prepareReferenceAudio,
  REFERENCE_AUDIO_NORMALIZED_PEAK,
  validateReferenceAudioFile,
} from './referenceAudio'

function sine(frequency: number, sampleRate: number, seconds: number, amplitude = 0.5): Float32Array {
  const samples = new Float32Array(Math.round(sampleRate * seconds))
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin(2 * Math.PI * frequency * index / sampleRate) * amplitude
  }
  return samples
}

describe('reference audio file boundary', () => {
  it('accepts WAV and MP3 metadata and rejects other formats or oversized files', () => {
    expect(() => validateReferenceAudioFile({ name: 'tone.wav', size: 1024, type: 'audio/wav' })).not.toThrow()
    expect(() => validateReferenceAudioFile({ name: 'tone.mp3', size: 1024, type: 'audio/mpeg' })).not.toThrow()
    expect(() => validateReferenceAudioFile({ name: 'tone.flac', size: 1024, type: 'audio/flac' })).toThrow(/WAV or MP3/)
    expect(() => validateReferenceAudioFile({ name: 'tone.wav', size: 26 * 1024 * 1024, type: 'audio/wav' })).toThrow(/25 MB/)
  })
})

describe('reference audio preparation', () => {
  it('mixes equal-length channels to deterministic mono', () => {
    const mono = mixReferenceChannelsToMono([
      new Float32Array([1, 0.5, -1]),
      new Float32Array([-1, 0.5, 1]),
    ])
    expect(Array.from(mono)).toEqual([0, 0.5, 0])
  })

  it('finds leading and trailing silence at the configured threshold', () => {
    const samples = new Float32Array([0, 0.0001, 0.01, 0.2, 0.01, 0.0001, 0])
    expect(findReferenceSilenceBounds(samples, -50)).toEqual({ start: 2, endExclusive: 5 })
  })

  it('detects a stable synthetic pitch near A4', () => {
    const detected = estimateReferencePitchHz(sine(440, 48_000, 0.5), 48_000)
    expect(detected).not.toBeNull()
    expect(detected ?? 0).toBeGreaterThan(436)
    expect(detected ?? 0).toBeLessThan(444)
  })

  it('keeps the fundamental for PCM16-like A4 with trimmed silence instead of selecting a subharmonic', () => {
    const sampleRate = 48_000
    const silenceFrames = Math.round(sampleRate * 0.1)
    const tone = sine(440, sampleRate, 0.8, 0.25)
    const channel = new Float32Array(silenceFrames + tone.length + silenceFrames)
    for (let index = 0; index < tone.length; index += 1) {
      const quantized = Math.round((tone[index] ?? 0) * 32767) / 32767
      channel[silenceFrames + index] = quantized
    }
    const prepared = prepareReferenceAudio({
      sampleRate,
      durationSeconds: channel.length / sampleRate,
      channels: [channel],
    }, { trimSilence: true, normalize: true })
    expect(prepared.detectedPitchHz).not.toBeNull()
    expect(prepared.detectedPitchHz ?? 0).toBeGreaterThan(436)
    expect(prepared.detectedPitchHz ?? 0).toBeLessThan(444)
  })

  it('trims, normalizes and allows an explicit manual pitch override', () => {
    const sampleRate = 8_000
    const silence = new Float32Array(800)
    const tone = sine(200, sampleRate, 0.4, 0.25)
    const channel = new Float32Array(silence.length + tone.length + silence.length)
    channel.set(tone, silence.length)
    const decoded = {
      sampleRate,
      durationSeconds: channel.length / sampleRate,
      channels: [channel],
    }
    const prepared = prepareReferenceAudio(decoded, {
      region: { startSeconds: 0, endSeconds: decoded.durationSeconds },
      trimSilence: true,
      normalize: true,
      manualPitchHz: 196,
    })

    expect(prepared.trimmedLeadingSeconds).toBeCloseTo(0.1, 3)
    expect(prepared.trimmedTrailingSeconds).toBeCloseTo(0.1, 3)
    expect(prepared.durationSeconds).toBeCloseTo(0.4, 3)
    expect(prepared.analysisPitchHz).toBe(196)
    expect(Math.max(...prepared.samples.map((sample) => Math.abs(sample)))).toBeCloseTo(REFERENCE_AUDIO_NORMALIZED_PEAK, 5)
  })

  it('rejects an unusably short region and invalid manual pitch', () => {
    const decoded = { sampleRate: 48_000, durationSeconds: 1, channels: [sine(440, 48_000, 1)] }
    expect(() => prepareReferenceAudio(decoded, {
      region: { startSeconds: 0, endSeconds: 0.01 }, trimSilence: false, normalize: false,
    })).toThrow(/shorter than 0.05 seconds/)
    expect(() => prepareReferenceAudio(decoded, {
      region: { startSeconds: 0, endSeconds: 1 }, trimSilence: false, normalize: false, manualPitchHz: 10,
    })).toThrow(/between 20 and 5000 Hz/)
  })
})
