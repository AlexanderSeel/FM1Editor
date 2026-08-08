import { describe, expect, it } from 'vitest'
import { encodeSingleVoiceData } from '../sysex/dx7'
import {
  SPIEGELIB_SIMPLE_FM_ADMITTED_CANDIDATE_LABEL,
  createSpiegelibSimpleFmCandidate072,
} from './spiegelibSimpleFmCandidate072'

describe('exact-version SpiegeLib simple-FM candidate', () => {
  it('runs the pinned Librosa-0.7.2/scaler/MLP/semantic path locally', () => {
    const samples = Float32Array.from({ length: 44_100 }, (_, index) => Math.sin(2 * Math.PI * 220 * index / 44_100) * 0.08)
    const candidate = createSpiegelibSimpleFmCandidate072(samples, 44_100, 'SPGL 072')

    expect(candidate.source).toBe(SPIEGELIB_SIMPLE_FM_ADMITTED_CANDIDATE_LABEL)
    expect(candidate.standardizedFeatureCount).toBe(572)
    expect(candidate.normalizedPrediction).toHaveLength(9)
    expect(candidate.normalizedPrediction.every(Number.isFinite)).toBe(true)
    expect(candidate.voice.name).toBe('SPGL 072')
    expect(encodeSingleVoiceData(candidate.voice)).toHaveLength(155)
    expect(candidate.limitations.join(' ')).toContain('Librosa 0.7.2-compatible MFCC')
  })

  it('keeps all model outputs bounded by the semantic adapter', () => {
    const samples = new Float32Array(48_000)
    samples[0] = 0.2
    samples[20_000] = -0.12
    const candidate = createSpiegelibSimpleFmCandidate072(samples, 48_000)
    const op2 = candidate.voice.operators[1]
    expect(op2.envelope.rates.every((value) => value >= 0 && value <= 99)).toBe(true)
    expect(op2.envelope.levels.every((value) => value >= 0 && value <= 99)).toBe(true)
    expect(op2.frequencyCoarse).toBeGreaterThanOrEqual(0)
    expect(op2.frequencyCoarse).toBeLessThanOrEqual(31)
    expect(op2.frequencyFine).toBeGreaterThanOrEqual(0)
    expect(op2.frequencyFine).toBeLessThanOrEqual(99)
    expect(op2.detune).toBeGreaterThanOrEqual(0)
    expect(op2.detune).toBeLessThanOrEqual(14)
  })
})
