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
const resultPath = resolve(argument('--result', `virtual-fm1-preview-${browserName}.json`))
if (!browserExecutable) { console.error('Missing --browser-executable'); process.exit(2) }

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.wasm', 'application/wasm'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon'], ['.zip', 'application/zip'],
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
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Unable to determine static server port')
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
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Browser evaluation failed')
  return result.result?.value
}
async function waitForExpression(cdp, expression, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) { if (await evaluate(cdp, expression)) return; await sleep(100) }
  throw new Error(`Timed out waiting for condition: ${expression}`)
}
async function clickButton(cdp, text, rootExpression = 'document') {
  const clicked = await evaluate(cdp, `(() => {
    const root = ${rootExpression}; if (!root) return false;
    const button = [...root.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes(${JSON.stringify(text)}) && !candidate.disabled);
    if (!button) return false; button.click(); return true;
  })()`)
  if (!clicked) throw new Error(`Unable to click enabled button containing ${text}`)
}
async function setRange(cdp, ariaLabel, value) {
  const changed = await evaluate(cdp, `(() => {
    const input = document.querySelector('input[type=range][aria-label=${JSON.stringify(ariaLabel)}]'); if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(input, ${JSON.stringify(String(value))});
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true;
  })()`)
  if (!changed) throw new Error(`Unable to set range ${ariaLabel}`)
}
async function samplePeak(cdp, analyserExpression, durationMs) {
  return evaluate(cdp, `(async () => {
    const analyser = ${analyserExpression}; if (!analyser) throw new Error('Missing analyser');
    const data = new Float32Array(analyser.fftSize); let maximum = 0; const deadline = performance.now() + ${durationMs};
    while (performance.now() < deadline) { analyser.getFloatTimeDomainData(data); for (const sample of data) maximum = Math.max(maximum, Math.abs(sample)); await new Promise((resolvePromise) => setTimeout(resolvePromise, 20)); }
    return maximum;
  })()`, true)
}
async function pianoKey(cdp, type) {
  return evaluate(cdp, `(() => {
    const button = document.querySelector('button[aria-label^="Focus computer keyboard piano input"]');
    if (!button || button.disabled) return false; button.focus(); button.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, { key: 'a', code: 'KeyA', bubbles: true })); return true;
  })()`)
}

