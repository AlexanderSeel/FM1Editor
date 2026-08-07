#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
function argument(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : null
}

const modulePath = argument('--module')
const patchPath = argument('--patch')
if (!modulePath || !patchPath) {
  console.error('Usage: node scripts/test-msfa-realtime-wasm.mjs --module <fm1-msfa.mjs> --patch <reference.hex>')
  process.exit(2)
}

const hex = readFileSync(resolve(patchPath), 'utf8').replace(/\s/g, '')
if (!/^[0-9a-f]{312}$/i.test(hex)) throw new Error('Reference patch must contain exactly 156 hexadecimal bytes.')
const patch = Uint8Array.from(hex.match(/../g) ?? [], (value) => Number.parseInt(value, 16))

const imported = await import(pathToFileURL(resolve(modulePath)).href)
const module = await imported.default()
const required = [
  '_fm1_msfa_session_create',
  '_fm1_msfa_session_destroy',
  '_fm1_msfa_session_load_patch',
  '_fm1_msfa_session_note_on',
  '_fm1_msfa_session_note_off',
  '_fm1_msfa_session_all_notes_off',
  '_fm1_msfa_session_render64',
  '_fm1_msfa_session_is_playing',
]
for (const name of required) {
  if (typeof module[name] !== 'function') throw new Error(`Missing stateful WASM export ${name}`)
}
if (module._fm1_msfa_block_size() !== 64) throw new Error('Unexpected MSFA block size')
if (module._fm1_msfa_patch_length() !== 156) throw new Error('Unexpected MSFA patch length')

const patchPointer = module._malloc(patch.length)
const outputPointer = module._malloc(64 * Float32Array.BYTES_PER_ELEMENT)
if (!patchPointer || !outputPointer) throw new Error('Unable to allocate realtime regression buffers')
module.HEAPU8.set(patch, patchPointer)

function status(value, action) {
  if (value !== 0) throw new Error(`${action} returned status ${value}`)
}

function block() {
  status(module._fm1_msfa_session_render64(session, outputPointer), 'render64')
  return new Float32Array(module.HEAPF32.buffer, outputPointer, 64).slice()
}

function hash(samples) {
  return createHash('sha256')
    .update(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength))
    .digest('hex')
}

let session = 0
try {
  session = module._fm1_msfa_session_create(48_000)
  if (!session) throw new Error('Unable to create 48 kHz realtime MSFA session')
  status(module._fm1_msfa_session_load_patch(session, patchPointer, patch.length, 42), 'loadPatch')
  status(module._fm1_msfa_session_note_on(session, 60, 100), 'noteOn')
  if (module._fm1_msfa_session_is_playing(session) !== 1) throw new Error('Session did not enter playing state')

  const fixed = new Float32Array(72_000)
  let frame = 0
  for (let index = 0; index < 750; index += 1) {
    fixed.set(block(), frame)
    frame += 64
  }
  status(module._fm1_msfa_session_note_off(session), 'noteOff')
  for (let index = 0; index < 375; index += 1) {
    fixed.set(block(), frame)
    frame += 64
  }
  if (frame !== fixed.length) throw new Error(`Unexpected realtime frame total ${frame}`)

  const fixedHash = hash(fixed)
  const expectedHash = '313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2'
  if (fixedHash !== expectedHash) {
    throw new Error(`Stateful reference differs from accepted offline PCM: ${fixedHash} != ${expectedHash}`)
  }

  module._fm1_msfa_session_destroy(session)
  session = module._fm1_msfa_session_create(48_000)
  if (!session) throw new Error('Unable to recreate realtime MSFA session')
  status(module._fm1_msfa_session_load_patch(session, patchPointer, patch.length, 42), 'reloadPatch')
  status(module._fm1_msfa_session_note_on(session, 60, 100), 'secondNoteOn')
  const sounding = block()
  if (!sounding.some((sample) => Math.abs(sample) > 1e-6)) throw new Error('Stateful note-on produced silent first block')
  status(module._fm1_msfa_session_all_notes_off(session), 'allNotesOff')
  if (module._fm1_msfa_session_is_playing(session) !== 0) throw new Error('All-notes-off did not clear playing state')
  const silenced = block()
  if (silenced.some((sample) => sample !== 0)) throw new Error('All-notes-off did not produce immediate silence')

  process.stdout.write(`${JSON.stringify({
    blockFrames: 64,
    callbackFrames: 128,
    fixedFrames: fixed.length,
    fixedSha256: fixedHash,
    allNotesOffImmediateSilence: true,
    noteOffReleaseMatchesOfflineReference: true,
  })}\n`)
} finally {
  if (session) module._fm1_msfa_session_destroy(session)
  module._free(outputPointer)
  module._free(patchPointer)
}
