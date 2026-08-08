import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { writeFile } from 'node:fs/promises'

const args = process.argv.slice(2)
const valueOf = (flag, fallback = null) => {
  const index = args.indexOf(flag)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}
const browserExecutable = valueOf('--browser-executable')
const browserName = valueOf('--browser-name', 'browser')
const resultPath = valueOf('--result', `fm1-responsive-${browserName}.json`)
if (!browserExecutable) throw new Error('Missing --browser-executable')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png' }

async function startStaticServer(root) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
      relative = normalize(relative).replace(/^(\.\.[/\\])+/, '')
      let file = join(root, relative)
      try {
        const info = await stat(file)
        if (info.isDirectory()) file = join(file, 'index.html')
      } catch {
        file = join(root, 'index.html')
      }
      const body = await readFile(file)
      response.statusCode = 200
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
      response.setHeader('Cache-Control', 'no-store')
      response.end(body)
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
  if (!address || typeof address === 'string') throw new Error('Unable to resolve static server port')
  return { server, url: `http://127.0.0.1:${address.port}/` }
}

async function pollJson(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
    } catch (error) { lastError = error }
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError ?? 'unavailable'}`)
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url)
    this.nextId = 1
    this.pending = new Map()
    this.events = new Map()
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)))
        else pending.resolve(message.result)
        return
      }
      const listeners = this.events.get(message.method) ?? []
      for (const listener of listeners) listener(message.params)
    })
  }
  async send(method, params = {}) {
    await this.opened
    const id = this.nextId++
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
    this.socket.send(JSON.stringify({ id, method, params }))
    return promise
  }
  on(method, listener) {
    const listeners = this.events.get(method) ?? []
    listeners.push(listener)
    this.events.set(method, listeners)
  }
  close() { this.socket.close() }
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Runtime evaluation failed')
  return result.result?.value
}

async function waitFor(cdp, expression, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for expression: ${expression}`)
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'desktop-narrow', width: 1024, height: 768, mobile: false },
  { name: 'mobile-touch', width: 390, height: 844, mobile: true },
]

