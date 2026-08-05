import { calculateYamahaChecksum, DX7_BANK_DATA_LENGTH, DX7_BANK_MESSAGE_LENGTH } from '../sysex/dx7'
import { YAMAHA_BLACK_BOXES_BANKS, type WebsiteCatalogBank } from './yamahaBlackBoxesCatalog'

export type PatchCatalogStatus = 'valid' | 'checksum-error' | 'unsupported' | 'remote'
export type PatchCatalogAvailability = 'archive' | 'archive-and-website' | 'website'

export interface PatchCatalogEntry {
  id: string
  title: string
  filename: string
  archivePath: string | null
  source: string
  folder: string
  status: PatchCatalogStatus
  availability: PatchCatalogAvailability
  size: number | null
  voices: readonly string[]
  website?: WebsiteCatalogBank
}

export interface PatchCatalog {
  entries: readonly PatchCatalogEntry[]
  files: ReadonlyMap<string, Uint8Array>
  stats: {
    archiveFiles: number
    validBanks: number
    diagnosticBanks: number
    websiteBanks: number
    websiteMatchedArchive: number
    websiteOnly: number
  }
}

function stripArchiveRoot(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.startsWith('sysexFinal/') ? normalized.slice('sysexFinal/'.length) : normalized
}

function readVoiceName(bytes: Uint8Array, offset: number): string {
  return Array.from(bytes.slice(offset, offset + 10), (value) => {
    const character = value & 0x7f
    return character >= 32 && character < 127 ? String.fromCharCode(character) : ' '
  }).join('').trimEnd()
}

export function inspectDx7Bank(bytes: Uint8Array): { status: PatchCatalogStatus; voices: readonly string[] } {
  if (
    bytes.length !== DX7_BANK_MESSAGE_LENGTH ||
    bytes[0] !== 0xf0 ||
    bytes[1] !== 0x43 ||
    bytes[3] !== 0x09 ||
    bytes.at(-1) !== 0xf7
  ) {
    return { status: 'unsupported', voices: [] }
  }

  const payload = bytes.slice(6, 6 + DX7_BANK_DATA_LENGTH)
  const voices = Array.from({ length: 32 }, (_, index) =>
    readVoiceName(payload, index * 128 + 118),
  )
  const status = bytes[4102] === calculateYamahaChecksum(payload) ? 'valid' : 'checksum-error'
  return { status, voices }
}

function archivePreference(entry: PatchCatalogEntry): number {
  const path = entry.archivePath?.toLowerCase() ?? ''
  if (path.startsWith('0_original_yamaha/0_dx7/')) return 0
  if (path.includes('original_yamaha')) return 1
  return 2
}

export function buildPatchCatalog(
  archiveFiles: Readonly<Record<string, Uint8Array>>,
  websiteBanks: readonly WebsiteCatalogBank[] = YAMAHA_BLACK_BOXES_BANKS,
): PatchCatalog {
  const files = new Map<string, Uint8Array>()
  const entries: PatchCatalogEntry[] = []

  for (const [rawPath, bytes] of Object.entries(archiveFiles)) {
    if (!rawPath.toLowerCase().endsWith('.syx') || rawPath.startsWith('__MACOSX/')) continue
    const path = stripArchiveRoot(rawPath)
    const parts = path.split('/')
    const filename = parts.at(-1) ?? path
    const folderParts = parts.slice(0, -1)
    const inspection = inspectDx7Bank(bytes)
    files.set(path, bytes)
    entries.push({
      id: `archive:${path}`,
      title: filename.replace(/\.syx$/i, ''),
      filename,
      archivePath: path,
      source: (folderParts[0] ?? 'Unsorted').replaceAll('_', ' '),
      folder: folderParts.map((part) => part.replaceAll('_', ' ')).join(' / '),
      status: inspection.status,
      availability: 'archive',
      size: bytes.byteLength,
      voices: inspection.voices,
    })
  }

  const archiveByFilename = new Map<string, PatchCatalogEntry[]>()
  for (const entry of entries) {
    const key = entry.filename.toLowerCase()
    archiveByFilename.set(key, [...(archiveByFilename.get(key) ?? []), entry])
  }

  let matched = 0
  let websiteOnly = 0
  for (const website of websiteBanks) {
    const candidates = archiveByFilename.get(website.filename.toLowerCase())
      ?.sort((left, right) => archivePreference(left) - archivePreference(right))
    const match = candidates?.[0]
    if (match) {
      const index = entries.indexOf(match)
      entries[index] = {
        ...match,
        title: website.label,
        availability: 'archive-and-website',
        website,
      }
      matched += 1
      continue
    }

    entries.push({
      id: `website:${website.filename.toLowerCase()}`,
      title: website.label,
      filename: website.filename,
      archivePath: null,
      source: 'Yamaha Black Boxes',
      folder: website.category,
      status: 'remote',
      availability: 'website',
      size: null,
      voices: website.voices ?? [],
      website,
    })
    websiteOnly += 1
  }

  entries.sort((left, right) =>
    left.source.localeCompare(right.source) ||
    left.folder.localeCompare(right.folder) ||
    left.title.localeCompare(right.title),
  )

  return {
    entries,
    files,
    stats: {
      archiveFiles: files.size,
      validBanks: entries.filter((entry) => entry.status === 'valid').length,
      diagnosticBanks: entries.filter((entry) => entry.status === 'checksum-error' || entry.status === 'unsupported').length,
      websiteBanks: websiteBanks.length,
      websiteMatchedArchive: matched,
      websiteOnly,
    },
  }
}

export function filterPatchCatalog(
  entries: readonly PatchCatalogEntry[],
  options: { query: string; source: string; availability: 'all' | PatchCatalogAvailability; includeDiagnostics: boolean },
): readonly PatchCatalogEntry[] {
  const query = options.query.trim().toLowerCase()
  return entries.filter((entry) => {
    if (!options.includeDiagnostics && (entry.status === 'checksum-error' || entry.status === 'unsupported')) return false
    if (options.source !== 'all' && entry.source !== options.source) return false
    if (options.availability !== 'all' && entry.availability !== options.availability) return false
    if (!query) return true
    return [entry.title, entry.filename, entry.source, entry.folder, ...entry.voices]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
}
