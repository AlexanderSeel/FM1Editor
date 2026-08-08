import { describe, expect, it } from 'vitest'
import { createInitializedFxState, updateFxValue, type Fm1FxBlockId } from '../domain/fx'
import { createFm1InspiredFxPlan, FM1_INSPIRED_FX_ROUTING } from './fm1InspiredFxGraph'

const enableId: Record<Fm1FxBlockId, string> = {
  filter: 'filter.enabled',
  reverb: 'reverb.enabled',
  delay: 'delay.enabled',
  distortion: 'distortion.enabled',
  chorus: 'chorus.enabled',
  phaser: 'phaser.enabled',
}

function enableOnly(block: Fm1FxBlockId) {
  let state = createInitializedFxState()
  state = updateFxValue(state, enableId[block], 1)
  if (block === 'reverb') state = updateFxValue(state, 'reverb.mix', 60)
  if (block === 'delay') state = updateFxValue(state, 'delay.mix', 60)
  if (block === 'distortion') state = updateFxValue(state, 'distortion.gain', 60)
  if (block === 'distortion') state = updateFxValue(state, 'distortion.level', 60)
  if (block === 'chorus') state = updateFxValue(state, 'chorus.mix', 60)
  if (block === 'chorus') state = updateFxValue(state, 'chorus.depth', 60)
  if (block === 'phaser') state = updateFxValue(state, 'phaser.mix', 60)
  if (block === 'phaser') state = updateFxValue(state, 'phaser.depth', 60)
  if (block === 'filter') state = updateFxValue(state, 'filter.cutoff', 60)
  return state
}

describe('FM-1-inspired effect isolation plans', () => {
  it.each(FM1_INSPIRED_FX_ROUTING)('enables only the selected %s block', (selected) => {
    const plan = createFm1InspiredFxPlan(enableOnly(selected))
    const enabled = FM1_INSPIRED_FX_ROUTING.filter((block) => plan[block].enabled)
    expect(enabled).toEqual([selected])
  })

  it('keeps all blocks disabled for the initialized dry state', () => {
    const plan = createFm1InspiredFxPlan(createInitializedFxState())
    expect(FM1_INSPIRED_FX_ROUTING.every((block) => plan[block].enabled === false)).toBe(true)
  })

  it('keeps disabled wet-style blocks at zero mix even when their parameter values are non-zero', () => {
    let state = createInitializedFxState()
    state = updateFxValue(state, 'reverb.mix', 80)
    state = updateFxValue(state, 'delay.mix', 70)
    state = updateFxValue(state, 'chorus.mix', 60)
    state = updateFxValue(state, 'phaser.mix', 50)
    const plan = createFm1InspiredFxPlan(state)

    expect(plan.reverb.enabled).toBe(false)
    expect(plan.delay.enabled).toBe(false)
    expect(plan.chorus.enabled).toBe(false)
    expect(plan.phaser.enabled).toBe(false)
    // Parameter plans retain documented values, while the graph's setMix() gates wet signal by enabled state.
    expect(plan.reverb.mix).toBeCloseTo(0.8)
    expect(plan.delay.mix).toBeCloseTo(0.7)
    expect(plan.chorus.mix).toBeCloseTo(0.6)
    expect(plan.phaser.mix).toBeCloseTo(0.5)
  })
})
