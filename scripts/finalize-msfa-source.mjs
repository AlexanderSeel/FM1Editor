#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const rootIndex = args.indexOf('--source-root')
const rootArgument = rootIndex >= 0 ? args[rootIndex + 1] : null
if (!rootArgument) {
  console.error('Usage: node scripts/finalize-msfa-source.mjs --source-root <materialized-msfa-dir>')
  process.exit(2)
}
const root = resolve(rootArgument)

function read(name) {
  return readFileSync(resolve(root, name), 'utf8').replace(/\r\n/g, '\n')
}
function write(name, value) {
  writeFileSync(resolve(root, name), value, 'utf8')
}
function replaceExact(text, search, replacement, label) {
  const index = text.indexOf(search)
  if (index < 0) throw new Error(`Expected source fragment not found while patching ${label}`)
  if (text.indexOf(search, index + search.length) >= 0) throw new Error(`Source fragment is ambiguous while patching ${label}`)
  return text.slice(0, index) + replacement + text.slice(index + search.length)
}

let header = read('lfo.h')
header = replaceExact(
  header,
  '    void reset(const uint8_t params[6]);',
  '    void reset(const uint8_t params[6], uint32_t seed);',
  'lfo.h seeded reset signature',
)
write('lfo.h', header)

let source = read('lfo.cc')
source = replaceExact(
  source,
  'void Lfo::reset(const uint8_t params[6]) {\n    int rate = params[0];  // 0..99',
  `void Lfo::reset(const uint8_t params[6], uint32_t seed) {\n    // Offline rendering requires a defined lifecycle even when DX7 LFO key\n    // sync is disabled. Start free-running phase from a documented zero phase\n    // and seed only the sample-and-hold generator from the render-plan seed.\n    phase_ = 0;\n    delaystate_ = 0;\n    uint32_t mixedSeed = seed ^ (seed >> 8) ^ (seed >> 16) ^ (seed >> 24);\n    randstate_ = static_cast<uint8_t>(mixedSeed & 0xff);\n\n    int rate = params[0];  // 0..99`,
  'lfo.cc deterministic phase and sample-and-hold seed',
)
write('lfo.cc', source)

for (const name of ['lfo.h', 'lfo.cc']) {
  const text = read(name)
  if (!text.includes('Licensed under the Apache License')) throw new Error(`${name} lost its Apache-2.0 header`)
  if (text.includes('juce_') || text.includes('libMTSClient') || text.includes('Tunings.h')) {
    throw new Error(`${name} crosses the admitted MSFA source boundary`)
  }
}

console.log('Applied deterministic LFO phase/sample-and-hold seed lifecycle to the temporary MSFA source set.')
