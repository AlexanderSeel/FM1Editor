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
const resultPath = resolve(argument('--result', `cma-refinement-${browserName}.json`))
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
  while (Date.now() < deadline) { if (await evaluate(cdp, expression)) return; await sleep(150) }
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
async function samplePeak(cdp, analyserName, durationMs) {
  return evaluate(cdp, `(async () => {
    const analyser=window[${JSON.stringify(analyserName)}]; if(!analyser) throw new Error('Missing analyser ${analyserName}');
    const data=new Float32Array(analyser.fftSize); let maximum=0; const deadline=performance.now()+${durationMs};
    while(performance.now()<deadline){analyser.getFloatTimeDomainData(data);for(const sample of data)maximum=Math.max(maximum,Math.abs(sample));await new Promise((resolvePromise)=>setTimeout(resolvePromise,20));}
    return maximum;
  })()`, true)
}
async function attachLatestWorkletAnalyser(cdp, name) {
  await evaluate(cdp, `(() => {
    const node=window.__fm1CmaNodes.at(-1); if(!node) throw new Error('Missing CMA audition worklet');
    const analyser=node.context.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0; const sink=node.context.createGain(); sink.gain.value=0;
    node.connect(analyser); analyser.connect(sink); sink.connect(node.context.destination); window[${JSON.stringify(name)}]=analyser; return true;
  })()`)
}

