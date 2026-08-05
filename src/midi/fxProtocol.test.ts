import { describe, expect, it } from 'vitest'
import { createInitializedFxState, updateFxValue } from '../domain/fx'
import { encodeFm1FxParameter, encodeFm1FxState } from './fxProtocol'

describe('FM-1 FX protocol', () => {
  it('encodes documented CCs on the selected effects channel', () => {
    expect(Array.from(encodeFm1FxParameter(2, 'filter.cutoff', 107).data)).toEqual([0xb1, 2, 107])
    expect(Array.from(encodeFm1FxParameter(16, 'phaser.mix', 100).data)).toEqual([0xbf, 23, 100])
  })

  it('validates parameter-specific ranges', () => {
    expect(() => encodeFm1FxParameter(2, 'filter.q', 11)).toThrow(/between 0 and 10/)
    expect(() => encodeFm1FxParameter(2, 'filter.type', 3)).toThrow(/between 0 and 2/)
  })

  it('encodes all 24 documented controls in controller order', () => {
    const state = updateFxValue(createInitializedFxState(), 'reverb.mix', 42)
    const messages = encodeFm1FxState(state)
    expect(messages).toHaveLength(24)
    expect(messages.map((message) => message.controller)).toEqual(Array.from({ length: 24 }, (_, index) => index))
    expect(messages.find((message) => message.parameterId === 'reverb.mix')?.value).toBe(42)
  })
})
