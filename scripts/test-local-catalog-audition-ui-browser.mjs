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
const resultPath = resolve(argument('--result', `local-catalog-audition-${browserName}.json`))

if (!browserExecutable) {
  console.error('Usage: node scripts/test-local-catalog-audition-ui-browser.mjs --browser-executable <path> [--browser-name chrome|edge] [--result path]')
  process.exit(2)
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.syx', 'application/octet-stream'],
  ['.zip', 'application/zip'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
])

async function existingFile(path) {
  try { return (await stat(path)).isFile() } catch { return false }
}

function safeDistPath(urlPath) {
  const relative = decodeURIComponent(urlPath).replace(/^\/+/, '')
  const file = resolve(distRoot, relative || 'index.html')
  return file === distRoot || file.startsWith(distRoot + sep) ? file : null
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
  if (!address || typeof address === 'string') throw new Error('Unable to determine catalog audition server port')
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

  close() { this.socket.close() }
}

async function evaluate(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Browser evaluation failed')
  }
  return result.result?.value
}

async function waitForExpression(cdp, expression, timeoutMs = 15_000) {
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
    const analyser = window.__fm1CatalogAnalyser;
    if (!analyser) throw new Error('Catalog audition analyser was not installed');
    const data = new Float32Array(analyser.fftSize);
    let maximum = 0;
    const deadline = performance.now() + ${durationMs};
    while (performance.now() < deadline) {
      analyser.getFloatTimeDomainData(data);
      for (const sample of data) {
        if (!Number.isFinite(sample)) throw new Error('Non-finite catalog audition sample');
        maximum = Math.max(maximum, Math.abs(sample));
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
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
  profileDir = await mkdtemp(resolve(tmpdir(), 'fm1-local-catalog-audition-'))

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
  await waitForExpression(cdp, `document.readyState === 'complete' && document.querySelector('.fm1-lcd-title')`)

  const editorTitleBefore = await evaluate(cdp, `document.querySelector('.fm1-lcd-title')?.textContent?.trim() ?? ''`)
  if (!editorTitleBefore) throw new Error('Unable to read initial editor voice title')

  await evaluate(cdp, `(() => {
    window.__fm1CatalogErrors = [];
    window.__fm1CatalogRejections = [];
    window.__fm1MidiRequests = 0;
    addEventListener('error', (event) => window.__fm1CatalogErrors.push(String(event.error?.message ?? event.message ?? 'window error')));
    addEventListener('unhandledrejection', (event) => window.__fm1CatalogRejections.push(String(event.reason?.message ?? event.reason ?? 'unhandled rejection')));
    const OriginalNode = window.AudioWorkletNode;
    window.__fm1CatalogWorkletNodes = [];
    window.AudioWorkletNode = new Proxy(OriginalNode, {
      construct(target, args, newTarget) {
        const node = Reflect.construct(target, args, newTarget);
        window.__fm1CatalogWorkletNodes.push(node);
        return node;
      }
    });
    if (navigator.requestMIDIAccess) {
      const originalMidi = navigator.requestMIDIAccess.bind(navigator);
      Object.defineProperty(navigator, 'requestMIDIAccess', {
        configurable: true,
        value: (...args) => {
          window.__fm1MidiRequests += 1;
          return originalMidi(...args);
        }
      });
    }
  })()`)

  await clickButton(cdp, 'Library')
  await waitForExpression(cdp, `document.body.textContent.includes('Merged SysEx library browser')`, 20_000)
  await waitForExpression(cdp, `[...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Audition selected') && !button.disabled)`, 30_000)
  await waitForExpression(cdp, `[...document.querySelectorAll('select')].some((select) => select.getAttribute('aria-label')?.startsWith('Voice to audition from') && select.options.length > 1)`, 30_000)

  const selectedVoice = await evaluate(cdp, `(() => {
    const select = [...document.querySelectorAll('select')].find((candidate) => candidate.getAttribute('aria-label')?.startsWith('Voice to audition from') && candidate.options.length > 1);
    if (!select) return null;
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return { label: select.options[1].textContent, value: select.value };
  })()`)
  if (!selectedVoice) throw new Error('Unable to select catalog voice slot 2')

  await clickButton(cdp, 'Audition selected')
  await waitForExpression(cdp, `window.__fm1CatalogWorkletNodes.length === 1`, 15_000)
  await evaluate(cdp, `(() => {
    const node = window.__fm1CatalogWorkletNodes[0];
    const context = node.context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    const gain = context.createGain();
    gain.gain.value = 0;
    node.connect(analyser);
    analyser.connect(gain);
    gain.connect(context.destination);
    window.__fm1CatalogAnalyser = analyser;
    window.__fm1CatalogMonitorGain = gain;
  })()`)

  const activePeak = await samplePeak(cdp, 650)
  if (!(activePeak > 1e-6)) throw new Error(`Catalog audition produced no measurable PCM: ${activePeak}`)
  await waitForExpression(cdp, `document.body.textContent.includes('(slot 2)')`, 8_000)
  await sleep(2_000)
  const silencePeak = await samplePeak(cdp, 250)
  if (silencePeak >= 1e-4) throw new Error(`Catalog audition did not auto-return to silence: ${silencePeak}`)

  await clickButton(cdp, 'Voice')
  await waitForExpression(cdp, `document.querySelector('.fm1-lcd-title')?.textContent?.trim() === ${JSON.stringify(editorTitleBefore)}`)
  const editorTitleAfter = await evaluate(cdp, `document.querySelector('.fm1-lcd-title')?.textContent?.trim() ?? ''`)
  const diagnostics = await evaluate(cdp, `({
    errors: window.__fm1CatalogErrors,
    rejections: window.__fm1CatalogRejections,
    midiRequests: window.__fm1MidiRequests,
    workletNodeCount: window.__fm1CatalogWorkletNodes.length,
  })`)

  if (diagnostics.errors.length > 0 || diagnostics.rejections.length > 0) throw new Error(`Catalog audition UI errors: ${JSON.stringify(diagnostics)}`)
  if (diagnostics.midiRequests !== 0) throw new Error(`Catalog local audition requested Web MIDI ${diagnostics.midiRequests} time(s)`)
  if (editorTitleAfter !== editorTitleBefore) throw new Error('Catalog audition changed the editor voice title')

  const result = {
    ok: true,
    browserName,
    browserProduct: version.Browser ?? null,
    browserUserAgent: version['User-Agent'] ?? null,
    selectedVoice,
    activePeak,
    silencePeak,
    editorTitleBefore,
    editorTitleAfter,
    ...diagnostics,
  }
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(result)}\n`)
} catch (error) {
  const result = { ok: false, browserName, error: error instanceof Error ? error.message : String(error) }
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
