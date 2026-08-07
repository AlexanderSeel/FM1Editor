#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const audit = JSON.parse(readFileSync(resolve(repoRoot, 'docs/research/msfa-source-audit.json'), 'utf8'))
const args = process.argv.slice(2)

function argument(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : null
}

const sourceRootArgument = argument('--source-root')
const manifestPathArgument = argument('--manifest')
if (!sourceRootArgument || !manifestPathArgument) {
  console.error('Usage: node scripts/prepare-msfa-distribution.mjs --source-root <derived-msfa-dir> --manifest <output.json>')
  process.exit(2)
}

const sourceRoot = resolve(sourceRootArgument)
const manifestPath = resolve(manifestPathArgument)
const modified = new Map([
  ['Source/msfa/env.cc', 'Removed the Dexed application-header dependency and use standard-library min support for the isolated engine build.'],
  ['Source/msfa/controllers.h', 'Removed the Dexed application-header dependency and use standard-library max support for the isolated engine build.'],
  ['Source/msfa/fm_core.h', 'Removed the unnecessary controller-header dependency from the isolated FM core boundary.'],
  ['Source/msfa/dx7note.h', 'Removed MTS-ESP/tuning-library state and constructor dependencies for the standard-12-TET browser engine.'],
  ['Source/msfa/dx7note.cc', 'Removed MTS-ESP/tuning-library branches, retained standard 12-TET behavior, and reset feedback history for deterministic renderer lifecycle.'],
])

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function sourcePath(auditPath) {
  return resolve(sourceRoot, auditPath.replace(/^Source\/msfa\//, ''))
}

function markModified(auditPath, detail) {
  const path = sourcePath(auditPath)
  const original = readFileSync(path, 'utf8')
  if (!original.includes('Licensed under the Apache License')) {
    throw new Error(`Apache-2.0 header missing before distribution marking: ${auditPath}`)
  }
  if (original.includes('Modified by the FM1 Editor project')) return
  const marker = '*/'
  const index = original.indexOf(marker)
  if (index < 0) throw new Error(`Unable to locate license-header terminator in ${auditPath}`)
  const notice = `\n\n// Modified by the FM1 Editor project on 2026-08-07.\n// ${detail}\n// See third_party/msfa/NOTICE.md for provenance and the complete modification record.`
  const next = original.slice(0, index + marker.length) + notice + original.slice(index + marker.length)
  writeFileSync(path, next, 'utf8')
}

for (const [path, detail] of modified) markModified(path, detail)

const forbidden = ['../Dexed.h', 'libMTSClient.h', 'Tunings.h', 'juce_']
const files = audit.files.map((entry) => {
  const path = sourcePath(entry.path)
  const bytes = readFileSync(path)
  const text = bytes.toString('utf8')
  for (const token of forbidden) {
    if (text.includes(token)) throw new Error(`Distributed source crosses forbidden boundary ${token}: ${entry.path}`)
  }
  const isModified = modified.has(entry.path)
  if (isModified && !text.includes('Modified by the FM1 Editor project')) {
    throw new Error(`Modified source is missing its prominent notice: ${entry.path}`)
  }
  if (!isModified && text.includes('Modified by the FM1 Editor project')) {
    throw new Error(`Unexpected modification notice on unmodified source: ${entry.path}`)
  }
  return {
    path: entry.path.replace(/^Source\/msfa\//, 'src/'),
    upstreamPath: entry.path,
    upstreamBlobSha1: entry.upstreamBlobSha1,
    upstreamSha256: entry.sha256,
    derivedSha256: sha256(bytes),
    licenseSpdx: 'Apache-2.0',
    modified: isModified,
    modification: modified.get(entry.path) ?? null,
  }
})

const manifest = {
  schemaVersion: 1,
  package: 'fm1-editor-msfa-compatible-core',
  distributionLabel: 'DX7-compatible dry synthesis core',
  upstream: {
    repository: audit.upstream.repository,
    commit: audit.upstream.commit,
  },
  licenseSpdx: 'Apache-2.0',
  excludedComponents: ['Dexed GPL application/plugin wrapper', 'JUCE', 'MTS-ESP', 'surge-synthesizer/tuning-library', 'Dexed effects/UI/assets/cartridges'],
  standardTuningOnly: true,
  files,
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Prepared ${files.length} distributed MSFA files; ${modified.size} carry explicit FM1 Editor modification notices.`)
