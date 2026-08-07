#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const manifestPath = resolve(repoRoot, 'docs/research/msfa-source-audit.json')
const writeHashes = process.argv.includes('--write-hashes')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const failures = []
const hashes = new Map()

function sha1GitBlob(bytes) {
  const prefix = Buffer.from(`blob ${bytes.length}\0`)
  return createHash('sha1').update(prefix).update(bytes).digest('hex')
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function rawUrl(path) {
  const upstream = new URL(manifest.upstream.repository)
  if (upstream.hostname !== 'github.com') {
    throw new Error(`Unsupported upstream host: ${upstream.hostname}`)
  }
  const [owner, repo] = upstream.pathname.replace(/^\//, '').split('/')
  if (!owner || !repo) throw new Error('Unable to resolve pinned GitHub repository owner/name')
  return `https://raw.githubusercontent.com/${owner}/${repo}/${manifest.upstream.commit}/${path}`
}

async function fetchCandidate(file) {
  const response = await fetch(rawUrl(file.path), {
    headers: {
      accept: 'text/plain',
      'user-agent': 'fm1-editor-msfa-license-audit',
    },
    redirect: 'error',
  })
  if (!response.ok) {
    throw new Error(`${file.path}: HTTP ${response.status}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const text = bytes.toString('utf8')
  const blobSha1 = sha1GitBlob(bytes)
  const contentSha256 = sha256(bytes)

  if (blobSha1 !== file.upstreamBlobSha1) {
    throw new Error(`${file.path}: Git blob mismatch ${blobSha1} != ${file.upstreamBlobSha1}`)
  }
  if (!text.includes('Licensed under the Apache License') || !text.includes('http://www.apache.org/licenses/LICENSE-2.0')) {
    throw new Error(`${file.path}: expected Apache-2.0 file header was not found`)
  }
  if (file.sha256 !== null && file.sha256 !== contentSha256) {
    throw new Error(`${file.path}: SHA-256 mismatch ${contentSha256} != ${file.sha256}`)
  }

  hashes.set(file.path, contentSha256)
  console.log(`${contentSha256}  ${file.path}`)
}

if (manifest.distributionStatus !== 'not-vendored') {
  failures.push(`Expected distributionStatus=not-vendored; received ${manifest.distributionStatus}`)
}
if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
  failures.push('Manifest has no candidate files')
}

if (failures.length === 0) {
  for (const file of manifest.files) {
    try {
      await fetchCandidate(file)
    } catch (cause) {
      failures.push(cause instanceof Error ? cause.message : String(cause))
    }
  }
}

if (failures.length > 0) {
  console.error('Pinned MSFA upstream audit failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exitCode = 1
} else if (writeHashes) {
  const nextManifest = {
    ...manifest,
    files: manifest.files.map((file) => ({
      ...file,
      sha256: hashes.get(file.path) ?? file.sha256,
    })),
  }
  writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8')
  console.log(`Recorded ${hashes.size} SHA-256 values in docs/research/msfa-source-audit.json.`)
  console.log('No upstream source files were stored. Review the manifest diff before committing it.')
} else {
  console.log(`Verified ${hashes.size} pinned candidate files. No files were written.`)
  console.log('Re-run with --write-hashes to update only the manifest SHA-256 fields after reviewing this output.')
}
