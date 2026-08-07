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
function argument(name, fallback = null) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback }
const browserExecutable = argument('--browser-executable')
const browserName = argument('--browser-name', 'browser')
const resultPath = resolve(argument('--result', `reference-audio-${browserName}.json`))
if (!browserExecutable) { console.error('Missing --browser-executable'); process.exit(2) }

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.wasm', 'application/wasm'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon'],
])
async function existingFile(path) { try { return (await stat(path)).isFile() } catch { return false } }
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
    } catch (error) { response.writeHead(500); response.end(String(error)) }
  })
  await new Promise((resolvePromise, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolvePromise) })
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Unable to determine server port')
  return { server, port: address.port }
}
async function reservePort() {
  const server = createServer(); await new Promise((resolvePromise, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolvePromise) })
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Unable to reserve debugger port')
  const port = address.port; await new Promise((resolvePromise) => server.close(resolvePromise)); return port
}
async function waitForJson(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) { try { const response = await fetch(url); if (response.ok) return response.json() } catch {} await sleep(100) }
  throw new Error(`Timed out waiting for ${url}`)
}
class CdpConnection {
  constructor(url) { this.socket = new WebSocket(url); this.nextId = 0; this.pending = new Map() }
  async open() {
    await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP open timeout')), 10_000)
      this.socket.addEventListener('open', () => { clearTimeout(timer); resolvePromise() }, { once: true })
      this.socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP WebSocket error')) }, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)); if (!message.id) return
      const pending = this.pending.get(message.id); if (!pending) return
      this.pending.delete(message.id); if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`)); else pending.resolve(message.result)
    })
  }
  send(method, params = {}) { const id = ++this.nextId; return new Promise((resolvePromise, reject) => { this.pending.set(id, { method, resolve: resolvePromise, reject }); this.socket.send(JSON.stringify({ id, method, params })) }) }
  close() { this.socket.close() }
}
async function evaluate(cdp, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: false })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Browser evaluation failed')
  return result.result?.value
}
async function waitForExpression(cdp, expression, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) { if (await evaluate(cdp, expression)) return; await sleep(100) }
  throw new Error(`Timed out waiting for condition: ${expression}`)
}

let browserProcess = null
let staticServer = null
let profileDir = null
let cdp = null
try {
  if (!(await existingFile(resolve(distRoot, 'index.html')))) throw new Error('dist/index.html missing')
  const serverData = await startServer(); staticServer = serverData.server
  const pageUrl = `http://127.0.0.1:${serverData.port}/`; const debuggerPort = await reservePort(); profileDir = await mkdtemp(resolve(tmpdir(), 'fm1-reference-audio-'))
  browserProcess = spawn(browserExecutable, [`--remote-debugging-port=${debuggerPort}`, `--user-data-dir=${profileDir}`, '--headless=new', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', pageUrl], { stdio: ['ignore', 'pipe', 'pipe'] })
  const version = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/version`); const targets = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/list`)
  const target = targets.find((item) => item.type === 'page'); if (!target?.webSocketDebuggerUrl) throw new Error('No page CDP target')
  cdp = new CdpConnection(target.webSocketDebuggerUrl); await cdp.open(); await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Page.navigate', { url: pageUrl })
  await waitForExpression(cdp, `document.readyState === 'complete' && document.body.textContent.includes('Audio → FM reference')`)

  await evaluate(cdp, `(() => {
    window.__fm1ReferenceErrors = [];
    window.__fm1ReferenceRejections = [];
    window.__fm1ReferenceFetches = [];
    addEventListener('error', (event) => window.__fm1ReferenceErrors.push(String(event.error?.message ?? event.message ?? 'window error')));
    addEventListener('unhandledrejection', (event) => window.__fm1ReferenceRejections.push(String(event.reason?.message ?? event.reason ?? 'unhandled rejection')));
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => { window.__fm1ReferenceFetches.push(String(args[0])); return originalFetch(...args); };
    return true;
  })()`)
  const baselineFetches = await evaluate(cdp, `window.__fm1ReferenceFetches.length`)

  await evaluate(cdp, `(() => {
    const sampleRate = 48000;
    const seconds = 1.0;
    const frames = sampleRate * seconds;
    const bytes = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(bytes);
    const writeText = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
    writeText(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); writeText(8, 'WAVE'); writeText(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeText(36, 'data'); view.setUint32(40, frames * 2, true);
    for (let frame = 0; frame < frames; frame += 1) {
      const t = frame / sampleRate;
      const active = t >= 0.1 && t < 0.9;
      const sample = active ? Math.sin(2 * Math.PI * 440 * t) * 0.25 : 0;
      view.setInt16(44 + frame * 2, Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), true);
    }
    const input = document.querySelector('input[type=file][accept*=".wav"]');
    if (!input) throw new Error('Reference audio file input not found');
    const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'reference-a4.wav', { type: 'audio/wav' })); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)

  await waitForExpression(cdp, `document.body.textContent.includes('reference-a4.wav') && document.body.textContent.includes('prepared mono region')`, 20_000)
  await waitForExpression(cdp, `document.body.textContent.includes('440.') || document.body.textContent.includes('441.') || document.body.textContent.includes('439.')`, 10_000)
  const detectedPitchText = await evaluate(cdp, `(() => [...document.querySelectorAll('span')].map((node) => node.textContent ?? '').find((text) => text.includes('detected pitch')) ?? '')()`)

  const manualSet = await evaluate(cdp, `(() => {
    const input = [...document.querySelectorAll('input[type=number]')].find((candidate) => candidate.placeholder?.includes('Detected') || candidate.parentElement?.textContent?.includes('Manual pitch override'));
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(input, '330'); input.dispatchEvent(new Event('input', { bubbles: true })); return true;
  })()`)
  if (!manualSet) throw new Error('Manual pitch input not found')
  await waitForExpression(cdp, `document.body.textContent.includes('330.00 Hz')`, 10_000)

  const regionSet = await evaluate(cdp, `(() => {
    const ranges = [...document.querySelectorAll('input[type=range]')];
    const start = ranges.find((input) => input.parentElement?.textContent?.includes('Region start'));
    const end = ranges.find((input) => input.parentElement?.textContent?.includes('Region end'));
    if (!start || !end) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(start, '0.2'); start.dispatchEvent(new Event('input', { bubbles: true }));
    setter?.call(end, '0.8'); end.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`)
  if (!regionSet) throw new Error('Reference region controls not found')
  await waitForExpression(cdp, `document.body.textContent.includes('0.600 s')`, 10_000)

  const diagnosticsJson = await evaluate(cdp, `JSON.stringify({
    errors: window.__fm1ReferenceErrors,
    rejections: window.__fm1ReferenceRejections,
    fetchesAfter: window.__fm1ReferenceFetches.length,
    privacy: document.body.textContent.includes('Local browser only') && document.body.textContent.includes('no audio is transmitted'),
    shaVisible: document.body.textContent.includes('SHA-256'),
    manualPitchVisible: document.body.textContent.includes('330.00 Hz'),
    regionVisible: document.body.textContent.includes('0.600 s')
  })`)
  const diagnostics = JSON.parse(diagnosticsJson ?? '{}')
  if (diagnostics.errors.length || diagnostics.rejections.length) throw new Error(`Browser errors: ${JSON.stringify(diagnostics)}`)
  if (!diagnostics.privacy || !diagnostics.shaVisible || !diagnostics.manualPitchVisible || !diagnostics.regionVisible) throw new Error(`Reference UI acceptance missing expected evidence: ${JSON.stringify(diagnostics)}`)
  if (diagnostics.fetchesAfter !== baselineFetches) throw new Error(`Reference audio caused network fetches: ${baselineFetches} -> ${diagnostics.fetchesAfter}`)

  const result = { ok: true, browserName, browserProduct: version.Browser ?? null, detectedPitchText, baselineFetches, ...diagnostics }
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8'); process.stdout.write(`${JSON.stringify(result)}\n`)
} catch (error) {
  const result = { ok: false, browserName, error: error instanceof Error ? error.message : String(error) }
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8'); console.error(result.error); process.exitCode = 1
} finally {
  try { await cdp?.send('Browser.close') } catch {}
  cdp?.close(); if (browserProcess && browserProcess.exitCode === null) browserProcess.kill()
  if (staticServer) await new Promise((resolvePromise) => staticServer.close(resolvePromise))
  if (profileDir) await rm(profileDir, { recursive: true, force: true })
}
