#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const manifestPath = resolve(repoRoot, 'docs/research/msfa-source-audit.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const args = process.argv.slice(2)

function argument(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : null
}

const sourceRootArgument = argument('--source-root')
const outputRootArgument = argument('--output-root')
if (!sourceRootArgument || !outputRootArgument) {
  console.error('Usage: node scripts/materialize-msfa-spike.mjs --source-root <pinned-dexed> --output-root <temporary-output>')
  process.exit(2)
}

const sourceRoot = resolve(sourceRootArgument)
const outputRoot = resolve(outputRootArgument)
const outputRelativeToRepo = relative(repoRoot, outputRoot)
if (outputRelativeToRepo === '' || (!outputRelativeToRepo.startsWith('..') && !resolve(outputRoot).startsWith(resolve(repoRoot, 'node_modules')))) {
  console.error('Refusing to materialize audited third-party source inside the FM1 Editor repository. Use a temporary output directory.')
  process.exit(2)
}

const verify = spawnSync(process.execPath, [
  resolve(repoRoot, 'scripts/verify-msfa-source-audit.mjs'),
  '--source-root', sourceRoot,
  '--require-hashes',
], { stdio: 'inherit' })
if (verify.status !== 0) process.exit(verify.status ?? 1)

rmSync(outputRoot, { recursive: true, force: true })
const msfaRoot = resolve(outputRoot, 'msfa')
mkdirSync(msfaRoot, { recursive: true })

for (const file of manifest.files) {
  const source = resolve(sourceRoot, file.path)
  const destination = resolve(msfaRoot, file.path.replace(/^Source\/msfa\//, ''))
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(source, destination)
}

function read(name) {
  return readFileSync(resolve(msfaRoot, name), 'utf8')
}

function write(name, content) {
  writeFileSync(resolve(msfaRoot, name), content, 'utf8')
}

function replaceExact(text, search, replacement, label) {
  const index = text.indexOf(search)
  if (index < 0) throw new Error(`Expected source fragment not found while patching ${label}`)
  if (text.indexOf(search, index + search.length) >= 0) throw new Error(`Source fragment is ambiguous while patching ${label}`)
  return text.slice(0, index) + replacement + text.slice(index + search.length)
}

function replaceRegexOnce(text, pattern, replacement, label) {
  const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))]
  if (matches.length !== 1) throw new Error(`Expected one source match while patching ${label}; found ${matches.length}`)
  return text.replace(pattern, replacement)
}

