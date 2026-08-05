import { describe, expect, it } from 'vitest'
import { DX7_ALGORITHMS, getDx7Algorithm } from './dx7Algorithms'

describe('DX7 algorithm routing', () => {
  it('defines all 32 algorithms and classifies every operator exactly once', () => {
    expect(DX7_ALGORITHMS).toHaveLength(32)

    for (const algorithm of DX7_ALGORITHMS) {
      const roles = [...algorithm.carriers, ...algorithm.modulators].sort((left, right) => left - right)
      expect(roles).toEqual([1, 2, 3, 4, 5, 6])
      expect(new Set(roles).size).toBe(6)
      expect(algorithm.maximumDepth).toBeGreaterThanOrEqual(0)
      expect(algorithm.maximumDepth).toBeLessThanOrEqual(5)
    }
  })

  it('derives algorithm 1 as two carrier stacks', () => {
    const algorithm = getDx7Algorithm(1)

    expect(algorithm.carriers).toEqual([1, 3])
    expect(algorithm.modulators).toEqual([2, 4, 5, 6])
    expect(algorithm.edges).toEqual(expect.arrayContaining([
      { from: 2, to: 1, kind: 'modulation' },
      { from: 4, to: 3, kind: 'modulation' },
      { from: 5, to: 4, kind: 'modulation' },
      { from: 6, to: 5, kind: 'modulation' },
      { from: 6, to: 6, kind: 'feedback' },
    ]))
    expect(algorithm.depthByOperator[6]).toBe(3)
    expect(algorithm.depthByOperator[1]).toBe(0)
  })

  it('derives multi-operator feedback separately from modulation routing', () => {
    const algorithm = getDx7Algorithm(4)

    expect(algorithm.carriers).toEqual([1, 4])
    expect(algorithm.edges).toContainEqual({ from: 4, to: 6, kind: 'feedback' })
    expect(algorithm.edges).toContainEqual({ from: 6, to: 5, kind: 'modulation' })
    expect(algorithm.edges).toContainEqual({ from: 5, to: 4, kind: 'modulation' })
  })

  it('derives algorithm 32 as six parallel carriers with OP6 feedback', () => {
    const algorithm = getDx7Algorithm(32)

    expect(algorithm.carriers).toEqual([1, 2, 3, 4, 5, 6])
    expect(algorithm.modulators).toEqual([])
    expect(algorithm.edges).toEqual([{ from: 6, to: 6, kind: 'feedback' }])
    expect(algorithm.maximumDepth).toBe(0)
  })

  it('rejects invalid algorithm numbers', () => {
    expect(() => getDx7Algorithm(0)).toThrow(/1 to 32/)
    expect(() => getDx7Algorithm(33)).toThrow(/1 to 32/)
    expect(() => getDx7Algorithm(1.5)).toThrow(/integer/)
  })
})
