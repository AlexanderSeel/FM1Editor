#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

const args = process.argv.slice(2)
function argument(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : null
}

const modulePath = argument('--module')
const patchPath = argument('--patch')
const outputPath = argument('--output')
const noteOnFrames = Number.parseInt(argument('--note-on-frames') ?? '48000', 10)
const releaseFrames = Number.parseInt(argument('--release-frames') ?? '24000', 10)
if (!modulePath || !patchPath || !outputPath) {
  console.error('Usage: node scripts/run-msfa-wasm-spike.mjs --module <fm1-msfa.mjs> --patch <reference.hex> --output <render.f32> [--note-on-frames N --release-frames N]')
  process.exit(2)
}

function readPatch(path) {
  const hex = readFileSync(resolve(path), 'utf8').replace(/\s/g, '')
  if (!/^[0-9a-f]{312}$/i.test(hex)) throw new Error('Reference patch must contain exactly 156 hexadecimal bytes.')
  return Uint8Array.from(hex.match(/../g) ?? [], (value) => Number.parseInt(value, 16))
}

function bytesOfFloat32(samples) {
  return Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)
}

function hash(samples) {
  return createHash('sha256').update(bytesOfFloat32(samples)).digest('hex')
}

function signalStats(samples) {
  let peak = 0
  let sumSquares = 0
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample))
    sumSquares += sample * sample
  }
  return {
    peak,
    rms: Math.sqrt(sumSquares / samples.length),
  }
}

const patch = readPatch(patchPath)
const imported = await import(pathToFileURL(resolve(modulePath)).href)
const createModule = imported.default
if (typeof createModule !== 'function') throw new Error('Emscripten module does not export a default factory function.')
const module = await createModule()

if (module._fm1_msfa_patch_length() !== 156) throw new Error(`Unexpected WASM patch length ${module._fm1_msfa_patch_length()}`)
if (module._fm1_msfa_block_size() !== 64) throw new Error(`Unexpected WASM render block size ${module._fm1_msfa_block_size()}`)

const outputFrames = noteOnFrames + releaseFrames
const patchPtr = module._malloc(patch.byteLength)
const outputPtr = module._malloc(outputFrames * Float32Array.BYTES_PER_ELEMENT)
if (!patchPtr || !outputPtr) throw new Error('WASM allocation failed.')

function renderOnce() {
  module.HEAPU8.set(patch, patchPtr)
  const started = performance.now()
  const result = module._fm1_msfa_render(
    patchPtr,
    patch.length,
    60,
    100,
    48000,
    noteOnFrames,
    releaseFrames,
    outputPtr,
    outputFrames,
  )
  const elapsedMs = performance.now() - started
  if (result !== 0) throw new Error(`fm1_msfa_render returned status ${result}`)
  const samples = new Float32Array(module.HEAPF32.buffer, outputPtr, outputFrames).slice()
  for (const sample of samples) {
    if (!Number.isFinite(sample) || sample < -1 || sample > 1) {
      throw new Error(`Invalid normalized PCM sample: ${sample}`)
    }
  }
  const stats = signalStats(samples)
  if (stats.peak < 1e-6 || stats.rms < 1e-7) throw new Error(`WASM renderer produced effectively silent PCM: peak=${stats.peak} rms=${stats.rms}`)
  return { samples, elapsedMs, sha256: hash(samples), ...stats }
}

try {
  const first = renderOnce()
  const second = renderOnce()
  if (!bytesOfFloat32(first.samples).equals(bytesOfFloat32(second.samples))) {
    throw new Error(`Repeated WASM renders are not byte-identical: ${first.sha256} != ${second.sha256}`)
  }
  writeFileSync(resolve(outputPath), bytesOfFloat32(first.samples))
  process.stdout.write(`${JSON.stringify({
    frames: outputFrames,
    sampleRate: 48000,
    noteOnFrames,
    releaseFrames,
    sha256: first.sha256,
    peak: Number(first.peak.toFixed(9)),
    rms: Number(first.rms.toFixed(9)),
    firstRenderMs: Number(first.elapsedMs.toFixed(3)),
    secondRenderMs: Number(second.elapsedMs.toFixed(3)),
    realtimeRatio: Number((first.elapsedMs / 1000 / (outputFrames / 48000)).toFixed(6)),
  })}\n`)
} finally {
  module._free(outputPtr)
  module._free(patchPtr)
}
