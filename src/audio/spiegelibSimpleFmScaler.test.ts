import { describe, expect, it } from 'vitest'
import {
  SPIEGELIB_SIMPLE_FM_SCALER_SCHEMA,
  prepareSpiegelibSimpleFmOneSecond,
  standardizeSpiegelibSimpleFmMfcc,
  type SpiegelibSimpleFmScaler,
} from './spiegelibSimpleFmScaler'

function scaler(): SpiegelibSimpleFmScaler {
  return {
    schema: SPIEGELIB_SIMPLE_FM_SCALER_SCHEMA,
    source: {
      doi: '10.5281/zenodo.3722784',
      archive: 'data_simple_FM_mfcc.zip',
      archiveMd5: '7c9357219b70c07a4ab115d332f78ef5',
      member: 'data_simple_FM_mfcc/data_scaler.pkl',
      memberSha256: '99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4',
      license: 'CC-BY-4.0',
      creators: ['Jordie Shier', 'George Tzanetakis', 'Kirk McNally'],
    },
    fitShape: [50000, 44, 13],
    fitAxis: [0],
    featureShape: [44, 13],
    mean: Array.from({ length: 44 }, () => new Array<number>(13).fill(2)),
    std: Array.from({ length: 44 }, () => new Array<number>(13).fill(4)),
  }
}

describe('SpiegeLib scaler/input contract', () => {
  it('standardizes the 44×13 time-major feature vector cell-for-cell', () => {
    const raw = new Float32Array(44 * 13).fill(6)
    const standardized = standardizeSpiegelibSimpleFmMfcc(raw, scaler())
    expect(standardized).toHaveLength(572)
    expect([...standardized]).toEqual(new Array<number>(572).fill(1))
  })

  it('uses the first second at 44.1 kHz and zero-pads shorter references', () => {
    const long = Float32Array.from({ length: 44_200 }, (_, index) => index / 44_200)
    const selected = prepareSpiegelibSimpleFmOneSecond(long, 44_100)
    expect(selected).toHaveLength(44_100)
    expect(selected[0]).toBe(long[0])
    expect(selected[44_099]).toBe(long[44_099])

    const short = Float32Array.of(1, 0.5, -0.5)
    const padded = prepareSpiegelibSimpleFmOneSecond(short, 44_100)
    expect([...padded.slice(0, 3)]).toEqual([1, 0.5, -0.5])
    expect(padded[3]).toBe(0)
  })

  it('resamples deterministically to 44.1 kHz without stretching beyond one second', () => {
    const source = Float32Array.from({ length: 48_000 }, (_, index) => index / 48_000)
    const resampled = prepareSpiegelibSimpleFmOneSecond(source, 48_000)
    expect(resampled).toHaveLength(44_100)
    expect(resampled[0]).toBeCloseTo(0)
    expect(resampled[22_050]).toBeCloseTo(0.5, 4)
    expect(resampled[44_099]).toBeLessThan(1)
  })

  it('fails closed on malformed scaler matrices and feature lengths', () => {
    const bad = { ...scaler(), std: [[1]] }
    expect(() => standardizeSpiegelibSimpleFmMfcc(new Float32Array(572), bad as SpiegelibSimpleFmScaler)).toThrow(/44×13/)
    expect(() => standardizeSpiegelibSimpleFmMfcc(new Float32Array(571), scaler())).toThrow(/572/)
    expect(() => prepareSpiegelibSimpleFmOneSecond(new Float32Array(), 44_100)).toThrow(/non-empty/)
  })
})