let env = read('env.cc')
env = replaceExact(env, '#include <math.h>\n', '#include <math.h>\n#include <algorithm>\n', 'env.cc standard-library include')
env = replaceExact(env, '\n#include "../Dexed.h"\n', '\n', 'env.cc GPL application include')
env = env.replace(/(?<!std::)\bmin\(/g, 'std::min(')
write('env.cc', env)

let controllers = read('controllers.h')
controllers = replaceExact(controllers, '#include "synth.h"\n#include "../Dexed.h"\n', '#include "synth.h"\n#include <algorithm>\n', 'controllers.h GPL application include')
controllers = controllers.replace(/(?<!std::)\bmax\(/g, 'std::max(')
write('controllers.h', controllers)

let coreHeader = read('fm_core.h')
coreHeader = replaceExact(coreHeader, '#include "controllers.h"\n', '', 'fm_core.h unnecessary controller dependency')
write('fm_core.h', coreHeader)

let noteHeader = read('dx7note.h')
noteHeader = replaceExact(noteHeader, '#include "tuning.h"\n', '', 'dx7note.h tuning dependency')
noteHeader = replaceExact(noteHeader, '#include "libMTSClient.h"\n', '', 'dx7note.h MTS dependency')
noteHeader = replaceExact(noteHeader, '#include <memory>\n', '', 'dx7note.h memory dependency')
noteHeader = replaceExact(noteHeader, '    Dx7Note(std::shared_ptr<TuningState> ts, MTSClient *mtsc);', '    Dx7Note();', 'dx7note.h constructor')
noteHeader = replaceExact(noteHeader, '\n    std::shared_ptr<TuningState> tuning_state_;\n', '\n', 'dx7note.h tuning state')
noteHeader = replaceExact(noteHeader, '    //int32_t noteLogFreq;\n    double mtsFreq;\n    static const int32_t mtsLogFreqToNoteLogFreq;\n    MTSClient *mtsClient;\n', '', 'dx7note.h MTS fields')
write('dx7note.h', noteHeader)

let note = read('dx7note.cc')
note = replaceExact(note, '#include <stdlib.h>\n', '#include <stdlib.h>\n#include <algorithm>\n', 'dx7note.cc standard-library include')
note = replaceRegexOnce(
  note,
  /    \/\/ TODO: pitch randomization\n    int32_t logfreq;\n    if \(mode == 0\) \{\n[\s\S]*?\n        \/\/ could use more precision, closer enough for now\. those numbers comes from my DX7/,
  `    int32_t logfreq;\n    if (mode == 0) {\n        // Standard 12-TET only for the feasibility spike. This is the same\n        // integer log-frequency relation used by the pinned MSFA StandardTuning.\n        const int base = 50857777;\n        const int step = (1 << 24) / 12;\n        logfreq = base + step * midinote;\n\n        // could use more precision, closer enough for now. those numbers comes from my DX7`,
  'dx7note.cc standard tuning',
)
note = replaceExact(note, '\nconst int32_t Dx7Note::mtsLogFreqToNoteLogFreq = (1 << 24) / log(2.);\n', '\n', 'dx7note.cc MTS log-frequency constant')
note = replaceExact(
  note,
  'Dx7Note::Dx7Note(std::shared_ptr<TuningState> ts, MTSClient *mtsc)\n: tuning_state_(ts), mtsClient(mtsc) {',
  'Dx7Note::Dx7Note() {',
  'dx7note.cc constructor',
)
note = replaceRegexOnce(
  note,
  /\n    if\( ! tuning_state_->is_standard_tuning\(\) && pb != 0 \)\n    \{[\s\S]*?\n    \}\n    \n    int32_t pitch_base/,
  '\n    int32_t pitch_base',
  'dx7note.cc microtuning pitch-bend branch',
)
note = replaceRegexOnce(
  note,
  /void Dx7Note::updateBasePitches\(\)\n\{[\s\S]*?\n\}\n\nvoid Dx7Note::update\(/,
  `void Dx7Note::updateBasePitches()\n{\n    for (int op = 0; op < 6; op++) {\n        int off = op * 21;\n        int mode = currentPatch[off + 17];\n        int coarse = currentPatch[off + 18];\n        int fine = currentPatch[off + 19];\n        int detune = currentPatch[off + 20];\n        basepitch_[op] = osc_freq(playingMidiNote, mode, coarse, fine, detune, midiChannel);\n    }\n}\n\nvoid Dx7Note::update(`,
  'dx7note.cc MTS retuning update',
)
note = note.replace(/(?<!std::)\bmin\(/g, 'std::min(').replace(/(?<!std::)\bmax\(/g, 'std::max(')
write('dx7note.cc', note)

const forbiddenAfterPatch = [
  '../Dexed.h',
  'tuning.h',
  'Tunings.h',
  'libMTSClient.h',
  'MTS_',
  'TuningState',
  'juce_',
]
for (const name of ['env.cc', 'controllers.h', 'fm_core.h', 'dx7note.h', 'dx7note.cc']) {
  const text = read(name)
  for (const forbidden of forbiddenAfterPatch) {
    if (text.includes(forbidden)) throw new Error(`Patched ${name} still contains forbidden dependency/token ${forbidden}`)
  }
  if (!text.includes('Licensed under the Apache License')) {
    throw new Error(`Patched ${name} lost its Apache-2.0 header`)
  }
}

console.log(`Materialized ${manifest.files.length} audited MSFA candidate files into temporary directory ${outputRoot}.`)
console.log('Applied only the documented GPL/JUCE/MTS/tuning-boundary removals; no source was written into the FM1 Editor repository.')