let browserProcess=null, staticServer=null, profileDir=null, cdp=null
try {
  if (!(await existingFile(resolve(distRoot,'index.html')))) throw new Error('dist/index.html missing')
  const serverData=await startServer(); staticServer=serverData.server; const pageUrl=`http://127.0.0.1:${serverData.port}/`; const debuggerPort=await reservePort(); profileDir=await mkdtemp(resolve(tmpdir(),'fm1-cma-refine-'))
  browserProcess=spawn(browserExecutable,[`--remote-debugging-port=${debuggerPort}`,`--user-data-dir=${profileDir}`,'--headless=new','--autoplay-policy=no-user-gesture-required','--mute-audio','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update',pageUrl],{stdio:['ignore','pipe','pipe']})
  const version=await waitForJson(`http://127.0.0.1:${debuggerPort}/json/version`); const targets=await waitForJson(`http://127.0.0.1:${debuggerPort}/json/list`); const target=targets.find((item)=>item.type==='page'); if(!target?.webSocketDebuggerUrl) throw new Error('No page CDP target')
  cdp=new CdpConnection(target.webSocketDebuggerUrl); await cdp.open(); await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Page.navigate',{url:pageUrl})
  await waitForExpression(cdp,`document.readyState==='complete'&&document.body.textContent.includes('Audio → FM reference')`)
  await evaluate(cdp,`(() => {
    window.__fm1CmaErrors=[];window.__fm1CmaRejections=[];window.__fm1CmaMidiRequests=0;window.__fm1CmaFetches=[];window.__fm1CmaNodes=[];
    addEventListener('error',(event)=>window.__fm1CmaErrors.push(String(event.error?.message??event.message??'window error'))); addEventListener('unhandledrejection',(event)=>window.__fm1CmaRejections.push(String(event.reason?.message??event.reason??'unhandled rejection')));
    const originalFetch=window.fetch.bind(window);window.fetch=(...args)=>{const input=args[0],raw=typeof input==='string'?input:input?.url??String(input),url=new URL(raw,location.href).href,method=String(args[1]?.method??input?.method??'GET').toUpperCase();window.__fm1CmaFetches.push({url,method});return originalFetch(...args);};
    Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>{window.__fm1CmaMidiRequests+=1;throw new Error('CMA refinement must not request Web MIDI');}});
    const Original=window.AudioWorkletNode;window.AudioWorkletNode=new Proxy(Original,{construct(target,args,newTarget){const node=Reflect.construct(target,args,newTarget);window.__fm1CmaNodes.push(node);return node;}});return true;
  })()`)
  const initialVoice=await evaluate(cdp,`document.querySelector('.fm1-lcd-title')?.textContent?.trim()??''`)

  await clickButton(cdp,'Audio → FM reference')
  await evaluate(cdp,`(() => {
    const sampleRate=48000,frames=sampleRate,bytes=new ArrayBuffer(44+frames*2),view=new DataView(bytes);const text=(offset,value)=>{for(let i=0;i<value.length;i+=1)view.setUint8(offset+i,value.charCodeAt(i));};
    text(0,'RIFF');view.setUint32(4,36+frames*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*2,true);
    for(let frame=0;frame<frames;frame+=1){const t=frame/sampleRate,active=t>=0.1&&t<0.9,sample=active?Math.sin(2*Math.PI*440*t)*0.25:0;view.setInt16(44+frame*2,Math.max(-32768,Math.min(32767,Math.round(sample*32767))),true);}
    const input=document.querySelector('input[type=file][accept*=".wav"]');if(!input)throw new Error('Reference input missing');const transfer=new DataTransfer();transfer.items.add(new File([bytes],'cma-a4.wav',{type:'audio/wav'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;
  })()`)
  await waitForExpression(cdp,`document.body.textContent.includes('cma-a4.wav')&&document.body.textContent.includes('REFERENCE READY')`,25_000)
  const root=`document.querySelector('section[aria-label="Nearest preset reconstruction"]')`
  await clickButton(cdp,'Build / search local index',root)
  await waitForExpression(cdp,`${root}?.textContent?.includes('Ranked candidates')&&${root}?.querySelectorAll('article').length>=3`,180_000)
  const titleAfterSearch=await evaluate(cdp,`document.querySelector('.fm1-lcd-title')?.textContent?.trim()??''`)
  if(titleAfterSearch!==initialVoice) throw new Error(`Retrieval auto-loaded voice: ${initialVoice} -> ${titleAfterSearch}`)

  await clickButton(cdp,'Refine top',root)
  await waitForExpression(cdp,`${root}?.querySelector('[aria-label="CMA-ES refinement progress"]')||${root}?.querySelector('[aria-label="CMA-ES refined candidates"]')`,30_000)
  await waitForExpression(cdp,`${root}?.querySelector('[aria-label="CMA-ES refined candidates"]')?.querySelectorAll('article').length>=2`,360_000)
  const refinedCount=await evaluate(cdp,`${root}.querySelector('[aria-label="CMA-ES refined candidates"]').querySelectorAll('article').length`)
  const titleAfterRefine=await evaluate(cdp,`document.querySelector('.fm1-lcd-title')?.textContent?.trim()??''`)
  if(titleAfterRefine!==initialVoice) throw new Error(`Refinement auto-loaded voice: ${initialVoice} -> ${titleAfterRefine}`)
  const distancePairs=await evaluate(cdp,`[...${root}.querySelector('[aria-label="CMA-ES refined candidates"]').querySelectorAll('article')].map((article)=>{const text=article.textContent??'';const match=text.match(/distance\s+([0-9.]+)\s+→\s+([0-9.]+)/);return match?[Number(match[1]),Number(match[2])]:null;}).filter(Boolean)`)
  if(!Array.isArray(distancePairs)||distancePairs.length<2) throw new Error(`Unable to read refined distance pairs: ${JSON.stringify(distancePairs)}`)
  if(distancePairs.some(([initial,best])=>!Number.isFinite(initial)||!Number.isFinite(best)||best>initial+1e-9)) throw new Error(`Refinement worsened a reported best distance: ${JSON.stringify(distancePairs)}`)
  if(!distancePairs.some(([initial,best])=>best<initial-1e-6)) throw new Error(`No constrained refinement improved the retrieved starts: ${JSON.stringify(distancePairs)}`)

  const refinedRoot=`${root}.querySelector('[aria-label="CMA-ES refined candidates"]').querySelector('article')`
  const refinedName=await evaluate(cdp,`${refinedRoot}.querySelector('h5')?.textContent?.trim()??''`)
  if(!refinedName) throw new Error('First refined result has no name')
  const nodesBefore=await evaluate(cdp,`window.__fm1CmaNodes.length`)
  await clickButton(cdp,'Audition refined',refinedRoot)
  await waitForExpression(cdp,`window.__fm1CmaNodes.length>${nodesBefore}`,20_000)
  await attachLatestWorkletAnalyser(cdp,'__fm1CmaAnalyser')
  const auditionPeak=await samplePeak(cdp,'__fm1CmaAnalyser',700)
  if(!(auditionPeak>1e-5)) throw new Error(`Refined audition produced no measurable PCM: ${auditionPeak}`)
  const titleAfterAudition=await evaluate(cdp,`document.querySelector('.fm1-lcd-title')?.textContent?.trim()??''`)
  if(titleAfterAudition!==initialVoice) throw new Error(`Refined audition implicitly loaded voice: ${initialVoice} -> ${titleAfterAudition}`)

  await clickButton(cdp,'Load refined',refinedRoot)
  const normalizedRefined=refinedName.split(' ').filter(Boolean).join(' ')
  await waitForExpression(cdp,`(document.querySelector('.fm1-lcd-title')?.textContent??'').split(' ').filter(Boolean).join(' ')===${JSON.stringify(normalizedRefined)}`,15_000)
  const finalVoice=await evaluate(cdp,`document.querySelector('.fm1-lcd-title')?.textContent?.trim()??''`)

  const diagnostics=JSON.parse(await evaluate(cdp,`JSON.stringify({errors:window.__fm1CmaErrors,rejections:window.__fm1CmaRejections,midiRequests:window.__fm1CmaMidiRequests,fetches:window.__fm1CmaFetches})`)??'{}')
  if(diagnostics.errors.length||diagnostics.rejections.length) throw new Error(`Browser errors: ${JSON.stringify(diagnostics)}`)
  if(diagnostics.midiRequests!==0) throw new Error(`CMA refinement requested Web MIDI ${diagnostics.midiRequests} time(s)`)
  const origin=new URL(pageUrl).origin;const externalOrWrite=diagnostics.fetches.filter((entry)=>new URL(entry.url).origin!==origin||entry.method!=='GET');if(externalOrWrite.length) throw new Error(`CMA refinement made external/write fetches: ${JSON.stringify(externalOrWrite)}`)

  const result={ok:true,browserName,browserProduct:version.Browser??null,refinedCount,distancePairs,refinedName,initialVoice,finalVoice,auditionPeak,midiRequests:diagnostics.midiRequests,localFetchCount:diagnostics.fetches.length}
  await writeFile(resultPath,`${JSON.stringify(result,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify(result)}\n`)
} catch(error){const result={ok:false,browserName,error:error instanceof Error?error.message:String(error)};await writeFile(resultPath,`${JSON.stringify(result,null,2)}\n`,'utf8');console.error(result.error);process.exitCode=1}
finally{try{await cdp?.send('Browser.close')}catch{}cdp?.close();if(browserProcess&&browserProcess.exitCode===null)browserProcess.kill();if(staticServer)await new Promise((resolvePromise)=>staticServer.close(resolvePromise));if(profileDir)await rm(profileDir,{recursive:true,force:true})}
