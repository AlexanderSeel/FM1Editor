import { createServer } from 'node:http'
import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const arg = (name, fallback = null) => {
  const index = argv.indexOf(name)
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : fallback
}

const requestedBase = arg('--base', '/FM1Editor/')
const base = requestedBase === '/'
  ? '/'
  : `/${String(requestedBase).replace(/^\/+|\/+$/g, '')}/`
const distRoot = fileURLToPath(new URL('../dist/', import.meta.url))
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.zip': 'application/zip',
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function filesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesRecursively(path))
    else files.push(path)
  }
  return files
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (!url.pathname.startsWith(base)) {
        response.statusCode = 404
        response.end('outside deployment base')
        return
      }
      const relativeUrl = url.pathname.slice(base.length).replace(/^\/+/, '') || 'index.html'
      const relativePath = normalize(decodeURIComponent(relativeUrl)).replace(/^(\.\.[/\\])+/, '')
      let file = join(distRoot, relativePath)
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
      } catch {
        response.statusCode = 404
        response.end('not found')
        return
      }
      response.statusCode = 200
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
      response.setHeader('Cache-Control', 'no-store')
      response.end(await readFile(file))
    } catch (error) {
      response.statusCode = 500
      response.end(String(error))
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to resolve smoke server port')
  return { server, origin: `http://127.0.0.1:${address.port}` }
}

async function fetchOk(origin, path, expectedContentType = null) {
  const response = await fetch(`${origin}${path}`)
  assert(response.ok, `${path} returned HTTP ${response.status}`)
  if (expectedContentType) {
    const actual = response.headers.get('content-type') ?? ''
    assert(actual.includes(expectedContentType), `${path} returned unexpected content type ${actual}`)
  }
  return response
}

let server
try {
  const indexPath = join(distRoot, 'index.html')
  const index = await readFile(indexPath, 'utf8')
  assert(index.includes(`${base}manifest.webmanifest`), 'Built index does not use deployment base for the web manifest')
  assert(index.includes(`${base}icons/fm1-192.svg`), 'Built index does not use deployment base for icons')

  const localAttributeUrls = [...index.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((match) => match[1])
  for (const url of localAttributeUrls) {
    assert(url.startsWith(base), `Built index contains a root-absolute URL outside deployment base: ${url}`)
  }

  const moduleMatch = index.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)
    ?? index.match(/<script[^>]+src="([^"]+)"[^>]+type="module"/)
  assert(moduleMatch?.[1], 'Built index does not contain a module entry script')
  assert(moduleMatch[1].startsWith(base), `Module entry is outside deployment base: ${moduleMatch[1]}`)

  const manifest = JSON.parse(await readFile(join(distRoot, 'manifest.webmanifest'), 'utf8'))
  assert(manifest.start_url === './', 'PWA manifest start_url must remain scope-relative')
  assert(manifest.scope === './', 'PWA manifest scope must remain relative')
  for (const icon of manifest.icons ?? []) {
    assert(typeof icon.src === 'string' && !icon.src.startsWith('/'), `PWA icon must remain scope-relative: ${String(icon.src)}`)
  }

  const serviceWorker = await readFile(join(distRoot, 'sw.js'), 'utf8')
  assert(!serviceWorker.includes('__FM1_CACHE_VERSION__'), 'Built service worker still contains cache-version placeholder')
  assert(!serviceWorker.includes('__FM1_PRECACHE_MANIFEST__'), 'Built service worker still contains precache placeholder')
  assert(serviceWorker.includes('new URL(self.registration.scope)'), 'Service worker must derive navigation fallback from its registration scope')
  assert(serviceWorker.includes('"./"'), 'Service worker precache must retain a scope-relative root entry')

  const textFiles = (await filesRecursively(distRoot)).filter((path) => ['.html', '.js', '.mjs', '.json', '.webmanifest'].includes(extname(path)))
  for (const path of textFiles) {
    const text = await readFile(path, 'utf8')
    const forbidden = [
      '"/catalog/',
      "'/catalog/",
      '`/catalog/',
      '"/virtual-dx7/',
      "'/virtual-dx7/",
      '`/virtual-dx7/',
      '"/sw.js',
      "'/sw.js",
      '`/sw.js',
    ]
    for (const fragment of forbidden) {
      assert(!text.includes(fragment), `${path} contains a root-only runtime asset reference ${fragment}`)
    }
  }

  const started = await startServer()
  server = started.server
  const { origin } = started
  await fetchOk(origin, base, 'text/html')
  await fetchOk(origin, moduleMatch[1], 'text/javascript')
  await fetchOk(origin, `${base}manifest.webmanifest`, 'application/manifest+json')
  await fetchOk(origin, `${base}sw.js`, 'text/javascript')
  await fetchOk(origin, `${base}icons/fm1-192.svg`, 'image/svg+xml')
  await fetchOk(origin, `${base}virtual-dx7/manifest.json`, 'application/json')
  await fetchOk(origin, `${base}virtual-dx7/fm1-msfa.mjs`, 'text/javascript')
  await fetchOk(origin, `${base}virtual-dx7/fm1-msfa.wasm`, 'application/wasm')
  await fetchOk(origin, `${base}virtual-dx7/fm1-msfa-worklet.js`, 'text/javascript')
  await fetchOk(origin, `${base}catalog/sysexFinal.zip`, 'application/zip')
  await fetchOk(origin, `${base}catalog/sync-manifest.json`, 'application/json')

  if (base !== '/') {
    const outside = await fetch(`${origin}/catalog/sysexFinal.zip`)
    assert(outside.status === 404, `Root-only catalog URL unexpectedly resolved with HTTP ${outside.status}`)
    const outsideEngine = await fetch(`${origin}/virtual-dx7/fm1-msfa.wasm`)
    assert(outsideEngine.status === 404, `Root-only WASM URL unexpectedly resolved with HTTP ${outsideEngine.status}`)
  }

  console.log(JSON.stringify({ ok: true, base, checkedTextFiles: textFiles.length, moduleEntry: moduleMatch[1] }))
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
}
