import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const factory=(await import(pathToFileURL(resolve('.tmp/out-a/fm1-msfa.mjs')).href)).default
const wasmBinary=new Uint8Array(await readFile('.tmp/out-a/fm1-msfa.wasm'))
const module=await factory({wasmBinary,locateFile:(path)=>path})
const exports=['_fm1_msfa_session_configure_performance','_fm1_msfa_session_set_pitch_bend','_fm1_msfa_session_set_modulation','_fm1_msfa_session_set_aftertouch']
console.log('exports', Object.fromEntries(exports.map((name)=>[name,typeof module[name]])))
const hex=(await readFile('native/virtual-dx7-spike/reference-patch-v1.hex','utf8')).replace(/\s/g,'')
const patch=Uint8Array.from(hex.match(/../g),(value)=>Number.parseInt(value,16))
const pp=module._malloc(156); const frames=72000; const op=module._malloc(frames*4)
try {
  module.HEAPU8.set(patch,pp)
  const status=module._fm1_msfa_render(pp,156,60,100,48000,48000,24000,42,op,frames)
  console.log('renderStatus',status)
  const start=op/4
  const pcm=new Float32Array(module.HEAPF32.slice(start,start+frames))
  console.log('pcmHash',createHash('sha256').update(Buffer.from(pcm.buffer)).digest('hex'))
  const session=module._fm1_msfa_session_create(48000)
  console.log('session',session)
  console.log('load',module._fm1_msfa_session_load_patch(session,pp,156,42))
  console.log('configure',module._fm1_msfa_session_configure_performance(session,12,0,99,1,99,2))
  console.log('bend',module._fm1_msfa_session_set_pitch_bend(session,16383))
  console.log('mod',module._fm1_msfa_session_set_modulation(session,127))
  console.log('aftertouch',module._fm1_msfa_session_set_aftertouch(session,127))
  console.log('invalid',module._fm1_msfa_session_set_pitch_bend(session,20000))
  module._fm1_msfa_session_destroy(session)
} finally { module._free(op); module._free(pp) }
