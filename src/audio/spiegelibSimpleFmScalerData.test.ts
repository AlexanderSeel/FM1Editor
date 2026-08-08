import { describe, expect, it } from 'vitest'
import { getSpiegelibSimpleFmScaler } from './spiegelibSimpleFmScalerData'

describe('pinned SpiegeLib MFCC scaler data', () => {
  it('loads the archived CC BY scaler with exact provenance and dimensions', () => {
    const scaler = getSpiegelibSimpleFmScaler()
    expect(scaler.source).toMatchObject({
      doi: '10.5281/zenodo.3722784',
      archiveMd5: '7c9357219b70c07a4ab115d332f78ef5',
      memberSha256: '99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4',
      license: 'CC-BY-4.0',
    })
    expect(scaler.fitShape).toEqual([10, 44, 13])
    expect(scaler.fitAxis).toEqual([0])
    expect(scaler.featureShape).toEqual([44, 13])
    expect(scaler.mean).toHaveLength(44)
    expect(scaler.std).toHaveLength(44)
    expect(scaler.mean.every((row) => row.length === 13)).toBe(true)
    expect(scaler.std.every((row) => row.length === 13 && row.every((value) => value > 0))).toBe(true)
  })
})
