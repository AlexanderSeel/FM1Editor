import {
  calculateYamahaChecksum,
  DX7_BANK_DATA_LENGTH,
  DX7_BANK_FORMAT,
  DX7_BANK_MESSAGE_LENGTH,
  DX7_MANUFACTURER_ID,
} from '../sysex/dx7'

function looksLikeTextResponse(bytes: Uint8Array): boolean {
  const prefix = Array.from(bytes.slice(0, 32), (value) => String.fromCharCode(value)).join('').trimStart().toLowerCase()
  return prefix.startsWith('<!doctype') || prefix.startsWith('<html') || prefix.startsWith('{')
}

export function assertStandardDx7Bank(bytes: Uint8Array, label = 'Catalog file'): void {
  const textHint = looksLikeTextResponse(bytes)
    ? ' The response appears to contain HTML or JSON instead of SysEx data.'
    : ''

  if (bytes.byteLength !== DX7_BANK_MESSAGE_LENGTH) {
    throw new Error(
      `${label} contains ${bytes.byteLength} bytes; a standard Yamaha DX7 32-voice bank requires ${DX7_BANK_MESSAGE_LENGTH}.${textHint}`,
    )
  }

  if (
    bytes[0] !== 0xf0
    || bytes[1] !== DX7_MANUFACTURER_ID
    || bytes[3] !== DX7_BANK_FORMAT
    || bytes[4] !== 0x20
    || bytes[5] !== 0x00
    || bytes[DX7_BANK_MESSAGE_LENGTH - 1] !== 0xf7
  ) {
    throw new Error(`${label} is not a standard Yamaha DX7 32-voice bank SysEx message.${textHint}`)
  }

  const payload = bytes.slice(6, 6 + DX7_BANK_DATA_LENGTH)
  const expectedChecksum = calculateYamahaChecksum(payload)
  const actualChecksum = bytes[6 + DX7_BANK_DATA_LENGTH]
  if (actualChecksum !== expectedChecksum) {
    throw new Error(`${label} has an invalid Yamaha checksum: expected ${expectedChecksum}, received ${actualChecksum ?? -1}.`)
  }
}