let staticServer
let browserProcess
let profileDir
let cdp
try {
  staticServer = await startStaticServer(new URL('../dist/', import.meta.url).pathname)
  profileDir = await mkdtemp(join(tmpdir(), 'fm1-responsive-'))
  const debugPort = 9400 + Math.floor(Math.random() * 400)
  browserProcess = spawn(browserExecutable, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  const version = await pollJson(`http://127.0.0.1:${debugPort}/json/version`)
  const pages = await pollJson(`http://127.0.0.1:${debugPort}/json/list`)
  const page = pages.find((candidate) => candidate.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable page target')
  cdp = new Cdp(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Log.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__fm1SmokeErrors=[];window.__fm1SmokeRejections=[];window.__fm1SmokeMidiRequests=0;
    window.addEventListener('error',(event)=>window.__fm1SmokeErrors.push(String(event.error?.stack||event.message||event.error)));
    window.addEventListener('unhandledrejection',(event)=>window.__fm1SmokeRejections.push(String(event.reason?.stack||event.reason)));
    Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>{window.__fm1SmokeMidiRequests+=1;return {inputs:new Map(),outputs:new Map(),sysexEnabled:true,onstatechange:null};}});
  ` })
  await cdp.send('Page.navigate', { url: staticServer.url })
  await waitFor(cdp, `document.body?.textContent?.includes('FM1 Editor')`, 20_000)

  const targetClicked = await evaluate(cdp, `(() => {
    const buttons=[...document.querySelectorAll('button')];
    const target=buttons.find((button)=>button.textContent?.trim()==='FM-1') ?? buttons.find((button)=>button.textContent?.trim().startsWith('FM-1 '));
    if(target){target.click();return true} return false;
  })()`)
  if (targetClicked) await sleep(100)
  await waitFor(cdp, `document.body.textContent.includes('Virtual FM-1 preview') && document.body.textContent.includes('FM-1 bank audition')`, 15_000)

  const results = []
  for (const viewport of viewports) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile, screenWidth: viewport.width, screenHeight: viewport.height })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 })
    await sleep(120)

    const state = await evaluate(cdp, `(() => {
      const root=document.documentElement;
      const body=document.body;
      const text=body.textContent??'';
      const overflow=Math.max(root.scrollWidth,body.scrollWidth)-window.innerWidth;
      const workspaceButtons=[...document.querySelectorAll('button')].filter((button)=>['Voice','Library','Effects','Sequencer'].includes(button.textContent?.trim()??''));
      return {
        width:window.innerWidth,height:window.innerHeight,overflow,
        hasPreview:text.includes('Virtual FM-1 preview'),
        hasBank:text.includes('FM-1 bank audition'),
        hasRecorder:text.includes('FM-1 audio recorder'),
        workspaceCount:workspaceButtons.length,
        errors:window.__fm1SmokeErrors,rejections:window.__fm1SmokeRejections,midiRequests:window.__fm1SmokeMidiRequests,
      };
    })()`)
    if (!state.hasPreview || !state.hasBank || !state.hasRecorder) throw new Error(`${viewport.name}: required FM-1 workspace sections missing: ${JSON.stringify(state)}`)
    if (state.workspaceCount < 4) throw new Error(`${viewport.name}: workspace navigation incomplete`)
    if (state.overflow > 3) throw new Error(`${viewport.name}: horizontal overflow ${state.overflow}px`)
    if (state.errors.length || state.rejections.length) throw new Error(`${viewport.name}: browser errors ${JSON.stringify(state)}`)

    const effectsClicked = await evaluate(cdp, `(() => {const b=[...document.querySelectorAll('button')].find((x)=>x.textContent?.trim()==='Effects');if(!b)return false;b.click();return true})()`)
    if (!effectsClicked) throw new Error(`${viewport.name}: Effects workspace unavailable`)
    await waitFor(cdp, `document.body.textContent.includes('Filter and effects controls')`, 8_000)
    const effectsState = await evaluate(cdp, `(() => ({overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth,hasFilter:[...document.querySelectorAll('h4')].some((n)=>n.textContent?.trim()==='Filter'),errors:window.__fm1SmokeErrors,rejections:window.__fm1SmokeRejections}))()`)
    if (!effectsState.hasFilter || effectsState.overflow > 3 || effectsState.errors.length || effectsState.rejections.length) throw new Error(`${viewport.name}: effects responsive smoke failed: ${JSON.stringify(effectsState)}`)

    const voiceClicked = await evaluate(cdp, `(() => {const b=[...document.querySelectorAll('button')].find((x)=>x.textContent?.trim()==='Voice');if(!b)return false;b.click();return true})()`)
    if (!voiceClicked) throw new Error(`${viewport.name}: Voice workspace unavailable`)
    await waitFor(cdp, `document.body.textContent.includes('Virtual FM-1 preview')`, 8_000)
    if (viewport.mobile) {
      const toggled = await evaluate(cdp, `(() => {const b=[...document.querySelectorAll('button.fm1-section-toggle')].find((x)=>x.querySelector('.fm1-section-title')?.textContent?.trim()==='Virtual FM-1 preview');if(!b)return false;b.click();return true})()`)
      if (!toggled) throw new Error('mobile-touch: preview collapsible could not be toggled')
      await sleep(80)
    }
    results.push({ viewport: viewport.name, ...state, effectsOverflow: effectsState.overflow })
  }

  const finalState = await evaluate(cdp, `({errors:window.__fm1SmokeErrors,rejections:window.__fm1SmokeRejections,midiRequests:window.__fm1SmokeMidiRequests})`)
  if (finalState.errors.length || finalState.rejections.length) throw new Error(`Final browser errors: ${JSON.stringify(finalState)}`)
  const output = { ok: true, browserName, browserProduct: version.Browser ?? null, targetControlClicked: targetClicked, viewports: results, midiRequests: finalState.midiRequests }
  await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(output)}\n`)
} catch (error) {
  const output = { ok: false, browserName, error: error instanceof Error ? error.message : String(error) }
  await writeFile(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.error(output.error)
  process.exitCode = 1
} finally {
  try { await cdp?.send('Browser.close') } catch {}
  cdp?.close()
  if (browserProcess && browserProcess.exitCode === null) browserProcess.kill()
  if (staticServer) await new Promise((resolve) => staticServer.server.close(resolve))
  if (profileDir) await rm(profileDir, { recursive: true, force: true })
}
