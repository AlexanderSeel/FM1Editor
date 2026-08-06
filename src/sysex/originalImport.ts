export interface PreservedSysexFile {
  filename: string
  bytes: Uint8Array
}

function fallbackFilename(filename: string): string {
  const trimmed = filename.trim()
  return trimmed || 'imported-original.syx'
}

/**
 * Retains an immutable byte-for-byte copy of a user-selected SysEx file so the
 * original can be downloaded unchanged after semantic normalization is applied
 * to the editable voice model.
 */
export function preserveOriginalSysexFile(
  filename: string,
  bytes: Uint8Array,
): PreservedSysexFile {
  return {
    filename: fallbackFilename(filename),
    bytes: Uint8Array.from(bytes),
  }
}
