#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)

function argument(name, fallback = null) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const browserExecutable = argument('--browser-executable')
const browserName = argument('--browser-name', 'browser')
const soakSeconds = Number.parseInt(argument('--soak-seconds', '20'), 10)
const resultPath = resolve(argument('--result', `msfa-worklet-${browserName}.json`))

if (!browserExecutable) {
  console.error('Usage: node scripts/test-msfa-audioworklet-browser.mjs --browser-executable <path> [--browser-name chrome|edge] [--soak-seconds N] [--result path]')
  process.exit(2)
}
if (!Number.isFinite(soakSeconds) || soakSeconds < 5 || soakSeconds > 900) {
  console.error('--soak-seconds must be an integer from 5 through 900')
  process.exit(2)
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.hex', 'text/plain; charset=utf-8'],
])

const smokeHtml = String.raw`<!doctype html>
<meta charset="utf-8">
<title>FM1 MSFA AudioWorklet smoke</title>
<script type="module">
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const EXPECTED_POLYPHONY = 16

function hexPatch(text) {
  const hex = text.replace(/\s/g, '')
  if (!/^[0-9a-f]{312}$/i.test(hex)) throw new Error('Reference patch must contain exactly 156 hexadecimal bytes')
  return Uint8Array.from(hex.match(/../g) ?? [], (value) => Number.parseInt(value, 16))
}

function peakOf(analyser, buffer) {
  analyser.getFloatTimeDomainData(buffer)
  let peak = 0
  for (const sample of buffer) {
    if (!Number.isFinite(sample)) throw new Error('Analyser observed a non-finite sample')
    peak = Math.max(peak, Math.abs(sample))
  }
  return peak
}

window.runMsfaWorkletSmoke = async ({ soakMs }) => {
  const errors = []
  const rejections = []
  let processorErrors = 0
  addEventListener('error', (event) => errors.push(String(event.error?.message ?? event.message ?? event.error ?? 'window error')))
  addEventListener('unhandledrejection', (event) => rejections.push(String(event.reason?.message ?? event.reason ?? 'unhandled rejection')))

  const [manifestResponse, wasmResponse, patchResponse] = await Promise.all([
    fetch('/virtual-dx7/manifest.json', { cache: 'no-store' }),
    fetch('/virtual-dx7/fm1-msfa.wasm', { cache: 'no-store' }),
    fetch('/native/virtual-dx7-spike/reference-patch-v1.hex', { cache: 'no-store' }),
  ])
  if (!manifestResponse.ok || !wasmResponse.ok || !patchResponse.ok) {
    throw new Error('Unable to load local virtual DX7 smoke assets')
  }
  const manifest = await manifestResponse.json()
  const wasmBinary = await wasmResponse.arrayBuffer()
  const patch = hexPatch(await patchResponse.text())
  const digest = await crypto.subtle.digest('SHA-256', wasmBinary)
  const wasmSha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
  if (wasmSha256 !== manifest.wasm?.sha256) throw new Error('Browser-loaded WASM hash does not match manifest')
  if (manifest.engineVersion !== 'msfa-2e182b3-fm1-v3-stateful') throw new Error('Unexpected browser engine version')
  if (manifest.statefulSessionAbi !== 1 || manifest.renderBlockFrames !== 64) throw new Error('Unexpected stateful engine ABI')
  if (manifest.workletPolyphony !== EXPECTED_POLYPHONY) throw new Error('Unexpected manifest worklet polyphony')

  const context = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 })
  try {
    await context.resume()
    if (context.sampleRate !== 48000) throw new Error('Browser did not open the requested 48000 Hz AudioContext')
    if (!context.audioWorklet) throw new Error('AudioWorklet is unavailable')
    await context.audioWorklet.addModule('/virtual-dx7/fm1-msfa-worklet.js')

    let readyResolve
    let readyReject
    const ready = new Promise((resolve, reject) => {
      readyResolve = resolve
      readyReject = reject
    })
    const responses = new Map()
    let requestId = 0
    const node = new AudioWorkletNode(context, 'fm1-msfa-one-voice', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { wasmBinary },
    })
    node.onprocessorerror = (event) => {
      processorErrors += 1
      readyReject?.(new Error(event.message || 'AudioWorklet processor error'))
    }
    node.port.onmessage = (event) => {
      const data = event.data
      if (data?.type === 'ready') {
        readyResolve?.(data)
        return
      }
      if (data?.type === 'fatal') {
        const error = new Error(String(data.error ?? 'AudioWorklet fatal error'))
        readyReject?.(error)
        for (const pending of responses.values()) pending.reject(error)
        responses.clear()
        return
      }
      if (data?.type !== 'response' || !Number.isInteger(data.requestId)) return
      const pending = responses.get(data.requestId)
      if (!pending) return
      responses.delete(data.requestId)
      if (data.ok === true) pending.resolve(data.result)
      else pending.reject(new Error(String(data.error ?? 'AudioWorklet command failed')))
    }

    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0
    const gain = context.createGain()
    gain.gain.value = 0
    node.connect(analyser)
    analyser.connect(gain)
    gain.connect(context.destination)

    const readyTimeout = setTimeout(() => readyReject?.(new Error('AudioWorklet ready timeout')), 10000)
    const readyData = await ready
    clearTimeout(readyTimeout)
    if (readyData?.blockFrames !== 64) throw new Error('AudioWorklet reported unexpected block size')
    if (readyData?.polyphony !== EXPECTED_POLYPHONY) throw new Error('AudioWorklet reported unexpected polyphony')

    const command = (name, payload = {}) => {
      const id = ++requestId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          responses.delete(id)
          reject(new Error('AudioWorklet command timeout: ' + name))
        }, 5000)
        responses.set(id, {
          resolve: (value) => { clearTimeout(timer); resolve(value) },
          reject: (error) => { clearTimeout(timer); reject(error) },
        })
        node.port.postMessage({ type: 'command', requestId: id, command: name, ...payload })
      })
    }

    await command('loadVoice', { patch, randomSeed: 42 })

    const allocationVoiceIndices = []
    for (let index = 0; index < EXPECTED_POLYPHONY; index += 1) {
      const allocation = await command('noteOn', { midiNote: 48 + index, velocity: 96 })
      allocationVoiceIndices.push(allocation?.voiceIndex)
    }
    const expectedVoiceIndices = Array.from({ length: EXPECTED_POLYPHONY }, (_, index) => index)
    if (JSON.stringify(allocationVoiceIndices) !== JSON.stringify(expectedVoiceIndices)) {
      throw new Error('Initial polyphony allocation was not deterministic 0 through 15')
    }
    const stolen = await command('noteOn', { midiNote: 80, velocity: 100 })
    const stolenVoiceIndex = stolen?.voiceIndex
    if (stolenVoiceIndex !== 0) throw new Error('The 17th held note did not deterministically steal voice 0')
    await command('allNotesOff')
    await sleep(150)

    const analyserBuffer = new Float32Array(analyser.fftSize)
    let maxPeak = 0
    let activeSamples = 0
    let partialChordSamples = 0
    let cycles = 0
    let suspendedObservations = 0
    const soakStarted = performance.now()

    while ((performance.now() - soakStarted) < soakMs) {
      if (context.state !== 'running') {
        suspendedObservations += 1
        await context.resume()
      }
      const root = 60 + (cycles % 5)
      const chord = [root, root + 4, root + 7]
      const chordAllocations = []
      for (let index = 0; index < chord.length; index += 1) {
        chordAllocations.push(await command('noteOn', {
          midiNote: chord[index],
          velocity: 96 + ((cycles + index * 5) % 24),
        }))
      }
      if (new Set(chordAllocations.map((entry) => entry?.voiceIndex)).size !== chord.length) {
        throw new Error('Simultaneous chord notes did not receive distinct worklet voices')
      }

      await sleep(300)
      let peak = peakOf(analyser, analyserBuffer)
      maxPeak = Math.max(maxPeak, peak)
      if (peak > 1e-6) activeSamples += 1

      await command('noteOff', { midiNote: chord[1] })
      await sleep(120)
      peak = peakOf(analyser, analyserBuffer)
      maxPeak = Math.max(maxPeak, peak)
      if (peak > 1e-6) partialChordSamples += 1

      await command('noteOff', { midiNote: chord[0] })
      await command('noteOff', { midiNote: chord[2] })
      await sleep(200)
      peak = peakOf(analyser, analyserBuffer)
      maxPeak = Math.max(maxPeak, peak)
      if (peak > 1e-6) activeSamples += 1

      await command('allNotesOff')
      await sleep(150)
      cycles += 1
      if (processorErrors > 0 || errors.length > 0 || rejections.length > 0) break
    }

    await command('allNotesOff')
    await sleep(200)
    const silencePeak = peakOf(analyser, analyserBuffer)
    node.port.postMessage({ type: 'command', command: 'dispose' })
    node.disconnect()
    analyser.disconnect()
    gain.disconnect()

    const durationMs = performance.now() - soakStarted
    const result = {
      ok: processorErrors === 0
        && errors.length === 0
        && rejections.length === 0
        && maxPeak > 1e-6
        && activeSamples > 0
        && partialChordSamples > 0
        && silencePeak < 1e-4
        && durationMs >= soakMs,
      engineVersion: manifest.engineVersion,
      workletPolyphony: manifest.workletPolyphony,
      allocationVoiceIndices,
      stolenVoiceIndex,
      wasmSha256,
      sampleRate: context.sampleRate,
      baseLatency: Number.isFinite(context.baseLatency) ? context.baseLatency : null,
      outputLatency: Number.isFinite(context.outputLatency) ? context.outputLatency : null,
      durationMs: Math.round(durationMs),
      cycles,
      maxPeak,
      activeSamples,
      partialChordSamples,
      silencePeak,
      processorErrors,
      windowErrors: errors,
      unhandledRejections: rejections,
      suspendedObservations,
      audioContextState: context.state,
    }
    if (!result.ok) throw Object.assign(new Error('AudioWorklet polyphony smoke assertions failed'), { smokeResult: result })
    return result
  } finally {
    await context.close()
  }
}
</script>`

