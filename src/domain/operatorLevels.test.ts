import { describe, expect, it } from 'vitest'
import {
  createSoloOperatorLevels,
  isSoloLevelShape,
  toSixOperatorLevels,
  toggleOperatorEnabled,
} from './operatorLevels'

describe('operator level masks', () => {
  it('mutes and restores an operator using its remembered non-zero level', () => {
    const initial = toSixOperatorLevels([99, 75, 0, 64, 0, 12])
    const muted = toggleOperatorEnabled(initial, 1, 99)

    expect(muted.levels).toEqual([99, 0, 0, 64, 0, 12])
    expect(muted.rememberedLevel).toBe(75)

    const restored = toggleOperatorEnabled(muted.levels, 1, muted.rememberedLevel)
    expect(restored.levels).toEqual(initial)
  })

  it('uses 99 when enabling an operator without a usable remembered level', () => {
    const initial = toSixOperatorLevels([0, 0, 0, 0, 0, 0])
    expect(toggleOperatorEnabled(initial, 4, 0).levels).toEqual([0, 0, 0, 0, 99, 0])
  })

  it('creates a solo mask without modifying the captured base levels', () => {
    const base = toSixOperatorLevels([99, 75, 0, 64, 20, 12])
    const solo = createSoloOperatorLevels(base, 3, 99)

    expect(solo).toEqual([0, 0, 0, 64, 0, 0])
    expect(base).toEqual([99, 75, 0, 64, 20, 12])
    expect(isSoloLevelShape(solo, 3)).toBe(true)
  })

  it('restores a muted solo target from remembered level', () => {
    const base = toSixOperatorLevels([99, 75, 0, 64, 20, 12])
    expect(createSoloOperatorLevels(base, 2, 83)).toEqual([0, 0, 83, 0, 0, 0])
  })

  it('rejects malformed levels and indexes', () => {
    expect(() => toSixOperatorLevels([1, 2, 3])).toThrow(/six/)
    expect(() => toSixOperatorLevels([1, 2, 3, 4, 5, 100])).toThrow(/0 to 99/)
    expect(() => toggleOperatorEnabled(toSixOperatorLevels([0, 0, 0, 0, 0, 0]), 6, 99)).toThrow(/0 to 5/)
  })
})
