import { createServer } from 'node:http'
import { readFile, stat, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const arg = (name, fallback = null) => {
  const index = argv.indexOf(name)
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : fallback
}
const browserExecutable = arg('--browser-executable')
const browserName = arg('--browser-name', 'browser')
const targetId = arg('--target', 'fm1')
const resultPath = arg('--result', `responsive-${targetId}-${browserName}.json`)
if (!browserExecutable) throw new Error('Missing --browser-executable')
if (!['fm1', 'dx7'].includes(targetId)) throw new Error(`Unsupported --target ${targetId}`)

const target = targetId === 'fm1'
  ? { label: 'FM-1', audition: 'FM-1 bank audition', recorder: 'FM-1 audio recorder' }
  : { label: 'DX7', audition: 'DX7 audition and bulk transfer', recorder: 'DX7 audio recorder' }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png' }

async function startServer(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      let relative = normalize(decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html').replace(/^(\.\.[/\\])+/, '')
      let file = join(root, relative)
      try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html') } catch { file = join(root, 'index.html') }
      response.statusCode = 200
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
      response.setHeader('Cache-Control', 'no-store')
      response.end(await readFile(file))
    } catch (error) {
      response.statusCode = 500
      response.end(String(error))
    }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to resolve server address')
  return { server, url: `http://127.0.0.1:${address.port}/` }
}

async function pollJson(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  let error
  while (Date.now() < deadline) {
    try { const response = await fetch(url); if (response.ok) return await response.json() } catch (cause) { error = cause }
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${url}: ${error ?? 'unavailable'}`)
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.nextId = 1
    this.pending = new Map()
    this.opened = new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }) })
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)))
      else pending.resolve(message.result)
    })
  }
  async send(method, params = {}) {
    await this.opened
    const id = this.nextId++
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
    this.ws.send(JSON.stringify({ id, method, params }))
    return promise
  }
  close() { this.ws.close() }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Runtime evaluation failed')
  return result.result?.value
}
async function waitFor(cdp, expression, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${expression}`)
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'desktop-narrow', width: 1024, height: 768, mobile: false },
  { name: 'mobile-touch', width: 390, height: 844, mobile: true },
]

