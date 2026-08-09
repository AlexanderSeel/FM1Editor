import { describe, expect, it } from 'vitest'
import {
  FM1_REVIEWED_FIRMWARE_BASELINE,
  matchesReviewedFm1FirmwareBaseline,
  normalizeFm1FirmwareVersion,
} from './fm1FirmwareBaseline'

describe('FM-1 reviewed firmware baseline', () => {
  it('records the current reviewed official PC-firmware baseline', () => {
    expect(FM1_REVIEWED_FIRMWARE_BASELINE).toEqual({
      version: 'V15',
      releasedAt: '2026-07-30',
      reviewedAt: '2026-08-09',
      source: 'https://www.m-vave.com/download',
    })
  })

  it('matches firmware identity case-insensitively after trimming', () => {
    expect(normalizeFm1FirmwareVersion(' v15 ')).toBe('V15')
    expect(matchesReviewedFm1FirmwareBaseline(' v15 ')).toBe(true)
    expect(matchesReviewedFm1FirmwareBaseline('V14')).toBe(false)
  })
})
