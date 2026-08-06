import { describe, expect, it } from 'vitest'
import type { Dx7KeyboardScaling } from './voice'
import {
  adjustKeyboardScalingParameter,
  breakPointToKeyboardScalingX,
  calculateKeyboardScalingPoints,
  keyboardScalingCurveAmount,
  keyboardScalingEndpoint,
  keyboardScalingXToBreakPoint,
  updateKeyboardScalingBreakPointFromX,
  updateKeyboardScalingDepthFromY,
} from './keyboardScalingGeometry'

function scaling(overrides: Partial<Dx7KeyboardScaling> = {}): Dx7KeyboardScaling {
  return {
    breakPoint: 49,
    leftDepth: 0,
    rightDepth: 0,
    leftCurve: 'negative-linear',
    rightCurve: 'positive-linear',
    rateScaling: 0,
    ...overrides,
  }
}

describe('keyboard scaling geometry', () => {
  it('round-trips every valid breakpoint', () => {
    for (let value = 0; value <= 99; value += 1) {
      expect(keyboardScalingXToBreakPoint(breakPointToKeyboardScalingX(value))).toBe(value)
    }
  })

  it('keeps zero-depth scaling flat at the center line', () => {
    const points = calculateKeyboardScalingPoints(scaling())
    expect(points.every((point) => point.y === 76)).toBe(true)
  })

  it('draws positive curves above and negative curves below the center line', () => {
    const configured = scaling({
      leftDepth: 99,
      rightDepth: 99,
      leftCurve: 'negative-linear',
      rightCurve: 'positive-linear',
    })
    expect(keyboardScalingEndpoint(configured, 'left').y).toBeGreaterThan(76)
    expect(keyboardScalingEndpoint(configured, 'right').y).toBeLessThan(76)
  })

  it('distinguishes linear and exponential shapes', () => {
    expect(keyboardScalingCurveAmount('positive-linear', 0.5)).toBe(0.5)
    expect(keyboardScalingCurveAmount('positive-exponential', 0.5)).toBe(0.25)
    expect(keyboardScalingCurveAmount('negative-exponential', 1)).toBe(1)
  })

  it('updates breakpoint and depths from graph coordinates', () => {
    expect(updateKeyboardScalingBreakPointFromX(scaling(), breakPointToKeyboardScalingX(80)).breakPoint).toBe(80)

    const positive = scaling({ rightCurve: 'positive-linear' })
    expect(updateKeyboardScalingDepthFromY(positive, 'right', 24).rightDepth).toBe(99)

    const negative = scaling({ leftCurve: 'negative-linear' })
    expect(updateKeyboardScalingDepthFromY(negative, 'left', 128).leftDepth).toBe(99)
  })

  it('clamps keyboard adjustments to valid DX7 ranges', () => {
    expect(adjustKeyboardScalingParameter(scaling({ leftDepth: 98 }), 'leftDepth', 10).leftDepth).toBe(99)
    expect(adjustKeyboardScalingParameter(scaling({ rightDepth: 1 }), 'rightDepth', -10).rightDepth).toBe(0)
    expect(adjustKeyboardScalingParameter(scaling({ breakPoint: 40 }), 'breakPoint', 5).breakPoint).toBe(45)
  })
})