function safeFileForRequest(urlPath) {
  if (urlPath.startsWith('/virtual-dx7/')) {
    const relative = urlPath.slice('/virtual-dx7/'.length)
    const root = resolve(repoRoot, 'public', 'virtual-dx7')
    const file = resolve(root, relative)
    return file === root || file.startsWith(root + sep) ? file : null
  }
  if (urlPath.startsWith('/native/')) {
    const relative = urlPath.slice(1)
    const root = resolve(repoRoot, 'native')
    const file = resolve(repoRoot, relative)
    return file === root || file.startsWith(root + sep) ? file : null
  }
  return null
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/__msfa-worklet-smoke.html') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        response.end(smokeHtml)
        return
      }
      const file = safeFileForRequest(decodeURIComponent(url.pathname))
      if (!file) {
        response.writeHead(404)
        response.end('not found')
        return
      }
      const type = mimeTypes.get(extname(file).toLowerCase()) ?? 'application/octet-stream'
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
      createReadStream(file).on('error', () => {
        if (!response.headersSent) response.writeHead(404)
        response.end('not found')
      }).pipe(response)
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
  if (!address || typeof address === 'string') throw new Error('Unable to determine smoke server port')
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

async function writeResult(result) {
  const { writeFile } = await import('node:fs/promises')
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}

