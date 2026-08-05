import { describe, expect, it } from 'vitest'
import { DX7_ALGORITHMS } from '../domain/dx7Algorithms'
import { calculateAlgorithmLayout } from './AlgorithmGraph'

describe('algorithm graph layout', () => {
  it('places all six operators within the graph for every DX7 algorithm', () => {
    for (const algorithm of DX7_ALGORITHMS) {
      const positions = calculateAlgorithmLayout(algorithm)

      expect(positions).toHaveLength(6)
      expect(positions.map((position) => position.operator).sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5, 6])
      for (const position of positions) {
        expect(Number.isFinite(position.x)).toBe(true)
        expect(Number.isFinite(position.y)).toBe(true)
        expect(position.x).toBeGreaterThanOrEqual(0)
        expect(position.x).toBeLessThanOrEqual(720)
        expect(position.y).toBeGreaterThanOrEqual(0)
        expect(position.y).toBeLessThanOrEqual(360)
      }
    }
  })

  it('places carriers at the common output depth', () => {
    for (const algorithm of DX7_ALGORITHMS) {
      const positionByOperator = new Map(
        calculateAlgorithmLayout(algorithm).map((position) => [position.operator, position]),
      )
      const carrierY = algorithm.carriers.map((carrier) => positionByOperator.get(carrier)?.y)
      expect(new Set(carrierY)).toEqual(new Set([292]))
    }
  })
})
