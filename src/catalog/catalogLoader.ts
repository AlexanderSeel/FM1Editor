import { unzipSync } from 'fflate'
import { websiteBanksFromManifest } from './catalogManifest'
import { fetchRemoteSysex } from './remoteSysex'
import { buildPatchCatalog, type PatchCatalog, type PatchCatalogEntry } from './patchCatalog'
import { YAMAHA_BLACK_BOXES_BANKS, type WebsiteCatalogBank } from './yamahaBlackBoxesCatalog'

const ARCHIVE_REMOTE_URL = 'https://github.com/probonopd/MiniDexed/files/11312517/sysexFinal.zip'
const ARCHIVE_EXPECTED_SHA256 = 'fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263'

export interface LoadedPatchCatalog extends PatchCatalog {
  archiveSource: 'build-mirror' | 'original-source'
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

async function digestSha256(bytes: Uint8Array): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const copy = Uint8Array.from(bytes)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copy.buffer)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

async function loadArchive(): Promise<{ bytes: Uint8Array; source: LoadedPatchCatalog['archiveSource'] }> {
  try {
    return { bytes: await fetchBytes(assetUrl('catalog/sysexFinal.zip')), source: 'build-mirror' }
  } catch {
    try {
      return { bytes: await fetchBytes(ARCHIVE_REMOTE_URL), source: 'original-source' }
    } catch (cause) {
      throw new Error(
        `The bundled patch archive is unavailable. Run npm run catalog:sync for local development. ${cause instanceof Error ? cause.message : ''}`.trim(),
      )
    }
  }
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
    const [archive, website] = await Promise.all([loadArchive(), loadWebsiteBanks()])
    const actualSha256 = await digestSha256(archive.bytes)
    const catalog = buildPatchCatalog(unzipSync(archive.bytes), website.banks)
    return {
      ...catalog,
      archiveSource: archive.source,
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

export async function loadCatalogEntryBytes(entry: PatchCatalogEntry): Promise<Uint8Array> {
  if (entry.archivePath) {
    const catalog = await loadPatchCatalog()
    const bytes = catalog.files.get(entry.archivePath)
    if (!bytes) throw new Error(`The archive no longer contains ${entry.archivePath}.`)
    return bytes
  }

  const website = entry.website
  if (!website) throw new Error('This catalog entry has no loadable source.')
  try {
    return await fetchBytes(assetUrl(website.mirrorPath))
  } catch {
    return fetchRemoteSysex(website.remoteUrl, 2_000_000)
  }
}

export function resetPatchCatalogCache(): void {
  catalogPromise = null
}
