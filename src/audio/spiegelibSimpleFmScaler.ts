import {
  SPIEGELIB_MFCC_COUNT,
  SPIEGELIB_MFCC_FLAT_SIZE,
  SPIEGELIB_MFCC_FRAME_COUNT,
  SPIEGELIB_MFCC_SAMPLE_COUNT,
  SPIEGELIB_MFCC_SAMPLE_RATE,
  extractSpiegelibSimpleFmRawMfcc,
} from './spiegelibSimpleFmMfcc'

export const SPIEGELIB_SIMPLE_FM_SCALER_SCHEMA = 'fm1-editor.spiegelib-simple-fm-mfcc-scaler.v1' as const

export interface SpiegelibSimpleFmScaler {
  readonly schema: typeof SPIEGELIB_SIMPLE_FM_SCALER_SCHEMA
  readonly source: {
    readonly doi: string
    readonly archive: string
    readonly archiveMd5: string
    readonly member: string
    readonly memberSha256: string
    readonly license: string
    readonly creators: readonly string[]
  }
  readonly fitShape: readonly [50000, 44, 13]
  readonly fitAxis: readonly [0]
  readonly featureShape: readonly [44, 13]
  readonly mean: readonly (readonly number[])[]
  readonly std: readonly (readonly number[])[]
}

function isFiniteMatrix(value: unknown, rows: number, columns: number, positive: boolean): value is readonly (readonly number[])[] {
  if (!Array.isArray(value) || value.length !== rows) return false
  return value.every((row) => Array.isArray(row)
    && row.length === columns
    && row.every((cell) => typeof cell === 'number' && Number.isFinite(cell) && (!positive || cell > 0)))
}

export function validateSpiegelibSimpleFmScaler(value: unknown): asserts value is SpiegelibSimpleFmScaler {
  if (typeof value !== 'object' || value === null) throw new Error('SpiegeLib MFCC scaler must be an object.')
  const scaler = value as Partial<SpiegelibSimpleFmScaler>
  if (scaler.schema !== SPIEGELIB_SIMPLE_FM_SCALER_SCHEMA) throw new Error('Unsupported SpiegeLib MFCC scaler schema.')
  if (!Array.isArray(scaler.fitShape) || scaler.fitShape.join(',') !== '50000,44,13') throw new Error('SpiegeLib scaler fit shape must be 50000×44×13.')
  if (!Array.isArray(scaler.fitAxis) || scaler.fitAxis.join(',') !== '0') throw new Error('SpiegeLib scaler fit axis must be 0.')
  if (!Array.isArray(scaler.featureShape) || scaler.featureShape.join(',') !== '44,13') throw new Error('SpiegeLib scaler feature shape must be 44×13.')
  if (!isFiniteMatrix(scaler.mean, SPIEGELIB_MFCC_FRAME_COUNT, SPIEGELIB_MFCC_COUNT, false)) throw new Error('SpiegeLib scaler mean must be a finite 44×13 matrix.')
  if (!isFiniteMatrix(scaler.std, SPIEGELIB_MFCC_FRAME_COUNT, SPIEGELIB_MFCC_COUNT, true)) throw new Error('SpiegeLib scaler std must be a positive finite 44×13 matrix.')
}

export function standardizeSpiegelibSimpleFmMfcc(
  rawMfcc: ArrayLike<number>,
  scaler: SpiegelibSimpleFmScaler,
): Float32Array {
  validateSpiegelibSimpleFmScaler(scaler)
  if (rawMfcc.length !== SPIEGELIB_MFCC_FLAT_SIZE) throw new Error(`Raw SpiegeLib MFCC input must contain exactly ${SPIEGELIB_MFCC_FLAT_SIZE} values.`)
  const output = new Float32Array(SPIEGELIB_MFCC_FLAT_SIZE)
  for (let frame = 0; frame < SPIEGELIB_MFCC_FRAME_COUNT; frame += 1) {
    for (let coefficient = 0; coefficient < SPIEGELIB_MFCC_COUNT; coefficient += 1) {
      const index = frame * SPIEGELIB_MFCC_COUNT + coefficient
      const value = rawMfcc[index]
      const mean = scaler.mean[frame]?.[coefficient]
      const std = scaler.std[frame]?.[coefficient]
      if (value === undefined || !Number.isFinite(value) || mean === undefined || std === undefined) throw new Error(`Invalid SpiegeLib MFCC scaler input at ${frame}:${coefficient}.`)
      output[index] = (value - mean) / std
    }
  }
  return output
}

export function prepareSpiegelibSimpleFmOneSecond(
  samples: Float32Array,
  sourceSampleRate: number,
): Float32Array {
  if (!Number.isFinite(sourceSampleRate) || sourceSampleRate <= 0) throw new RangeError('Source sample rate must be positive.')
  if (samples.length === 0) throw new Error('SpiegeLib learned initialization requires non-empty reference audio.')
  for (let index = 0; index < samples.length; index += 1) {
    if (!Number.isFinite(samples[index])) throw new Error(`Reference sample ${index} must be finite.`)
  }

  const target = new Float32Array(SPIEGELIB_MFCC_SAMPLE_COUNT)
  if (sourceSampleRate === SPIEGELIB_MFCC_SAMPLE_RATE) {
    target.set(samples.subarray(0, Math.min(samples.length, target.length)))
    return target
  }

  const availableDuration = samples.length / sourceSampleRate
  const outputCount = Math.min(target.length, Math.ceil(availableDuration * SPIEGELIB_MFCC_SAMPLE_RATE))
  if (samples.length === 1) {
    target.fill(samples[0] ?? 0, 0, outputCount)
    return target
  }
  for (let outputIndex = 0; outputIndex < outputCount; outputIndex += 1) {
    const timeSeconds = outputIndex / SPIEGELIB_MFCC_SAMPLE_RATE
    const sourcePosition = timeSeconds * sourceSampleRate
    const left = Math.min(samples.length - 1, Math.floor(sourcePosition))
    const right = Math.min(samples.length - 1, left + 1)
    const fraction = sourcePosition - left
    target[outputIndex] = (samples[left] ?? 0) * (1 - fraction) + (samples[right] ?? 0) * fraction
  }
  return target
}

export function extractAndStandardizeSpiegelibSimpleFmMfcc(
  samples: Float32Array,
  sourceSampleRate: number,
  scaler: SpiegelibSimpleFmScaler,
): Float32Array {
  const oneSecond = prepareSpiegelibSimpleFmOneSecond(samples, sourceSampleRate)
  return standardizeSpiegelibSimpleFmMfcc(extractSpiegelibSimpleFmRawMfcc(oneSecond), scaler)
}
