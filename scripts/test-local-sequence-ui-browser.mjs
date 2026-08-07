#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = resolve(repoRoot, 'dist')
const args = process.argv.slice(2)

function argument(name, fallback = null) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const browserExecutable = argument('--browser-executable')
const browserName = argument('--browser-name', 'browser')
const resultPath = resolve(argument('--result', `local-sequence-ui-${browserName}.json`))

if (!browserExecutable) {
  console.error('Usage: node scripts/test-local-sequence-ui-browser.mjs --browser-executable <path> [--browser-name chrome|edge] [--result path]')
  process.exit(2)
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
])

function safeDistPath(urlPath) {
  const relative = decodeURIComponent(urlPath).replace(/^\/+/, '')
  const file = resolve(distRoot, relative || 'index.html')
  return file === distRoot || file.startsWith(distRoot + sep) ? file : null
}

async function existingFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      let file = safeDistPath(url.pathname)
      if (!file || !(await existingFile(file))) file = resolve(distRoot, 'index.html')
      const type = mimeTypes.get(extname(file).toLowerCase()) ?? 'application/octet-stream'
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
      createReadStream(file).on('error', () => response.end()).pipe(response)
    } catch (error) {
      response.writeHead(500)
      response.end(String(error))
    }
  })
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolvePromise)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to determine UI server port')
  return { server, port: address.port }
}

async function reservePort() {
  const server = createServer()
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolvePromise)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to reserve debugger port')
  const port = address.port
  await new Promise((resolvePromise) => server.close(resolvePromise))
  return port
}

async function waitForJson(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
    } catch (error) {
      lastError = error
    }
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError ?? 'no response')}`)
}

class CdpConnection {
  constructor(url) {
    this.socket = new WebSocket(url)
    this.nextId = 0
    this.pending = new Map()
  }

  async open() {
    await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket open timeout')), 10_000)
      this.socket.addEventListener('open', () => { clearTimeout(timer); resolvePromise() }, { once: true })
      this.socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP WebSocket error')) }, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`))
      else pending.resolve(message.result)
    })
  }

  send(method, params = {}) {
    const id = ++this.nextId
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { method, resolve: resolvePromise, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.socket.close()
  }
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Browser evaluation failed')
  }
  return result.result?.value
}

