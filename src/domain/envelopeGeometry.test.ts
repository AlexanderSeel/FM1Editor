import { describe, expect, it } from 'vitest'
import type { Dx7Envelope } from './voice'
import {
  adjustEnvelopeParameter,
  calculateEnvelopePoints,
  ENVELOPE_GRAPH_BOTTOM,
  ENVELOPE_GRAPH_LEFT,
  ENVELOPE_GRAPH_TOP,
  ENVELOPE_MAX_SEGMENT_WIDTH,
  ENVELOPE_MIN_SEGMENT_WIDTH,
  envelopeYToLevel,
  levelToEnvelopeY,
  rateToSegmentWidth,
  segmentWidthToRate,
  updateEnvelopeLevelFromY,
  updateEnvelopeRateFromX,
} from './envelopeGeometry'

const envelope: Dx7Envelope = {
  rates: [99, 70, 40, 0],
  levels: [99, 75, 25, 0],
}

describe('envelope graph geometry', () => {
  it('round-trips all DX7 rate and level values', () => {
    for (let value = 0; value <= 99; value += 1) {
      expect(segmentWidthToRate(rateToSegmentWidth(value))).toBe(value)
      expect(envelopeYToLevel(levelToEnvelopeY(value))).toBe(value)
    }
  })

  it('places all five envelope points on a fixed timeline', () => {
    const points = calculateEnvelopePoints(envelope)
    expect(points).toHaveLength(5)
    expect(points[0]?.x).toBe(ENVELOPE_GRAPH_LEFT)
    expect(points[0]?.y).toBe(ENVELOPE_GRAPH_BOTTOM)
    expect(points[1]?.y).toBe(ENVELOPE_GRAPH_TOP)
    expect(points[4]?.x).toBeLessThanOrEqual(320)
    expect(points.slice(1).every((point, index) => point.x > (points[index]?.x ?? -1))).toBe(true)
  })

  it('derives a stage rate from the dragged endpoint and clamps its duration', () => {
    const points = calculateEnvelopePoints(envelope)
    const stageTwoStart = points[2]
    expect(stageTwoStart).toBeDefined()

    const fastest = updateEnvelopeRateFromX(envelope, 2, (stageTwoStart?.x ?? 0) + ENVELOPE_MIN_SEGMENT_WIDTH - 100)
    expect(fastest.rates[2]).toBe(99)

    const slowest = updateEnvelopeRateFromX(envelope, 2, (stageTwoStart?.x ?? 0) + ENVELOPE_MAX_SEGMENT_WIDTH + 100)
    expect(slowest.rates[2]).toBe(0)
  })

  it('derives levels from vertical dragging and preserves all other values', () => {
    const high = updateEnvelopeLevelFromY(envelope, 2, ENVELOPE_GRAPH_TOP - 50)
    expect(high.levels).toEqual([99, 75, 99, 0])
    expect(high.rates).toEqual(envelope.rates)

    const low = updateEnvelopeLevelFromY(envelope, 1, ENVELOPE_GRAPH_BOTTOM + 50)
    expect(low.levels).toEqual([99, 0, 25, 0])
  })

  it('supports precise keyboard increments with clamping', () => {
    expect(adjustEnvelopeParameter(envelope, 'rate', 0, -10).rates[0]).toBe(89)
    expect(adjustEnvelopeParameter(envelope, 'rate', 3, -10).rates[3]).toBe(0)
    expect(adjustEnvelopeParameter(envelope, 'level', 0, 10).levels[0]).toBe(99)
    expect(adjustEnvelopeParameter(envelope, 'level', 2, -10).levels[2]).toBe(15)
  })
})
