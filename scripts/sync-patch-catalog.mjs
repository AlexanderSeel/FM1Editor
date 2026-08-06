import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { resolveCatalogOutputFile } from './catalog-output-path.mjs'

const ARCHIVE_EXPECTED_SHA256 = 'fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263'
const WEBSITE_PAGE_URL = 'https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/'
const OUTPUT_ROOT = new URL('../public/catalog/', import.meta.url)
const ARCHIVE_PATH = new URL('sysexFinal.zip', OUTPUT_ROOT)
const DX7_BANK_MESSAGE_LENGTH = 4104
const DX7_BANK_DATA_LENGTH = 4096
const bestEffort = process.argv.includes('--best-effort')

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function yamahaChecksum(bytes) {
  let sum = 0
  for (const value of bytes) sum = (sum + value) & 0x7f
  return (-sum) & 0x7f
}

function looksLikeTextResponse(bytes) {
  const prefix = bytes.subarray(0, 32).toString('utf8').trimStart().toLowerCase()
  return prefix.startsWith('<!doctype') || prefix.startsWith('<html') || prefix.startsWith('{')
}

function assertStandardDx7Bank(bytes, source) {
  const textHint = looksLikeTextResponse(bytes)
    ? ' The response appears to contain HTML or JSON instead of SysEx data.'
    : ''

  if (bytes.byteLength !== DX7_BANK_MESSAGE_LENGTH) {
    throw new Error(`${source} contains ${bytes.byteLength} bytes; expected ${DX7_BANK_MESSAGE_LENGTH}.${textHint}`)
  }
  if (
    bytes[0] !== 0xf0
    || bytes[1] !== 0x43
    || bytes[3] !== 0x09
    || bytes[4] !== 0x20
    || bytes[5] !== 0x00
    || bytes[DX7_BANK_MESSAGE_LENGTH - 1] !== 0xf7
  ) {
    throw new Error(`${source} is not a standard Yamaha DX7 32-voice bank.${textHint}`)
  }

  const payload = bytes.subarray(6, 6 + DX7_BANK_DATA_LENGTH)
  const expected = yamahaChecksum(payload)
  const actual = bytes[6 + DX7_BANK_DATA_LENGTH]
  if (actual !== expected) {
    throw new Error(`${source} has an invalid Yamaha checksum: expected ${expected}, received ${actual ?? -1}.`)
  }
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'FM1Editor catalog sync (+https://github.com/AlexanderSeel/FM1Editor)' },
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`)
  return Buffer.from(await response.arrayBuffer())
}

async function writeBytes(relativePath, bytes) {
  const output = resolveCatalogOutputFile(OUTPUT_ROOT, relativePath)
  await mkdir(output.directory, { recursive: true })
  await writeFile(output.url, bytes)
  return output.url
}

function assertZipArchive(bytes) {
  const signature = bytes.subarray(0, 4).toString('hex')
  if (signature !== '504b0304' && signature !== '504b0506') {
    throw new Error('public/catalog/sysexFinal.zip is not valid ZIP data.')
  }
}

function extractSysexLinks(html) {
  const links = new Map()
  const expression = /href\s*=\s*["']([^"']+\.(?:syx|sysex)(?:\?[^"']*)?)["']/giu
  for (const match of html.matchAll(expression)) {
    const href = match[1]
    if (!href) continue
    const url = new URL(href, WEBSITE_PAGE_URL)
    if (url.protocol !== 'https:') continue
    links.set(url.href, url)
  }
  return [...links.values()].sort((left, right) => left.pathname.localeCompare(right.pathname))
}

function websiteRelativePath(url) {
  const marker = '/patches/dx7/'
  const index = url.pathname.toLowerCase().indexOf(marker)
  const relative = index >= 0 ? url.pathname.slice(index + marker.length) : basename(url.pathname)
  return `yamaha-black-boxes/${relative}`
}

async function readCached(relativePath) {
  try {
    return await readFile(new URL(relativePath, OUTPUT_ROOT))
  } catch {
    return null
  }
}

async function loadTrackedArchive() {
  const bytes = await readFile(ARCHIVE_PATH)
  assertZipArchive(bytes)
  const actualSha256 = sha256(bytes)
  if (actualSha256 !== ARCHIVE_EXPECTED_SHA256) {
    throw new Error(`Tracked sysexFinal.zip SHA-256 changed: expected ${ARCHIVE_EXPECTED_SHA256}, received ${actualSha256}.`)
  }
  return { bytes, sha256: actualSha256 }
}

async function synchronize() {
  await mkdir(OUTPUT_ROOT, { recursive: true })
  const archive = await loadTrackedArchive()

  let pageHtml
  try {
    pageHtml = (await fetchBytes(WEBSITE_PAGE_URL)).toString('utf8')
  } catch (cause) {
    const cachedManifest = await readCached('sync-manifest.json')
    if (!cachedManifest) throw cause
    console.warn(`Yamaha Black Boxes page fetch failed; keeping cached mirror: ${cause instanceof Error ? cause.message : cause}`)
    return
  }

  const links = extractSysexLinks(pageHtml)
  if (links.length === 0) throw new Error('No SysEx links were found on the Yamaha Black Boxes patch page.')

  const files = []
  for (const url of links) {
    const relativePath = websiteRelativePath(url)
    let bytes = null

    try {
      const downloaded = await fetchBytes(url)
      assertStandardDx7Bank(downloaded, url.href)
      bytes = downloaded
      await writeBytes(relativePath, downloaded)
    } catch (cause) {
      const cached = await readCached(relativePath)
      if (cached) {
        try {
          assertStandardDx7Bank(cached, `Cached ${relativePath}`)
          bytes = cached
          console.warn(`Patch download failed or was invalid for ${url.href}; using validated cached file.`)
        } catch (cachedCause) {
          console.warn(`Skipping ${url.href}: download failed (${cause instanceof Error ? cause.message : cause}); cached copy is invalid (${cachedCause instanceof Error ? cachedCause.message : cachedCause}).`)
        }
      } else {
        console.warn(`Skipping ${url.href}: ${cause instanceof Error ? cause.message : cause}`)
      }
    }

    if (!bytes) continue
    files.push({
      filename: basename(url.pathname),
      sourceUrl: url.href,
      assetPath: `catalog/${relativePath}`,
      size: bytes.byteLength,
      sha256: sha256(bytes),
    })
  }

  if (files.length === 0) throw new Error('No checksum-valid Yamaha DX7 website banks were available.')

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    archive: {
      sourceKind: 'tracked-source',
      source: 'public/catalog/sysexFinal.zip',
      assetPath: 'catalog/sysexFinal.zip',
      size: archive.bytes.byteLength,
      sha256: archive.sha256,
      expectedSha256: ARCHIVE_EXPECTED_SHA256,
    },
    website: {
      pageUrl: WEBSITE_PAGE_URL,
      discoveredFiles: files.length,
      files,
    },
    rightsNotice: 'Patch rights vary by original author and collection. Source attribution is retained; users are responsible for permitted use.',
  }
  await writeBytes('sync-manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`))
  console.log(`Patch catalog synchronized: ${files.length} validated website banks merged with the tracked sysexFinal.zip.`)
}

try {
  await synchronize()
} catch (cause) {
  const message = cause instanceof Error ? cause.stack ?? cause.message : String(cause)
  if (bestEffort) {
    console.warn(`Patch catalog sync skipped: ${message}`)
  } else {
    console.error(message)
    process.exitCode = 1
  }
}
