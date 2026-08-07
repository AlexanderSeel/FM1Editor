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
const resultPath = resolve(argument('--result', `imported-bank-audio-${browserName}.json`))
if (!browserExecutable) {
  console.error('Usage: node scripts/test-imported-bank-virtual-audio-browser.mjs --browser-executable <path> [--browser-name chrome|edge] [--result path]')
  process.exit(2)
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.wasm', 'application/wasm'],
  ['.syx', 'application/octet-stream'], ['.zip', 'application/zip'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon'],
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
      response.writeHead(200, { 'content-type': mimeTypes.get(extname(file).toLowerCase()) ?? 'application/octet-stream', 'cache-control': 'no-store' })
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
  if (!address || typeof address === 'string') throw new Error('Unable to determine test server port')
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
    } catch (error) { lastError = error }
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
  // Do not ask CDP to recursively serialize arbitrary browser objects. Primitive
  // values are available directly even with returnByValue=false; structured
  // diagnostics are explicitly JSON-stringified at the call site below.
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: false })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Browser evaluation failed')
  return result.result?.value
}

async function waitForExpression(cdp, expression, timeoutMs = 20_000) {
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

async function setInput(cdp, ariaLabel, value) {
  const changed = await evaluate(cdp, `(() => {
    const input = document.querySelector('input[aria-label=${JSON.stringify(ariaLabel)}]');
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`)
  if (!changed) throw new Error(`Unable to set input ${ariaLabel}`)
}

async function attachAnalyser(cdp, index, name) {
  await evaluate(cdp, `(() => {
    const node = window.__fm1ImportedBankNodes[${index}];
    if (!node) throw new Error('Missing tracked worklet node ${index}');
    const analyser = node.context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    const sink = node.context.createGain();
    sink.gain.value = 0;
    node.connect(analyser);
    analyser.connect(sink);
    sink.connect(node.context.destination);
    window[${JSON.stringify(name)}] = analyser;
    return true;
  })()`)
}

async function samplePeak(cdp, analyserName, durationMs) {
  return evaluate(cdp, `(async () => {
    const analyser = window[${JSON.stringify(analyserName)}];
    if (!analyser) throw new Error('Missing analyser ${analyserName}');
    const data = new Float32Array(analyser.fftSize);
    let maximum = 0;
    const deadline = performance.now() + ${durationMs};
    while (performance.now() < deadline) {
      analyser.getFloatTimeDomainData(data);
      for (const sample of data) {
        if (!Number.isFinite(sample)) throw new Error('Non-finite local PCM sample');
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
  if (!(await existingFile(resolve(distRoot, 'index.html')))) throw new Error('dist/index.html is missing; run production build first')
  const serverData = await startServer()
  staticServer = serverData.server
  const pageUrl = `http://127.0.0.1:${serverData.port}/`
  const debuggerPort = await reservePort()
  profileDir = await mkdtemp(resolve(tmpdir(), 'fm1-imported-bank-audio-'))

  browserProcess = spawn(browserExecutable, [
    `--remote-debugging-port=${debuggerPort}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
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
  await waitForExpression(cdp, `document.readyState === 'complete' && Boolean(document.querySelector('.fm1-lcd-title'))`)

  await evaluate(cdp, `(() => {
    window.__fm1ImportedBankErrors = [];
    window.__fm1ImportedBankRejections = [];
    window.__fm1ImportedBankMidiRequests = 0;
    addEventListener('error', (event) => window.__fm1ImportedBankErrors.push(String(event.error?.message ?? event.message ?? 'window error')));
    addEventListener('unhandledrejection', (event) => window.__fm1ImportedBankRejections.push(String(event.reason?.message ?? event.reason ?? 'unhandled rejection')));
    const OriginalNode = window.AudioWorkletNode;
    window.__fm1ImportedBankNodes = [];
    window.AudioWorkletNode = new Proxy(OriginalNode, {
      construct(target, args, newTarget) {
        const node = Reflect.construct(target, args, newTarget);
        window.__fm1ImportedBankNodes.push(node);
        return node;
      }
    });
    if (navigator.requestMIDIAccess) {
      const original = navigator.requestMIDIAccess.bind(navigator);
      Object.defineProperty(navigator, 'requestMIDIAccess', {
        configurable: true,
        value: (...args) => { window.__fm1ImportedBankMidiRequests += 1; return original(...args); }
      });
    }
    return true;
  })()`)

  // Reproduce the reported flow: Library -> real bank -> Voice -> local audio.
  await clickButton(cdp, 'Library')
  await waitForExpression(cdp, `document.body.textContent.includes('Merged SysEx library browser')`, 25_000)
  await setInput(cdp, 'Search the patch catalog', 'ROM1A')
  await waitForExpression(cdp, `[...document.querySelectorAll('article')].some((article) => article.textContent?.includes('ROM1A') && [...article.querySelectorAll('button')].some((button) => button.textContent?.includes('Load bank') && !button.disabled))`, 25_000)
  const loaded = await evaluate(cdp, `(() => {
    const article = [...document.querySelectorAll('article')].find((candidate) => candidate.textContent?.includes('ROM1A'));
    const button = article && [...article.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes('Load bank') && !candidate.disabled);
    if (!button) return false; button.click(); return true;
  })()`)
  if (!loaded) throw new Error('Could not load ROM1A bank')
  await waitForExpression(cdp, `document.body.textContent.includes('Loaded') && document.body.textContent.includes('ROM1A')`, 30_000)

  await clickButton(cdp, 'Voice')
  await waitForExpression(cdp, `document.querySelector('.fm1-lcd-title')?.textContent?.includes('BRASS 1')`, 10_000)
  const loadedVoiceTitle = await evaluate(cdp, `document.querySelector('.fm1-lcd-title')?.textContent?.trim() ?? ''`)

  await clickButton(cdp, 'Enable local audio')
  await waitForExpression(cdp, `document.body.textContent.includes('LOCAL AUDIO READY') && window.__fm1ImportedBankNodes.length >= 1`, 20_000)
  await attachAnalyser(cdp, 0, '__fm1LoadedVoiceAnalyser')
  await evaluate(cdp, `(() => {
    const button = document.querySelector('button[aria-label^="Focus computer keyboard piano input"]');
    if (!button || button.disabled) throw new Error('Local virtual piano focus button unavailable');
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }));
    return true;
  })()`)
  const loadedVoicePeak = await samplePeak(cdp, '__fm1LoadedVoiceAnalyser', 650)
  await evaluate(cdp, `(() => {
    const button = document.querySelector('button[aria-label^="Focus computer keyboard piano input"]');
    button?.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', bubbles: true }));
    return true;
  })()`)
  if (!(loadedVoicePeak > 1e-5)) throw new Error(`Loaded ROM1A BRASS 1 produced no measurable local PCM: ${loadedVoicePeak}`)
  await clickButton(cdp, 'Disable local audio')

  // Catalog audition must start audio before asynchronous ZIP voice resolution.
  await clickButton(cdp, 'Library')
  await setInput(cdp, 'Search the patch catalog', 'ROM1A')
  await waitForExpression(cdp, `[...document.querySelectorAll('article')].some((article) => article.textContent?.includes('ROM1A') && [...article.querySelectorAll('button')].some((button) => button.textContent?.includes('Audition first voice') && !button.disabled))`, 20_000)
  const catalogAuditionClicked = await evaluate(cdp, `(() => {
    const article = [...document.querySelectorAll('article')].find((candidate) => candidate.textContent?.includes('ROM1A'));
    const button = article && [...article.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes('Audition first voice') && !candidate.disabled);
    if (!button) return false; button.click(); return true;
  })()`)
  if (!catalogAuditionClicked) throw new Error('Could not start catalog audition')
  await waitForExpression(cdp, `window.__fm1ImportedBankNodes.length >= 2`, 15_000)
  await attachAnalyser(cdp, 1, '__fm1CatalogAuditionAnalyser')
  await waitForExpression(cdp, `document.body.textContent.includes('Auditioning BRASS 1') || document.body.textContent.includes('Local audition: BRASS 1')`, 15_000)
  const catalogAuditionPeak = await samplePeak(cdp, '__fm1CatalogAuditionAnalyser', 600)
  if (!(catalogAuditionPeak > 1e-5)) throw new Error(`Catalog audition produced no measurable PCM: ${catalogAuditionPeak}`)
  await sleep(2_100)

  // Saved library audition uses the same repaired semantic voice without loading hardware.
  await waitForExpression(cdp, `[...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Audition local') && !button.disabled)`, 10_000)
  await clickButton(cdp, 'Audition local')
  await waitForExpression(cdp, `window.__fm1ImportedBankNodes.length >= 3`, 15_000)
  await attachAnalyser(cdp, 2, '__fm1SavedAuditionAnalyser')
  await waitForExpression(cdp, `document.body.textContent.includes('Auditioning') || document.body.textContent.includes('Local audition:')`, 15_000)
  const savedAuditionPeak = await samplePeak(cdp, '__fm1SavedAuditionAnalyser', 600)
  if (!(savedAuditionPeak > 1e-5)) throw new Error(`Saved-library audition produced no measurable PCM: ${savedAuditionPeak}`)

  await clickButton(cdp, 'Voice')
  await waitForExpression(cdp, `document.querySelector('.fm1-lcd-title')?.textContent?.trim() === ${JSON.stringify(loadedVoiceTitle)}`)
  const diagnosticsJson = await evaluate(cdp, `JSON.stringify({
    errors: window.__fm1ImportedBankErrors,
    rejections: window.__fm1ImportedBankRejections,
    midiRequests: window.__fm1ImportedBankMidiRequests,
    workletNodeCount: window.__fm1ImportedBankNodes.length,
    finalVoiceTitle: document.querySelector('.fm1-lcd-title')?.textContent?.trim() ?? '',
  })`)
  const diagnostics = JSON.parse(diagnosticsJson ?? '{}')
  if (diagnostics.errors.length || diagnostics.rejections.length) throw new Error(`Browser errors: ${JSON.stringify(diagnostics)}`)
  if (diagnostics.midiRequests !== 0) throw new Error(`Local audio path requested Web MIDI ${diagnostics.midiRequests} time(s)`)

  const result = {
    ok: true,
    browserName,
    browserProduct: version.Browser ?? null,
    loadedVoiceTitle,
    loadedVoicePeak,
    catalogAuditionPeak,
    savedAuditionPeak,
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
