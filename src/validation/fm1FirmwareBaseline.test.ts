import { describe, expect, it } from 'vitest'
import {
  FM1_REVIEWED_FIRMWARE_SNAPSHOT,
  normalizeFm1FirmwareVersion,
  officialFm1FirmwareSnapshotSummary,
} from './fm1FirmwareBaseline'

describe('FM-1 reviewed firmware snapshot', () => {
  it('records the two distinct official FM-1 firmware listings without guessing their device-version relationship', () => {
    expect(FM1_REVIEWED_FIRMWARE_SNAPSHOT).toEqual({
      reviewedAt: '2026-08-09',
      source: 'https://www.m-vave.com/download',
      firmwarePackages: [
        { platform: 'Windows', version: 'V14', releasedAt: '2026-07-06' },
        { platform: 'Mac', version: 'V14', releasedAt: '2026-07-06' },
      ],
      pcFirmware: { version: 'V09', releasedAt: '2026-06-24' },
      deviceDisplayedVersionRelation: 'unverified',
    })
  })

  it('normalizes operator-entered device firmware identity independently from the public download labels', () => {
    expect(normalizeFm1FirmwareVersion(' v14 ')).toBe('V14')
    expect(normalizeFm1FirmwareVersion(' V09 ')).toBe('V09')
  })

  it('summarizes both official listings for the delivery UI', () => {
    expect(officialFm1FirmwareSnapshotSummary()).toBe('Windows/Mac firmware package V14 (2026-07-06); PC Firmware V09 (2026-06-24)')
  })
})
