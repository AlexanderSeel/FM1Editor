import { describe, expect, it } from 'vitest'
import {
  VIRTUAL_FM1_LIMITER,
  VIRTUAL_FM1_MASTER_GAIN_DEFAULT_DB,
  VIRTUAL_FM1_MASTER_GAIN_MAX_DB,
  VIRTUAL_FM1_MASTER_GAIN_MIN_DB,
  virtualFm1MasterGainLinear,
} from './virtualFm1OutputRoute'

describe('virtual FM-1 output route constants', () => {
  it('maps documented preview master gain limits to finite linear gains', () => {
    expect(virtualFm1MasterGainLinear(0)).toBe(1)
    expect(virtualFm1MasterGainLinear(VIRTUAL_FM1_MASTER_GAIN_DEFAULT_DB)).toBeCloseTo(0.501187, 6)
    expect(virtualFm1MasterGainLinear(VIRTUAL_FM1_MASTER_GAIN_MIN_DB)).toBeGreaterThan(0)
    expect(virtualFm1MasterGainLinear(VIRTUAL_FM1_MASTER_GAIN_MAX_DB)).toBeGreaterThan(1)
  })

  it('rejects gain values outside the preview boundary', () => {
    expect(() => virtualFm1MasterGainLinear(VIRTUAL_FM1_MASTER_GAIN_MIN_DB - 0.01)).toThrow(/masterGainDb/)
    expect(() => virtualFm1MasterGainLinear(VIRTUAL_FM1_MASTER_GAIN_MAX_DB + 0.01)).toThrow(/masterGainDb/)
    expect(() => virtualFm1MasterGainLinear(Number.NaN)).toThrow(/masterGainDb/)
  })

  it('keeps a conservative explicit limiter configuration', () => {
    expect(VIRTUAL_FM1_LIMITER.thresholdDb).toBe(-1)
    expect(VIRTUAL_FM1_LIMITER.kneeDb).toBe(0)
    expect(VIRTUAL_FM1_LIMITER.ratio).toBe(20)
    expect(VIRTUAL_FM1_LIMITER.attackSeconds).toBeGreaterThan(0)
    expect(VIRTUAL_FM1_LIMITER.releaseSeconds).toBeGreaterThan(VIRTUAL_FM1_LIMITER.attackSeconds)
  })
})
