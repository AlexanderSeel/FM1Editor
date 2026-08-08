import { describe, expect, it } from 'vitest'
import { createInitializedFxState, updateFxValue } from '../domain/fx'
import { createDx7CandidateFxAttachment } from './dx7CandidateFxState'

describe('createDx7CandidateFxAttachment', () => {
  it('captures an independent local FX snapshot and summarizes non-zero controls', () => {
    let state = createInitializedFxState()
    state = updateFxValue(state, 'filter.enabled', 1)
    state = updateFxValue(state, 'filter.cutoff', 22)
    const attachment = createDx7CandidateFxAttachment(state)

    expect(attachment.state).not.toBe(state)
    expect(attachment.state.values).not.toBe(state.values)
    expect(attachment.state.values['filter.enabled']).toBe(1)
    expect(attachment.state.values['filter.cutoff']).toBe(22)
    expect(attachment.nonZeroControls).toBe(2)
  })

  it('does not add any hardware or transport metadata', () => {
    const attachment = createDx7CandidateFxAttachment(createInitializedFxState())
    expect(attachment.nonZeroControls).toBe(0)
    expect(Object.keys(attachment)).toEqual(['state', 'nonZeroControls'])
  })
})
