import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'

const ARCHIVE_EXPECTED_SHA256 = 'fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263'
const WEBSITE_PAGE_URL = 'https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/'
const OUTPUT_ROOT = new URL('../public/catalog/', import.meta.url)
const ARCHIVE_PATH = new URL('sysexFinal.zip', OUTPUT_ROOT)
const bestEffort = process.argv.includes('--best-effort')

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
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
  const path = new URL(relativePath, OUTPUT_ROOT)
  await mkdir(dirname(path.pathname), { recursive: true })
  await writeFile(path, bytes)
  return path
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
    try {
      const bytes = await fetchBytes(url)
      await writeBytes(relativePath, bytes)
      files.push({
        filename: basename(url.pathname),
        sourceUrl: url.href,
        assetPath: `catalog/${relativePath}`,
        size: bytes.byteLength,
        sha256: sha256(bytes),
      })
    } catch (cause) {
      const cached = await readCached(relativePath)
      if (!cached) throw cause
      console.warn(`Patch download failed for ${url.href}; using cached file.`)
      files.push({
        filename: basename(url.pathname),
        sourceUrl: url.href,
        assetPath: `catalog/${relativePath}`,
        size: cached.byteLength,
        sha256: sha256(cached),
      })
    }
  }

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
  console.log(`Patch catalog synchronized: ${files.length} website banks merged with the tracked sysexFinal.zip.`)
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
