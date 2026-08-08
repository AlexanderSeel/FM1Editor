import { describe, expect, it } from 'vitest'
import { encodeSingleVoiceData } from '../sysex/dx7'
import {
  SPIEGELIB_SIMPLE_FM_CANDIDATE_LABEL,
  createSpiegelibSimpleFmCandidate,
} from './spiegelibSimpleFmCandidate'

describe('SpiegeLib simple-FM learned candidate', () => {
  it('runs the pinned local MFCC/scaler/MLP/semantic stack without raw-audio upload', () => {
    const samples = new Float32Array(44_100)
    samples[0] = 0.1
    samples[1_000] = -0.05
    const candidate = createSpiegelibSimpleFmCandidate(samples, 44_100, 'SPGL TEST')

    expect(candidate.source).toBe(SPIEGELIB_SIMPLE_FM_CANDIDATE_LABEL)
    expect(candidate.standardizedFeatureCount).toBe(572)
    expect(candidate.normalizedPrediction).toHaveLength(9)
    expect(candidate.normalizedPrediction.every(Number.isFinite)).toBe(true)
    expect(candidate.voice.name).toBe('SPGL TEST')
    expect(encodeSingleVoiceData(candidate.voice)).toHaveLength(155)
    expect(candidate.limitations.join(' ')).toContain('nine historical Dexed OP2 controls')
  })

  it('accepts a 48 kHz reference through the deterministic one-second resampler', () => {
    const samples = Float32Array.from({ length: 48_000 }, (_, index) => Math.sin(2 * Math.PI * 220 * index / 48_000) * 0.1)
    const candidate = createSpiegelibSimpleFmCandidate(samples, 48_000)
    expect(candidate.normalizedPrediction).toHaveLength(9)
    expect(encodeSingleVoiceData(candidate.voice)).toHaveLength(155)
  })
})
