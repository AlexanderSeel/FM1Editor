import type { Dx7Envelope, FourValues } from './voice'

export type EnvelopeStageIndex = 0 | 1 | 2 | 3

export const ENVELOPE_GRAPH_WIDTH = 320
export const ENVELOPE_GRAPH_HEIGHT = 120
export const ENVELOPE_GRAPH_LEFT = 5
export const ENVELOPE_GRAPH_TOP = 18
export const ENVELOPE_GRAPH_BOTTOM = 108
export const ENVELOPE_MIN_SEGMENT_WIDTH = 16
export const ENVELOPE_RATE_WIDTH_SCALE = 0.62
export const ENVELOPE_MAX_SEGMENT_WIDTH = ENVELOPE_MIN_SEGMENT_WIDTH + 99 * ENVELOPE_RATE_WIDTH_SCALE

export interface EnvelopePoint {
  readonly x: number
  readonly y: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function clampParameter(value: number): number {
  return Math.round(clamp(value, 0, 99))
}

function replaceFour(values: FourValues, index: EnvelopeStageIndex, value: number): FourValues {
  const next = [...values] as [number, number, number, number]
  next[index] = clampParameter(value)
  return next
}

export function rateToSegmentWidth(rate: number): number {
  return ENVELOPE_MIN_SEGMENT_WIDTH + (99 - clampParameter(rate)) * ENVELOPE_RATE_WIDTH_SCALE
}

export function segmentWidthToRate(width: number): number {
  const bounded = clamp(width, ENVELOPE_MIN_SEGMENT_WIDTH, ENVELOPE_MAX_SEGMENT_WIDTH)
  return clampParameter(99 - (bounded - ENVELOPE_MIN_SEGMENT_WIDTH) / ENVELOPE_RATE_WIDTH_SCALE)
}

export function levelToEnvelopeY(level: number): number {
  const ratio = clampParameter(level) / 99
  return ENVELOPE_GRAPH_BOTTOM - ratio * (ENVELOPE_GRAPH_BOTTOM - ENVELOPE_GRAPH_TOP)
}

export function envelopeYToLevel(y: number): number {
  const bounded = clamp(y, ENVELOPE_GRAPH_TOP, ENVELOPE_GRAPH_BOTTOM)
  const ratio = (ENVELOPE_GRAPH_BOTTOM - bounded) / (ENVELOPE_GRAPH_BOTTOM - ENVELOPE_GRAPH_TOP)
  return clampParameter(ratio * 99)
}

export function calculateEnvelopePoints(envelope: Dx7Envelope): readonly EnvelopePoint[] {
  const points: EnvelopePoint[] = [
    { x: ENVELOPE_GRAPH_LEFT, y: levelToEnvelopeY(envelope.levels[3]) },
  ]
  let x = ENVELOPE_GRAPH_LEFT

  for (let index = 0; index < 4; index += 1) {
    const stage = index as EnvelopeStageIndex
    x += rateToSegmentWidth(envelope.rates[stage])
    points.push({ x, y: levelToEnvelopeY(envelope.levels[stage]) })
  }

  return points
}

export function updateEnvelopeRateFromX(
  envelope: Dx7Envelope,
  stage: EnvelopeStageIndex,
  x: number,
): Dx7Envelope {
  const points = calculateEnvelopePoints(envelope)
  const previous = points[stage]
  if (!previous) return envelope
  const rate = segmentWidthToRate(x - previous.x)
  return { ...envelope, rates: replaceFour(envelope.rates, stage, rate) }
}

export function updateEnvelopeLevelFromY(
  envelope: Dx7Envelope,
  stage: EnvelopeStageIndex,
  y: number,
): Dx7Envelope {
  return { ...envelope, levels: replaceFour(envelope.levels, stage, envelopeYToLevel(y)) }
}

export function adjustEnvelopeParameter(
  envelope: Dx7Envelope,
  kind: 'rate' | 'level',
  stage: EnvelopeStageIndex,
  delta: number,
): Dx7Envelope {
  const values = kind === 'rate' ? envelope.rates : envelope.levels
  const current = values[stage]
  const next = clampParameter(current + delta)
  return kind === 'rate'
    ? { ...envelope, rates: replaceFour(envelope.rates, stage, next) }
    : { ...envelope, levels: replaceFour(envelope.levels, stage, next) }
}
