import { unzipSync } from 'fflate'
import { websiteBanksFromManifest } from './catalogManifest'
import { assertStandardDx7Bank } from './catalogSysexValidation'
import { fetchRemoteSysex } from './remoteSysex'
import { buildPatchCatalog, type PatchCatalog, type PatchCatalogEntry } from './patchCatalog'
import { YAMAHA_BLACK_BOXES_BANKS, type WebsiteCatalogBank } from './yamahaBlackBoxesCatalog'

const ARCHIVE_EXPECTED_SHA256 = 'fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263'

export interface LoadedPatchCatalog extends PatchCatalog {
  archiveSource: 'bundled-source'
  archiveIntegrity: 'verified' | 'changed' | 'unavailable'
  websiteSource: 'sync-manifest' | 'static-fallback'
}

let catalogPromise: Promise<LoadedPatchCatalog> | null = null

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { credentials: 'omit' })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`)
  return new Uint8Array(await response.arrayBuffer())
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: 'omit' })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`)
  return response.json() as Promise<unknown>
}

function assertZipArchive(bytes: Uint8Array): void {
  const hasLocalHeader = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  const hasEmptyHeader = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x05 && bytes[3] === 0x06
  if (!hasLocalHeader && !hasEmptyHeader) {
    throw new Error('The tracked public/catalog/sysexFinal.zip asset is missing or is not valid ZIP data.')
  }
}

async function digestSha256(bytes: Uint8Array): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const copy = Uint8Array.from(bytes)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copy.buffer)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

async function loadArchive(): Promise<Uint8Array> {
  const bytes = await fetchBytes(assetUrl('catalog/sysexFinal.zip'))
  assertZipArchive(bytes)
  return bytes
}

async function loadWebsiteBanks(): Promise<{
  banks: readonly WebsiteCatalogBank[]
  source: LoadedPatchCatalog['websiteSource']
}> {
  try {
    const manifest = await fetchJson(assetUrl('catalog/sync-manifest.json'))
    return { banks: websiteBanksFromManifest(manifest), source: 'sync-manifest' }
  } catch {
    return { banks: YAMAHA_BLACK_BOXES_BANKS, source: 'static-fallback' }
  }
}

export async function loadPatchCatalog(): Promise<LoadedPatchCatalog> {
  catalogPromise ??= (async () => {
    const [archiveBytes, website] = await Promise.all([loadArchive(), loadWebsiteBanks()])
    const actualSha256 = await digestSha256(archiveBytes)
    const catalog = buildPatchCatalog(unzipSync(archiveBytes), website.banks)
    return {
      ...catalog,
      archiveSource: 'bundled-source',
      archiveIntegrity: actualSha256 === null
        ? 'unavailable'
        : actualSha256 === ARCHIVE_EXPECTED_SHA256
          ? 'verified'
          : 'changed',
      websiteSource: website.source,
    }
  })()
  return catalogPromise
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Unknown download error.'
}

export async function loadCatalogEntryBytes(entry: PatchCatalogEntry): Promise<Uint8Array> {
  if (entry.archivePath) {
    const catalog = await loadPatchCatalog()
    const bytes = catalog.files.get(entry.archivePath)
    if (!bytes) throw new Error(`The bundled archive no longer contains ${entry.archivePath}.`)
    return bytes
  }

  const website = entry.website
  if (!website) throw new Error('This catalog entry has no loadable source.')

  let mirrorFailure = 'not attempted'
  try {
    const mirrored = await fetchBytes(assetUrl(website.mirrorPath))
    assertStandardDx7Bank(mirrored, `The mirrored ${entry.filename} file`)
    return mirrored
  } catch (cause) {
    mirrorFailure = errorMessage(cause)
  }

  try {
    const remote = await fetchRemoteSysex(website.remoteUrl, 2_000_000)
    assertStandardDx7Bank(remote, `The downloaded ${entry.filename} file`)
    return remote
  } catch (cause) {
    throw new Error(
      `The Yamaha Black Boxes bank could not be loaded. Mirror: ${mirrorFailure} Direct source: ${errorMessage(cause)}`,
    )
  }
}

export function resetPatchCatalogCache(): void {
  catalogPromise = null
}
