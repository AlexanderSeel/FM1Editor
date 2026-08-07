#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const manifestPath = resolve(repoRoot, 'docs/research/msfa-source-audit.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const args = process.argv.slice(2)
const sourceRootIndex = args.indexOf('--source-root')
const sourceRootArgument = sourceRootIndex >= 0 ? args[sourceRootIndex + 1] : null
const sourceRoot = sourceRootArgument ? resolve(sourceRootArgument) : null
const requireHashes = args.includes('--require-hashes')

const failures = []
const notes = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

function sha1GitBlob(bytes) {
  const prefix = Buffer.from(`blob ${bytes.length}\0`)
  return createHash('sha1').update(prefix).update(bytes).digest('hex')
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function resolvesInside(root, path) {
  const candidate = resolve(root, path)
  const fromRoot = relative(root, candidate)
  return fromRoot !== '..' && !fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(fromRoot)
}

check(manifest.schemaVersion === 1, 'schemaVersion must be 1')
check(manifest.upstream?.repository === 'https://github.com/asb2m10/dexed', 'unexpected upstream repository')
check(/^[0-9a-f]{40}$/.test(manifest.upstream?.commit ?? ''), 'upstream commit must be a full 40-character SHA')
check(manifest.distributionStatus === 'not-vendored', 'audit verifier currently expects distributionStatus=not-vendored')
check(Array.isArray(manifest.files) && manifest.files.length > 0, 'files must be a non-empty array')
check(Array.isArray(manifest.excludedUpstreamFiles), 'excludedUpstreamFiles must be an array')
if (sourceRootIndex >= 0 && !sourceRootArgument) {
  failures.push('--source-root requires a path argument')
}

const paths = new Set()
const allowedActions = new Set(['copy-unmodified', 'patch-required'])
const globalForbiddenIncludes = Array.isArray(manifest.policy?.forbiddenIncludes)
  ? manifest.policy.forbiddenIncludes
  : []

for (const file of manifest.files ?? []) {
  const forbiddenIncludes = Array.isArray(file.forbiddenIncludes) ? file.forbiddenIncludes : []
  check(typeof file.path === 'string' && file.path.startsWith('Source/msfa/'), `invalid MSFA path: ${file.path}`)
  check(typeof file.path === 'string' && !file.path.includes('..'), `candidate path must not contain parent traversal: ${file.path}`)
  check(!paths.has(file.path), `duplicate file entry: ${file.path}`)
  paths.add(file.path)
  check(/^[0-9a-f]{40}$/.test(file.upstreamBlobSha1 ?? ''), `invalid upstreamBlobSha1 for ${file.path}`)
  check(file.licenseConclusion === 'Apache-2.0', `candidate file is not Apache-2.0: ${file.path}`)
  check(allowedActions.has(file.action), `invalid action for ${file.path}: ${file.action}`)
  check(Array.isArray(file.forbiddenIncludes), `forbiddenIncludes must be an array for ${file.path}`)

  if (file.action === 'copy-unmodified') {
    check(forbiddenIncludes.length === 0, `copy-unmodified file declares forbidden includes: ${file.path}`)
  } else {
    check(Array.isArray(file.requiredEdits) && file.requiredEdits.length > 0, `patch-required file needs requiredEdits: ${file.path}`)
  }

  if (file.sha256 !== null) {
    check(/^[0-9a-f]{64}$/.test(file.sha256), `invalid sha256 for ${file.path}`)
  } else if (requireHashes) {
    failures.push(`missing sha256 for ${file.path}`)
  }
}

const excludedPaths = new Set((manifest.excludedUpstreamFiles ?? []).map((file) => file.path))
for (const requiredExcludedPath of ['Source/Dexed.h', 'Source/msfa/tuning.h', 'Source/msfa/tuning.cc']) {
  check(excludedPaths.has(requiredExcludedPath), `required excluded boundary file missing: ${requiredExcludedPath}`)
}

for (const prefix of manifest.policy?.forbiddenPathPrefixes ?? []) {
  for (const path of paths) {
    check(!path.startsWith(prefix), `candidate path crosses forbidden boundary ${prefix}: ${path}`)
  }
}

if (sourceRoot) {
  check(existsSync(sourceRoot), `source root does not exist: ${sourceRoot}`)

  for (const file of manifest.files ?? []) {
    const forbiddenIncludes = Array.isArray(file.forbiddenIncludes) ? file.forbiddenIncludes : []
    if (!resolvesInside(sourceRoot, file.path)) {
      failures.push(`source path escapes source root: ${file.path}`)
      continue
    }

    const absolutePath = resolve(sourceRoot, file.path)
    if (!existsSync(absolutePath)) {
      failures.push(`source file missing: ${file.path}`)
      continue
    }

    const bytes = readFileSync(absolutePath)
    const text = bytes.toString('utf8')
    const gitBlob = sha1GitBlob(bytes)
    const contentSha256 = sha256(bytes)

    check(gitBlob === file.upstreamBlobSha1, `Git blob identity mismatch for ${file.path}: ${gitBlob}`)
    check(text.includes('Licensed under the Apache License') && text.includes('http://www.apache.org/licenses/LICENSE-2.0'), `Apache-2.0 header not found in ${file.path}`)

    if (file.sha256 !== null) {
      check(contentSha256 === file.sha256, `SHA-256 mismatch for ${file.path}: ${contentSha256}`)
    } else {
      notes.push(`${file.path} sha256=${contentSha256}`)
    }

    for (const forbidden of globalForbiddenIncludes) {
      const found = text.includes(forbidden)
      const declared = forbiddenIncludes.includes(forbidden)
      if (file.action === 'copy-unmodified') {
        check(!found, `copy-unmodified file contains forbidden dependency ${forbidden}: ${file.path}`)
      } else if (found) {
        check(declared, `patch-required file contains undeclared forbidden dependency ${forbidden}: ${file.path}`)
      }
    }
  }
}

if (notes.length > 0) {
  console.log('Computed source hashes (record these before vendoring):')
  for (const note of notes) console.log(`  ${note}`)
}

if (failures.length > 0) {
  console.error('MSFA source audit verification failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exitCode = 1
} else {
  const excludedCount = Array.isArray(manifest.excludedUpstreamFiles) ? manifest.excludedUpstreamFiles.length : 0
  console.log(`MSFA source audit verified: ${manifest.files.length} candidate files, ${excludedCount} explicit upstream exclusions, distribution=${manifest.distributionStatus}.`)
}