let browserProcess = null, staticServer = null, profileDir = null, cdp = null
try {
  if (!(await existingFile(resolve(distRoot, 'index.html')))) throw new Error('dist/index.html missing')
  const serverData = await startServer(); staticServer = serverData.server
  const pageUrl = `http://127.0.0.1:${serverData.port}/`; const debuggerPort = await reservePort(); profileDir = await mkdtemp(resolve(tmpdir(), 'fm1-preview-'))
  browserProcess = spawn(browserExecutable, [`--remote-debugging-port=${debuggerPort}`, `--user-data-dir=${profileDir}`, '--headless=new', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', pageUrl], { stdio: ['ignore', 'pipe', 'pipe'] })
  const version = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/version`); const targets = await waitForJson(`http://127.0.0.1:${debuggerPort}/json/list`)
  const target = targets.find((item) => item.type === 'page'); if (!target?.webSocketDebuggerUrl) throw new Error('No page CDP target')
  cdp = new CdpConnection(target.webSocketDebuggerUrl); await cdp.open(); await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Page.navigate', { url: pageUrl })
  await waitForExpression(cdp, `document.readyState === 'complete' && document.body.textContent.includes('Virtual FM-1 preview')`)

  await evaluate(cdp, `(() => {
    window.__fm1PreviewErrors = []; window.__fm1PreviewRejections = []; window.__fm1PreviewMidiRequests = 0; window.__fm1PreviewFetches = [];
    window.__fm1PreviewCompressors = []; window.__fm1PreviewBufferSources = []; window.__fm1PreviewBufferAnalysers = []; window.__fm1PreviewBlobs = []; window.__fm1PreviewDownloads = [];
    addEventListener('error', (event) => window.__fm1PreviewErrors.push(String(event.error?.message ?? event.message ?? 'window error')));
    addEventListener('unhandledrejection', (event) => window.__fm1PreviewRejections.push(String(event.reason?.message ?? event.reason ?? 'unhandled rejection')));
    const originalFetch = window.fetch.bind(window); window.fetch = (...args) => { const input=args[0]; const raw=typeof input==='string'?input:input?.url??String(input); const url=new URL(raw,location.href).href; const method=String(args[1]?.method??input?.method??'GET').toUpperCase(); window.__fm1PreviewFetches.push({url,method}); return originalFetch(...args); };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => { window.__fm1PreviewMidiRequests += 1; throw new Error('Virtual FM-1 preview must not request Web MIDI'); } });
    const originalCompressor = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function(...args) { const node = originalCompressor.apply(this,args); window.__fm1PreviewCompressors.push(node); return node; };
    const originalBufferSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function(...args) {
      const source=originalBufferSource.apply(this,args); const analyser=this.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0; const sink=this.createGain(); sink.gain.value=0; source.connect(analyser); analyser.connect(sink); sink.connect(this.destination); window.__fm1PreviewBufferSources.push(source); window.__fm1PreviewBufferAnalysers.push(analyser); return source;
    };
    const originalCreateObjectURL = URL.createObjectURL.bind(URL); URL.createObjectURL = (blob) => { window.__fm1PreviewBlobs.push(blob); return originalCreateObjectURL(blob); };
    const originalAnchorClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(...args) { window.__fm1PreviewDownloads.push(this.download || ''); return originalAnchorClick.apply(this,args); };
    return true;
  })()`)

  // Configure a clearly audible local software filter without enabling hardware live-send.
  await clickButton(cdp, 'Effects')
  await waitForExpression(cdp, `document.body.textContent.includes('Filter and effects controls')`)
  const filterEnabled = await evaluate(cdp, `(() => { const section=[...document.querySelectorAll('section')].find((node)=>node.querySelector('h4')?.textContent?.trim()==='Filter'); const checkbox=section?.querySelector('input[type=checkbox]'); if(!checkbox) return false; if(!checkbox.checked) checkbox.click(); return checkbox.checked; })()`)
  if (!filterEnabled) throw new Error('Unable to enable software Filter state')
  await setRange(cdp, 'Cutoff', 22)
  const liveSendChecked = await evaluate(cdp, `Boolean([...document.querySelectorAll('label')].find((node)=>node.textContent?.includes('Live send'))?.querySelector('input')?.checked)`)
  if (liveSendChecked) throw new Error('Effects Live send unexpectedly enabled')

  await clickButton(cdp, 'Voice')
  await clickButton(cdp, 'Virtual FM-1 preview')
  await waitForExpression(cdp, `document.body.textContent.includes('Reference A/B · offline render') && document.body.textContent.includes('Virtual FM-1 render diagnostics')`, 15_000)
  await clickButton(cdp, 'Enable local audio')
  await waitForExpression(cdp, `document.body.textContent.includes('LOCAL AUDIO READY') && window.__fm1PreviewCompressors.length >= 1`, 20_000)
  await evaluate(cdp, `(() => { const limiter=window.__fm1PreviewCompressors[0]; const analyser=limiter.context.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0; const sink=limiter.context.createGain(); sink.gain.value=0; limiter.connect(analyser); analyser.connect(sink); sink.connect(limiter.context.destination); window.__fm1PreviewLimiterAnalyser=analyser; return true; })()`)

  if (!(await pianoKey(cdp, 'keydown'))) throw new Error('Unable to start dry preview note')
  const dryPeak = await samplePeak(cdp, 'window.__fm1PreviewLimiterAnalyser', 650)
  await pianoKey(cdp, 'keyup')
  if (!(dryPeak > 1e-5)) throw new Error(`Dry preview produced no measurable post-limiter PCM: ${dryPeak}`)

  await waitForExpression(cdp, `!document.body.textContent.includes('measurement pending')`, 10_000)
  const diagnosticsText = await evaluate(cdp, `document.querySelector('[aria-label="Virtual FM-1 render diagnostics"]')?.textContent ?? ''`)
  if (!diagnosticsText.includes('Mean render') || !diagnosticsText.includes('%')) throw new Error(`Measured diagnostics unavailable: ${diagnosticsText}`)

  await clickButton(cdp, 'Dry bypass')
  await waitForExpression(cdp, `document.body.textContent.includes('FX enabled')`)
  if (!(await pianoKey(cdp, 'keydown'))) throw new Error('Unable to start FX preview note')
  const fxPeak = await samplePeak(cdp, 'window.__fm1PreviewLimiterAnalyser', 650)
  await pianoKey(cdp, 'keyup')
  if (!(fxPeak > 1e-5)) throw new Error(`FX preview produced no measurable post-limiter PCM: ${fxPeak}`)
  if (Math.abs(fxPeak - dryPeak) < 1e-4) throw new Error(`Configured filter did not materially alter post-limiter PCM peak: dry=${dryPeak}, fx=${fxPeak}`)

  const masterSliderChanged = await evaluate(cdp, `(() => { const input=document.querySelector('#virtual-fm1-master-gain'); if(!input) return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; setter?.call(input,'-18'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`)
  if (!masterSliderChanged) throw new Error('Unable to change Virtual FM-1 master gain')
  if (!(await pianoKey(cdp, 'keydown'))) throw new Error('Unable to start attenuated preview note')
  const attenuatedPeak = await samplePeak(cdp, 'window.__fm1PreviewLimiterAnalyser', 650)
  await pianoKey(cdp, 'keyup')
  if (!(attenuatedPeak > 0 && attenuatedPeak < fxPeak * 0.7)) throw new Error(`Master gain did not attenuate output enough: fx=${fxPeak}, attenuated=${attenuatedPeak}`)

  // Prepare local reference A through the mounted Audio-to-FM input.
  await clickButton(cdp, 'Audio → FM reference')
  await evaluate(cdp, `(() => {
    const sampleRate=48000, frames=sampleRate, bytes=new ArrayBuffer(44+frames*2), view=new DataView(bytes);
    const text=(offset,value)=>{for(let i=0;i<value.length;i+=1)view.setUint8(offset+i,value.charCodeAt(i));}; text(0,'RIFF'); view.setUint32(4,36+frames*2,true); text(8,'WAVE'); text(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); text(36,'data'); view.setUint32(40,frames*2,true);
    for(let frame=0;frame<frames;frame+=1){const t=frame/sampleRate,active=t>=0.1&&t<0.9,sample=active?Math.sin(2*Math.PI*440*t)*0.25:0;view.setInt16(44+frame*2,Math.max(-32768,Math.min(32767,Math.round(sample*32767))),true);}
    const input=document.querySelector('input[type=file][accept*=".wav"]'); if(!input) throw new Error('Reference input missing'); const transfer=new DataTransfer(); transfer.items.add(new File([bytes],'preview-a4.wav',{type:'audio/wav'})); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); return true;
  })()`)
  await waitForExpression(cdp, `document.body.textContent.includes('preview-a4.wav') && document.body.textContent.includes('A 441.0 Hz')`, 25_000)

  await clickButton(cdp, 'Play reference A')
  await waitForExpression(cdp, `window.__fm1PreviewBufferAnalysers.length >= 1`, 10_000)
  const referencePeak = await samplePeak(cdp, 'window.__fm1PreviewBufferAnalysers[0]', 500)
  if (!(referencePeak > 1e-5)) throw new Error(`Reference A playback produced no measurable PCM: ${referencePeak}`)
  await clickButton(cdp, 'Stop reference A')

  await clickButton(cdp, 'Preview current B')
  await waitForExpression(cdp, `window.__fm1PreviewBufferAnalysers.length >= 2 && document.body.textContent.includes('Stop current B')`, 30_000)
  const currentBPeak = await samplePeak(cdp, 'window.__fm1PreviewBufferAnalysers[1]', 600)
  if (!(currentBPeak > 1e-5)) throw new Error(`Offline-rendered current B produced no measurable PCM: ${currentBPeak}`)
  await clickButton(cdp, 'Stop current B')

  // Switch dry before downloads to keep browser validation bounded while still exercising OfflineAudioContext above with FX enabled.
  await clickButton(cdp, 'FX enabled')
  await waitForExpression(cdp, `document.body.textContent.includes('Dry bypass')`)
  const baselineDownloads = await evaluate(cdp, `window.__fm1PreviewDownloads.length`)
  await clickButton(cdp, 'Download note WAV')
  await waitForExpression(cdp, `window.__fm1PreviewDownloads.length >= ${baselineDownloads + 1}`, 30_000)
  await clickButton(cdp, 'Download chord WAV')
  await waitForExpression(cdp, `window.__fm1PreviewDownloads.length >= ${baselineDownloads + 2}`, 30_000)
  const wavDetails = await evaluate(cdp, `(async () => Promise.all(window.__fm1PreviewBlobs.slice(-2).map(async (blob) => { const bytes=new Uint8Array(await blob.arrayBuffer()); return { size: bytes.length, riff: String.fromCharCode(...bytes.slice(0,4)), wave: String.fromCharCode(...bytes.slice(8,12)) }; })))()`, true)
  if (!Array.isArray(wavDetails) || wavDetails.length !== 2 || wavDetails.some((item) => item.size <= 44 || item.riff !== 'RIFF' || item.wave !== 'WAVE')) throw new Error(`Invalid preview WAV downloads: ${JSON.stringify(wavDetails)}`)

  const diagnosticsJson = await evaluate(cdp, `JSON.stringify({ errors:window.__fm1PreviewErrors,rejections:window.__fm1PreviewRejections,midiRequests:window.__fm1PreviewMidiRequests,fetches:window.__fm1PreviewFetches,downloads:window.__fm1PreviewDownloads,diagnosticsText:document.querySelector('[aria-label="Virtual FM-1 render diagnostics"]')?.textContent??'' })`)
  const diagnostics = JSON.parse(diagnosticsJson ?? '{}')
  if (diagnostics.errors.length || diagnostics.rejections.length) throw new Error(`Browser errors: ${JSON.stringify(diagnostics)}`)
  if (diagnostics.midiRequests !== 0) throw new Error(`Virtual FM-1 preview requested Web MIDI ${diagnostics.midiRequests} time(s)`)
  const origin = new URL(pageUrl).origin
  const externalOrWrite = diagnostics.fetches.filter((entry) => new URL(entry.url).origin !== origin || entry.method !== 'GET')
  if (externalOrWrite.length) throw new Error(`Virtual FM-1 preview made external/write fetches: ${JSON.stringify(externalOrWrite)}`)

  const utilizationMatches = diagnostics.diagnosticsText.match(/([0-9]+(?:\.[0-9]+)?)%/g) ?? []
  const utilization = utilizationMatches.map((value) => Number(value.replace('%',''))).filter(Number.isFinite)
  const result = { ok:true,browserName,browserProduct:version.Browser??null,dryPeak,fxPeak,attenuatedPeak,referencePeak,currentBPeak,downloadCount:diagnostics.downloads.length,wavDetails,midiRequests:diagnostics.midiRequests,utilization,diagnosticsText:diagnostics.diagnosticsText }
  await writeFile(resultPath, `${JSON.stringify(result,null,2)}\n`,'utf8'); process.stdout.write(`${JSON.stringify(result)}\n`)
} catch (error) {
  const result={ok:false,browserName,error:error instanceof Error?error.message:String(error)}; await writeFile(resultPath,`${JSON.stringify(result,null,2)}\n`,'utf8'); console.error(result.error); process.exitCode=1
} finally {
  try { await cdp?.send('Browser.close') } catch {}
  cdp?.close(); if (browserProcess && browserProcess.exitCode===null) browserProcess.kill(); if (staticServer) await new Promise((resolvePromise)=>staticServer.close(resolvePromise)); if (profileDir) await rm(profileDir,{recursive:true,force:true})
}
