export const FM1_REVIEWED_FIRMWARE_BASELINE = Object.freeze({
  version: 'V15',
  releasedAt: '2026-07-30',
  reviewedAt: '2026-08-09',
  source: 'https://www.m-vave.com/download',
} as const)

export function normalizeFm1FirmwareVersion(value: string): string {
  return value.trim().toUpperCase()
}

export function matchesReviewedFm1FirmwareBaseline(value: string): boolean {
  return normalizeFm1FirmwareVersion(value) === FM1_REVIEWED_FIRMWARE_BASELINE.version
}
