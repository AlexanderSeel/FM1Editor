import type { Dx7Curve, Dx7KeyboardScaling } from './voice'

export type KeyboardScalingSide = 'left' | 'right'
export type KeyboardScalingParameter = 'breakPoint' | 'leftDepth' | 'rightDepth'

export const KEYBOARD_SCALING_GRAPH_WIDTH = 320
export const KEYBOARD_SCALING_GRAPH_HEIGHT = 150
export const KEYBOARD_SCALING_GRAPH_LEFT = 16
export const KEYBOARD_SCALING_GRAPH_RIGHT = 304
export const KEYBOARD_SCALING_GRAPH_CENTER_Y = 76
export const KEYBOARD_SCALING_GRAPH_MAX_OFFSET = 52

export interface KeyboardScalingPoint {
  readonly x: number
  readonly y: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function clampParameter(value: number): number {
  return Math.round(clamp(value, 0, 99))
}

export function keyboardScalingCurvePolarity(curve: Dx7Curve): -1 | 1 {
  return curve.startsWith('negative') ? -1 : 1
}

export function keyboardScalingCurveAmount(curve: Dx7Curve, distance: number): number {
  const normalized = clamp(distance, 0, 1)
  return curve.endsWith('exponential') ? normalized * normalized : normalized
}

export function breakPointToKeyboardScalingX(breakPoint: number): number {
  const ratio = clampParameter(breakPoint) / 99
  return KEYBOARD_SCALING_GRAPH_LEFT
    + ratio * (KEYBOARD_SCALING_GRAPH_RIGHT - KEYBOARD_SCALING_GRAPH_LEFT)
}

export function keyboardScalingXToBreakPoint(x: number): number {
  const bounded = clamp(x, KEYBOARD_SCALING_GRAPH_LEFT, KEYBOARD_SCALING_GRAPH_RIGHT)
  const ratio = (bounded - KEYBOARD_SCALING_GRAPH_LEFT)
    / (KEYBOARD_SCALING_GRAPH_RIGHT - KEYBOARD_SCALING_GRAPH_LEFT)
  return clampParameter(ratio * 99)
}

export function keyboardScalingOffsetToY(offset: number): number {
  const bounded = clamp(offset, -99, 99)
  return KEYBOARD_SCALING_GRAPH_CENTER_Y
    - (bounded / 99) * KEYBOARD_SCALING_GRAPH_MAX_OFFSET
}

export function keyboardScalingYToDepth(y: number, curve: Dx7Curve): number {
  const polarity = keyboardScalingCurvePolarity(curve)
  const offset = ((KEYBOARD_SCALING_GRAPH_CENTER_Y - y) / KEYBOARD_SCALING_GRAPH_MAX_OFFSET) * 99
  return clampParameter(offset * polarity)
}

function sideCurve(scaling: Dx7KeyboardScaling, side: KeyboardScalingSide): Dx7Curve {
  return side === 'left' ? scaling.leftCurve : scaling.rightCurve
}

function sideDepth(scaling: Dx7KeyboardScaling, side: KeyboardScalingSide): number {
  return side === 'left' ? scaling.leftDepth : scaling.rightDepth
}

export function keyboardScalingEndpoint(
  scaling: Dx7KeyboardScaling,
  side: KeyboardScalingSide,
): KeyboardScalingPoint {
  const curve = sideCurve(scaling, side)
  const depth = sideDepth(scaling, side)
  const offset = keyboardScalingCurvePolarity(curve) * depth
  return {
    x: side === 'left' ? KEYBOARD_SCALING_GRAPH_LEFT : KEYBOARD_SCALING_GRAPH_RIGHT,
    y: keyboardScalingOffsetToY(offset),
  }
}

export function calculateKeyboardScalingPoints(
  scaling: Dx7KeyboardScaling,
  sampleCount = 32,
): readonly KeyboardScalingPoint[] {
  const breakX = breakPointToKeyboardScalingX(scaling.breakPoint)
  const safeSamples = Math.max(2, Math.round(sampleCount))
  const points: KeyboardScalingPoint[] = []

  for (let index = 0; index <= safeSamples; index += 1) {
    const x = KEYBOARD_SCALING_GRAPH_LEFT
      + (index / safeSamples) * (KEYBOARD_SCALING_GRAPH_RIGHT - KEYBOARD_SCALING_GRAPH_LEFT)
    const side: KeyboardScalingSide = x < breakX ? 'left' : 'right'
    const span = side === 'left'
      ? Math.max(1, breakX - KEYBOARD_SCALING_GRAPH_LEFT)
      : Math.max(1, KEYBOARD_SCALING_GRAPH_RIGHT - breakX)
    const distance = side === 'left' ? (breakX - x) / span : (x - breakX) / span
    const curve = sideCurve(scaling, side)
    const depth = sideDepth(scaling, side)
    const offset = keyboardScalingCurvePolarity(curve)
      * depth
      * keyboardScalingCurveAmount(curve, distance)
    points.push({ x, y: keyboardScalingOffsetToY(offset) })
  }

  points.push({ x: breakX, y: KEYBOARD_SCALING_GRAPH_CENTER_Y })
  return points.sort((left, right) => left.x - right.x || left.y - right.y)
}

export function updateKeyboardScalingBreakPointFromX(
  scaling: Dx7KeyboardScaling,
  x: number,
): Dx7KeyboardScaling {
  return { ...scaling, breakPoint: keyboardScalingXToBreakPoint(x) }
}

export function updateKeyboardScalingDepthFromY(
  scaling: Dx7KeyboardScaling,
  side: KeyboardScalingSide,
  y: number,
): Dx7KeyboardScaling {
  const depth = keyboardScalingYToDepth(y, sideCurve(scaling, side))
  return side === 'left'
    ? { ...scaling, leftDepth: depth }
    : { ...scaling, rightDepth: depth }
}

export function adjustKeyboardScalingParameter(
  scaling: Dx7KeyboardScaling,
  parameter: KeyboardScalingParameter,
  delta: number,
): Dx7KeyboardScaling {
  return { ...scaling, [parameter]: clampParameter(scaling[parameter] + delta) }
}
