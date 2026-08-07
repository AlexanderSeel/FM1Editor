import { describe, expect, it } from 'vitest'
import { createInitializedFxState, FM1_FX_PARAMETERS, updateFxValue } from '../domain/fx'
import {
  createFm1InspiredFxPlan,
  FM1_INSPIRED_FX_CLAIM,
  FM1_INSPIRED_FX_ROUTING,
} from './fm1InspiredFxGraph'

describe('createFm1InspiredFxPlan', () => {
  it('reuses all 24 documented FM-1 CC-backed parameters without changing their legal ranges', () => {
    expect(FM1_FX_PARAMETERS).toHaveLength(24)
    expect(FM1_FX_PARAMETERS.map((parameter) => parameter.controller)).toEqual(
      Array.from({ length: 24 }, (_, index) => index),
    )

    let state = createInitializedFxState()
    for (const parameter of FM1_FX_PARAMETERS) {
      state = updateFxValue(state, parameter.id, parameter.maximum)
    }

    const plan = createFm1InspiredFxPlan(state)
    expect(plan.filter.enabled).toBe(true)
    expect(plan.filter.type).toBe('highpass')
    expect(plan.filter.cutoffHz).toBeCloseTo(18_000, 8)
    expect(plan.filter.q).toBeCloseTo(15, 8)

    expect(plan.reverb.enabled).toBe(true)
    expect(plan.reverb.type).toBe('plate')
    expect(plan.reverb.decaySeconds).toBeCloseTo(6, 8)
    expect(plan.reverb.mix).toBe(1)

    expect(plan.delay.enabled).toBe(true)
    expect(plan.delay.feedback).toBeCloseTo(0.88, 8)
    expect(plan.delay.delaySeconds).toBeCloseTo(1, 8)
    expect(plan.delay.mix).toBe(1)

    expect(plan.distortion.enabled).toBe(true)
    expect(plan.distortion.amount).toBe(1)
    expect(plan.distortion.toneHz).toBeCloseTo(12_000, 8)
    expect(plan.distortion.level).toBe(1)

    expect(plan.chorus.enabled).toBe(true)
    expect(plan.chorus.frequencyHz).toBeCloseTo(5, 8)
    expect(plan.chorus.depthSeconds).toBeCloseTo(0.012, 8)
    expect(plan.chorus.mix).toBe(1)

    expect(plan.phaser.enabled).toBe(true)
    expect(plan.phaser.frequencyHz).toBeCloseTo(4, 8)
    expect(plan.phaser.depthHz).toBeCloseTo(1_400, 8)
    expect(plan.phaser.mix).toBe(1)
  })

  it('maps the initialized state to six disabled effect blocks', () => {
    const plan = createFm1InspiredFxPlan(createInitializedFxState())

    expect(plan.filter.enabled).toBe(false)
    expect(plan.reverb.enabled).toBe(false)
    expect(plan.delay.enabled).toBe(false)
    expect(plan.distortion.enabled).toBe(false)
    expect(plan.chorus.enabled).toBe(false)
    expect(plan.phaser.enabled).toBe(false)
  })

  it('fails closed when a state bypasses the domain validator with an illegal value', () => {
    const state = createInitializedFxState()
    const illegal = {
      ...state,
      values: {
        ...state.values,
        'filter.cutoff': 108,
      },
    }

    expect(() => createFm1InspiredFxPlan(illegal)).toThrow('filter.cutoff must be an integer from 0 through 107')
  })
})

describe('FM1-inspired effect boundary', () => {
  it('keeps the explicit software routing stable and separate from physical-FM1 claims', () => {
    expect(FM1_INSPIRED_FX_ROUTING).toEqual([
      'filter',
      'distortion',
      'chorus',
      'phaser',
      'delay',
      'reverb',
    ])
    expect(FM1_INSPIRED_FX_CLAIM).toContain('software approximation')
    expect(FM1_INSPIRED_FX_CLAIM).toContain('not known to match physical M-VAVE FM-1 firmware')
  })
})
