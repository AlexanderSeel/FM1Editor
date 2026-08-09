export const FM1_REVIEWED_FIRMWARE_SNAPSHOT = Object.freeze({
  reviewedAt: '2026-08-09',
  source: 'https://www.m-vave.com/download',
  firmwarePackages: Object.freeze([
    Object.freeze({ platform: 'Windows', version: 'V14', releasedAt: '2026-07-06' }),
    Object.freeze({ platform: 'Mac', version: 'V14', releasedAt: '2026-07-06' }),
  ]),
  pcFirmware: Object.freeze({ version: 'V09', releasedAt: '2026-06-24' }),
  deviceDisplayedVersionRelation: 'unverified',
} as const)

export function normalizeFm1FirmwareVersion(value: string): string {
  return value.trim().toUpperCase()
}

export function officialFm1FirmwareSnapshotSummary(): string {
  const packageVersion = FM1_REVIEWED_FIRMWARE_SNAPSHOT.firmwarePackages[0]?.version ?? 'unknown'
  const packageDate = FM1_REVIEWED_FIRMWARE_SNAPSHOT.firmwarePackages[0]?.releasedAt ?? 'unknown'
  return `Windows/Mac firmware package ${packageVersion} (${packageDate}); PC Firmware ${FM1_REVIEWED_FIRMWARE_SNAPSHOT.pcFirmware.version} (${FM1_REVIEWED_FIRMWARE_SNAPSHOT.pcFirmware.releasedAt})`
}