let server
let browser
let profile
let cdp
try {
  server = await startServer(fileURLToPath(new URL('../dist/', import.meta.url)))
  profile = await mkdtemp(join(tmpdir(), `fm1-target-${targetId}-`))
  const debugPort = 9800 + Math.floor(Math.random() * 300)
  browser = spawn(browserExecutable, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  const version = await pollJson(`http://127.0.0.1:${debugPort}/json/version`)
  const pages = await pollJson(`http://127.0.0.1:${debugPort}/json/list`)
  const page = pages.find((candidate) => candidate.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable browser page')
  cdp = new Cdp(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__targetSmokeErrors=[];window.__targetSmokeRejections=[];window.__targetSmokeMidiRequests=0;
    window.addEventListener('error',(event)=>window.__targetSmokeErrors.push(String(event.error?.stack||event.message||event.error)));
    window.addEventListener('unhandledrejection',(event)=>window.__targetSmokeRejections.push(String(event.reason?.stack||event.reason)));
    Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>{window.__targetSmokeMidiRequests+=1;return {inputs:new Map(),outputs:new Map(),sysexEnabled:true,onstatechange:null};}});
  ` })
  await cdp.send('Page.navigate', { url: server.url })
  await waitFor(cdp, `document.querySelector('.fm1-app') && document.querySelector('nav[aria-label="Workspace navigation"]')`, 20_000)

  const selected = await evaluate(cdp, `(() => {
    const targetId=${JSON.stringify(targetId)};
    const select=[...document.querySelectorAll('select')].find((candidate)=>candidate.querySelector('option[value="'+targetId+'"]'));
    if(!select)return false;
    select.value=targetId;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`)
  if (!selected) throw new Error(`Unable to select ${target.label} target in the UI`)
  await waitFor(cdp, `document.body.textContent.includes(${JSON.stringify(target.audition)}) && document.body.textContent.includes(${JSON.stringify(target.recorder)})`, 15_000)

  const matrix = []
  for (const viewport of viewports) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile, screenWidth: viewport.width, screenHeight: viewport.height })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 })
    await sleep(120)
    const voice = await evaluate(cdp, `(() => ({
      overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth,
      audition:document.body.textContent.includes(${JSON.stringify(target.audition)}),
      recorder:document.body.textContent.includes(${JSON.stringify(target.recorder)}),
      preview:document.body.textContent.includes('Virtual FM-1 preview'),
      workspaces:[...document.querySelectorAll('button')].filter((button)=>['Voice','Library','Effects','Sequencer'].includes(button.textContent?.trim()??'')).length,
      errors:window.__targetSmokeErrors,rejections:window.__targetSmokeRejections
    }))()`)
    if (!voice.audition || !voice.recorder || !voice.preview || voice.workspaces < 4) throw new Error(`${viewport.name}: ${target.label} voice workspace incomplete: ${JSON.stringify(voice)}`)
    if (voice.overflow > 3) throw new Error(`${viewport.name}: ${target.label} horizontal overflow ${voice.overflow}px`)
    if (voice.errors.length || voice.rejections.length) throw new Error(`${viewport.name}: browser errors ${JSON.stringify(voice)}`)

    const libraryClicked = await evaluate(cdp, `(() => {const button=[...document.querySelectorAll('button')].find((candidate)=>candidate.textContent?.trim()==='Library');if(!button)return false;button.click();return true})()`)
    if (!libraryClicked) throw new Error(`${viewport.name}: Library workspace missing`)
    await waitFor(cdp, `document.body.textContent.includes('Patch catalog') && document.body.textContent.includes('Local patch library')`, 8_000)
    const libraryOverflow = await evaluate(cdp, `Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth`)
    if (libraryOverflow > 3) throw new Error(`${viewport.name}: library horizontal overflow ${libraryOverflow}px`)

    const voiceClicked = await evaluate(cdp, `(() => {const button=[...document.querySelectorAll('button')].find((candidate)=>candidate.textContent?.trim()==='Voice');if(!button)return false;button.click();return true})()`)
    if (!voiceClicked) throw new Error(`${viewport.name}: Voice workspace missing`)
    await waitFor(cdp, `document.body.textContent.includes(${JSON.stringify(target.audition)})`, 8_000)
    if (viewport.mobile) {
      const toggled = await evaluate(cdp, `(() => {const button=[...document.querySelectorAll('button.fm1-section-toggle')].find((candidate)=>candidate.querySelector('.fm1-section-title')?.textContent?.trim()==='Virtual FM-1 preview');if(!button)return false;button.click();return true})()`)
      if (!toggled) throw new Error('mobile-touch: collapsible preview control missing')
      await sleep(80)
    }
    matrix.push({ viewport: viewport.name, width: viewport.width, height: viewport.height, voiceOverflow: voice.overflow, libraryOverflow })
  }
  const final = await evaluate(cdp, `({errors:window.__targetSmokeErrors,rejections:window.__targetSmokeRejections,midiRequests:window.__targetSmokeMidiRequests})`)
  if (final.errors.length || final.rejections.length) throw new Error(`Final browser errors: ${JSON.stringify(final)}`)
  const output = { ok: true, browserName, browserProduct: version.Browser ?? null, target: targetId, matrix, midiRequests: final.midiRequests }
  await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(output)}\n`)
} catch (error) {
  const output = { ok: false, browserName, target: targetId, error: error instanceof Error ? error.message : String(error) }
  await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.error(output.error)
  process.exitCode = 1
} finally {
  try { await cdp?.send('Browser.close') } catch {}
  cdp?.close()
  if (browser && browser.exitCode === null) browser.kill()
  if (server) await new Promise((resolve) => server.server.close(resolve))
  if (profile) await rm(profile, { recursive: true, force: true })
}
