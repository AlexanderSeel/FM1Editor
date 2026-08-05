import {
  YAMAHA_BLACK_BOXES_BANKS,
  type WebsiteCatalogBank,
} from './yamahaBlackBoxesCatalog'

interface ManifestWebsiteFile {
  filename: string
  sourceUrl: string
  assetPath: string
  size: number
  sha256: string
}

interface PatchCatalogSyncManifest {
  version: number
  website: {
    pageUrl: string
    discoveredFiles: number
    files: readonly ManifestWebsiteFile[]
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isWebsiteFile(value: unknown): value is ManifestWebsiteFile {
  if (!isRecord(value)) return false
  return (
    typeof value.filename === 'string' &&
    typeof value.sourceUrl === 'string' &&
    typeof value.assetPath === 'string' &&
    typeof value.size === 'number' &&
    typeof value.sha256 === 'string'
  )
}

function parseManifest(value: unknown): PatchCatalogSyncManifest {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.website)) {
    throw new Error('The patch catalog manifest has an unsupported structure.')
  }
  const files = value.website.files
  if (!Array.isArray(files) || !files.every(isWebsiteFile)) {
    throw new Error('The patch catalog manifest does not contain a valid website file list.')
  }
  const pageUrl = value.website.pageUrl
  const discoveredFiles = value.website.discoveredFiles
  if (typeof pageUrl !== 'string' || typeof discoveredFiles !== 'number') {
    throw new Error('The patch catalog manifest is missing website metadata.')
  }
  return {
    version: 1,
    website: { pageUrl, discoveredFiles, files },
  }
}

function humanizePathSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function deriveCategory(assetPath: string): string {
  const parts = assetPath.replaceAll('\\', '/').split('/')
  const filenameIndex = Math.max(0, parts.length - 1)
  const category = parts[filenameIndex - 1]?.toLowerCase()
  if (category === 'factory') return 'Factory'
  if (category === 'vrc') return 'VRC Voice ROM'
  if (category === 'greymatter') return 'GreyMatter E! Card'
  return category ? humanizePathSegment(category) : 'Website'
}

function derivedLabel(filename: string): string {
  return filename
    .replace(/\.(?:syx|sysex)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function websiteBanksFromManifest(
  value: unknown,
  fallback: readonly WebsiteCatalogBank[] = YAMAHA_BLACK_BOXES_BANKS,
): readonly WebsiteCatalogBank[] {
  const manifest = parseManifest(value)
  const metadataByFilename = new Map(
    fallback.map((bank) => [bank.filename.toLowerCase(), bank]),
  )
  const result = new Map<string, WebsiteCatalogBank>()

  for (const file of manifest.website.files) {
    if (!/^https:\/\//i.test(file.sourceUrl)) continue
    if (!/\.(?:syx|sysex)$/i.test(file.filename)) continue
    const metadata = metadataByFilename.get(file.filename.toLowerCase())
    const bank: WebsiteCatalogBank = {
      filename: file.filename,
      label: metadata?.label ?? derivedLabel(file.filename),
      category: metadata?.category ?? deriveCategory(file.assetPath),
      remoteUrl: file.sourceUrl,
      mirrorPath: file.assetPath,
      ...(metadata?.voices ? { voices: metadata.voices } : {}),
    }
    result.set(file.sourceUrl, bank)
  }

  if (result.size === 0) {
    throw new Error('The patch catalog manifest contains no usable SysEx files.')
  }
  return [...result.values()].sort((left, right) =>
    left.category.localeCompare(right.category) || left.label.localeCompare(right.label),
  )
}