let browserProcess = null
let staticServer = null
let profileDir = null
let cdp = null
let finalResult = null

try {
  const serverData = await startServer()
  staticServer = serverData.server
  const smokeUrl = `http://127.0.0.1:${serverData.port}/__msfa-worklet-smoke.html`
  const debuggerPort = await reservePort()
  profileDir = await mkdtemp(resolve(tmpdir(), 'fm1-msfa-browser-'))
  const browserArgs = [
    `--remote-debugging-port=${debuggerPort}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    smokeUrl,
  ]
  browserProcess = spawn(browserExecutable, browserArgs, { stdio: ['ignore', 'pipe', 'pipe'] })

  const version = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/version`)
  const targets = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/list`)
  const target = targets.find((item) => item.type === 'page')
  if (!target?.webSocketDebuggerUrl) throw new Error('Browser did not expose a page CDP target')
  cdp = new CdpConnection(target.webSocketDebuggerUrl)
  await cdp.open()
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate', { url: smokeUrl })
  await sleep(500)
  const evaluation = await cdp.send('Runtime.evaluate', {
    expression: `window.runMsfaWorkletSmoke({ soakMs: ${soakSeconds * 1000} })`,
    awaitPromise: true,
    returnByValue: true,
  })
  if (evaluation.exceptionDetails) {
    throw new Error(evaluation.exceptionDetails.exception?.description ?? evaluation.exceptionDetails.text ?? 'Browser smoke evaluation failed')
  }
  const smoke = evaluation.result?.value
  if (!smoke?.ok) throw new Error('Browser smoke returned no successful result')
  finalResult = {
    ok: true,
    browserName,
    browserProduct: version.Browser ?? null,
    browserUserAgent: version['User-Agent'] ?? null,
    protocolVersion: version['Protocol-Version'] ?? null,
    requestedSoakSeconds: soakSeconds,
    ...smoke,
  }
  await writeResult(finalResult)
  process.stdout.write(`${JSON.stringify(finalResult)}\n`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  finalResult = {
    ok: false,
    browserName,
    requestedSoakSeconds: soakSeconds,
    error: message,
  }
  await writeResult(finalResult)
  console.error(message)
  process.exitCode = 1
} finally {
  try { await cdp?.send('Browser.close') } catch {}
  cdp?.close()
  if (browserProcess && browserProcess.exitCode === null) browserProcess.kill()
  if (staticServer) await new Promise((resolvePromise) => staticServer.close(resolvePromise))
  if (profileDir) await rm(profileDir, { recursive: true, force: true })
}
