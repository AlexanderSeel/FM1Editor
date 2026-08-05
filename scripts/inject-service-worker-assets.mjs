import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { relative, sep } from 'node:path'

const distRoot = new URL('../dist/', import.meta.url)
const serviceWorkerPath = new URL('sw.js', distRoot)

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
    if (entry.isDirectory()) files.push(...await listFiles(child))
    else files.push(child)
  }
  return files
}

function toPosixPath(fileUrl) {
  return relative(distRoot.pathname, fileUrl.pathname).split(sep).join('/')
}

function shouldPrecache(path) {
  if (path === 'sw.js' || path.endsWith('.map')) return false
  return path === 'index.html'
    || path === 'manifest.webmanifest'
    || path.startsWith('assets/')
    || path.startsWith('icons/')
}

const files = (await listFiles(distRoot))
  .map((file) => ({ file, path: toPosixPath(file) }))
  .filter(({ path }) => shouldPrecache(path))
  .sort((left, right) => left.path.localeCompare(right.path))

const hash = createHash('sha256')
const urls = ['./', ...files.map(({ path }) => `./${path}`)]
for (const { file, path } of files) {
  hash.update(path)
  hash.update(await readFile(file))
}
const version = hash.digest('hex').slice(0, 16)

let serviceWorker = await readFile(serviceWorkerPath, 'utf8')
serviceWorker = serviceWorker
  .replace('__FM1_CACHE_VERSION__', version)
  .replace('__FM1_PRECACHE_MANIFEST__', JSON.stringify(urls, null, 2))

if (serviceWorker.includes('__FM1_CACHE_VERSION__') || serviceWorker.includes('__FM1_PRECACHE_MANIFEST__')) {
  throw new Error('Service-worker build placeholders were not fully replaced.')
}

await writeFile(serviceWorkerPath, serviceWorker)
console.log(`Service worker generated with ${urls.length} precached URLs (${version}).`)