async function waitForExpression(cdp, expression, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`)
}

async function clickButton(cdp, text) {
  const clicked = await evaluate(cdp, `(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim().includes(${JSON.stringify(text)}));
    if (!button || button.disabled) return false;
    button.click();
    return true;
  })()`)
  if (!clicked) throw new Error(`Unable to click enabled button containing ${text}`)
}

async function samplePeak(cdp, durationMs) {
  return evaluate(cdp, `(async () => {
    const analyser = window.__fm1SequenceAnalyser;
    if (!analyser) throw new Error('Local sequence analyser was not installed');
    const data = new Float32Array(analyser.fftSize);
    let maximum = 0;
    const deadline = performance.now() + ${durationMs};
    while (performance.now() < deadline) {
      analyser.getFloatTimeDomainData(data);
      for (const sample of data) {
        if (!Number.isFinite(sample)) throw new Error('Non-finite local sequence sample');
        maximum = Math.max(maximum, Math.abs(sample));
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return maximum;
  })()`, true)
}

let browserProcess = null
let staticServer = null
let profileDir = null
let cdp = null

try {
  if (!(await existingFile(resolve(distRoot, 'index.html')))) throw new Error('dist/index.html is missing; run the production build first')
  const serverData = await startServer()
  staticServer = serverData.server
  const pageUrl = `http://127.0.0.1:${serverData.port}/`
  const debuggerPort = await reservePort()
  profileDir = await mkdtemp(resolve(tmpdir(), 'fm1-local-sequence-ui-'))

  browserProcess = spawn(browserExecutable, [
    `--remote-debugging-port=${debuggerPort}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    pageUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'] })

  const version = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/version`)
  const targets = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/list`)
  const target = targets.find((item) => item.type === 'page')
  if (!target?.webSocketDebuggerUrl) throw new Error('Browser did not expose a page CDP target')
  cdp = new CdpConnection(target.webSocketDebuggerUrl)
  await cdp.open()
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate', { url: pageUrl })
  await waitForExpression(cdp, `document.readyState === 'complete' && document.body.textContent.includes('Voice')`)

  await evaluate(cdp, `(() => {
    window.__fm1UiErrors = [];
    window.__fm1UiRejections = [];
    addEventListener('error', (event) => window.__fm1UiErrors.push(String(event.error?.message ?? event.message ?? 'window error')));
    addEventListener('unhandledrejection', (event) => window.__fm1UiRejections.push(String(event.reason?.message ?? event.reason ?? 'unhandled rejection')));
    const Original = window.AudioWorkletNode;
    window.__fm1TrackedWorkletNodes = [];
    window.AudioWorkletNode = new Proxy(Original, {
      construct(target, args, newTarget) {
        const node = Reflect.construct(target, args, newTarget);
        window.__fm1TrackedWorkletNodes.push(node);
        return node;
      }
    });
  })()`)

  await clickButton(cdp, 'Sequencer')
  await waitForExpression(cdp, `document.body.textContent.includes('Local sequence audio')`)
  await clickButton(cdp, 'Enable local audio')
  await waitForExpression(cdp, `document.body.textContent.includes('LOCAL AUDIO READY')`, 15_000)

  const workletNodeCount = await evaluate(cdp, `window.__fm1TrackedWorkletNodes.length`)
  if (workletNodeCount !== 1) throw new Error(`Expected exactly one UI-created worklet node, got ${workletNodeCount}`)
  await evaluate(cdp, `(() => {
    const node = window.__fm1TrackedWorkletNodes[0];
    const context = node.context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    const gain = context.createGain();
    gain.gain.value = 0;
    node.connect(analyser);
    analyser.connect(gain);
    gain.connect(context.destination);
    window.__fm1SequenceAnalyser = analyser;
    window.__fm1SequenceMonitorGain = gain;
  })()`)

  await clickButton(cdp, 'Play local')
  await waitForExpression(cdp, `document.body.textContent.includes('Local sequence loop started') || document.body.textContent.includes('Local playhead')`)
  const activePeak = await samplePeak(cdp, 1_200)
  if (!(activePeak > 1e-6)) throw new Error(`Mounted local sequencer produced no measurable PCM: ${activePeak}`)

  await clickButton(cdp, 'Stop local')
  await waitForExpression(cdp, `document.body.textContent.includes('all local notes released')`)
  await sleep(250)
  const silencePeak = await samplePeak(cdp, 250)
  if (silencePeak >= 1e-4) throw new Error(`Mounted local sequencer did not return to silence: ${silencePeak}`)

  const diagnostics = await evaluate(cdp, `({
    errors: window.__fm1UiErrors,
    rejections: window.__fm1UiRejections,
    ready: document.body.textContent.includes('LOCAL AUDIO READY'),
    playheadVisible: document.body.textContent.includes('Local playhead'),
    hardwareTextPresent: document.body.textContent.includes('MIDI output'),
  })`)
  if (diagnostics.errors.length > 0 || diagnostics.rejections.length > 0) {
    throw new Error(`UI browser errors: ${JSON.stringify(diagnostics)}`)
  }

  const result = {
    ok: true,
    browserName,
    browserProduct: version.Browser ?? null,
    browserUserAgent: version['User-Agent'] ?? null,
    workletNodeCount,
    activePeak,
    silencePeak,
    ...diagnostics,
  }
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(result)}\n`)
} catch (error) {
  const result = {
    ok: false,
    browserName,
    error: error instanceof Error ? error.message : String(error),
  }
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.error(result.error)
  process.exitCode = 1
} finally {
  try { await cdp?.send('Browser.close') } catch {}
  cdp?.close()
  if (browserProcess && browserProcess.exitCode === null) browserProcess.kill()
  if (staticServer) await new Promise((resolvePromise) => staticServer.close(resolvePromise))
  if (profileDir) await rm(profileDir, { recursive: true, force: true })
}
