import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
const DEFAULT_MANIFEST_PATH = resolve(REPOSITORY_ROOT, 'public/catalog/sync-manifest.json')
const DEFAULT_AUDIT_PATH = resolve(REPOSITORY_ROOT, 'public/catalog/release-audit.json')
const DEFAULT_REPORT_PATH = resolve(REPOSITORY_ROOT, 'docs/catalog-release-audit.md')

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string.`)
  return value
}

function requireHash(value, label) {
  const hash = requireString(value, label).toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`${label} must be a SHA-256 hash.`)
  return hash
}

function requireInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer.`)
  return value
}

function optionalRights(value) {
  if (!isRecord(value)) return {}
  return {
    ...(typeof value.license === 'string' && value.license.trim() ? { license: value.license.trim() } : {}),
    ...(typeof value.rightsHolder === 'string' && value.rightsHolder.trim() ? { rightsHolder: value.rightsHolder.trim() } : {}),
    ...(typeof value.attribution === 'string' && value.attribution.trim() ? { attribution: value.attribution.trim() } : {}),
    ...(typeof value.provenanceUrl === 'string' && value.provenanceUrl.trim() ? { provenanceUrl: value.provenanceUrl.trim() } : {}),
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function normalizeCatalogManifest(value) {
  if (!isRecord(value) || value.version !== 1) throw new Error('Catalog sync manifest version 1 is required.')
  if (!isRecord(value.archive)) throw new Error('Catalog sync manifest is missing archive metadata.')
  if (!isRecord(value.website)) throw new Error('Catalog sync manifest is missing website metadata.')

  const websiteFiles = value.website.files
  if (!Array.isArray(websiteFiles)) throw new Error('Catalog sync manifest website.files must be an array.')

  const archive = {
    sourceKind: requireString(value.archive.sourceKind, 'archive.sourceKind'),
    source: requireString(value.archive.source, 'archive.source'),
    assetPath: requireString(value.archive.assetPath, 'archive.assetPath'),
    size: requireInteger(value.archive.size, 'archive.size'),
    sha256: requireHash(value.archive.sha256, 'archive.sha256'),
    expectedSha256: requireHash(value.archive.expectedSha256, 'archive.expectedSha256'),
    rights: optionalRights(value.archive.rights),
  }

  const files = websiteFiles.map((file, index) => {
    if (!isRecord(file)) throw new Error(`website.files[${index}] must be an object.`)
    return {
      filename: requireString(file.filename, `website.files[${index}].filename`),
      sourceUrl: requireString(file.sourceUrl, `website.files[${index}].sourceUrl`),
      assetPath: requireString(file.assetPath, `website.files[${index}].assetPath`),
      size: requireInteger(file.size, `website.files[${index}].size`),
      sha256: requireHash(file.sha256, `website.files[${index}].sha256`),
      rights: optionalRights(file.rights),
    }
  }).sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl))

  const discoveredFiles = requireInteger(value.website.discoveredFiles, 'website.discoveredFiles')
  if (discoveredFiles !== files.length) {
    throw new Error(`website.discoveredFiles reports ${discoveredFiles}, but ${files.length} file records were found.`)
  }

  return {
    version: 1,
    archive,
    website: {
      pageUrl: requireString(value.website.pageUrl, 'website.pageUrl'),
      discoveredFiles,
      rights: optionalRights(value.website.rights),
      files,
    },
    rightsNotice: typeof value.rightsNotice === 'string' ? value.rightsNotice.trim() : '',
  }
}

export function buildCatalogSnapshot(manifest) {
  const normalized = normalizeCatalogManifest(manifest)
  const catalogFiles = [
    {
      id: `archive:${normalized.archive.assetPath}`,
      kind: 'archive',
      filename: normalized.archive.source.split('/').pop() ?? normalized.archive.source,
      sourceUrl: normalized.archive.source,
      assetPath: normalized.archive.assetPath,
      size: normalized.archive.size,
      sha256: normalized.archive.sha256,
      rights: normalized.archive.rights,
    },
    ...normalized.website.files.map((file) => ({
      id: `website:${file.sourceUrl}`,
      kind: 'website',
      filename: file.filename,
      sourceUrl: file.sourceUrl,
      assetPath: file.assetPath,
      size: file.size,
      sha256: file.sha256,
      rights: file.rights,
    })),
  ].sort((left, right) => left.id.localeCompare(right.id))

  return {
    schemaVersion: 1,
    archive: normalized.archive,
    website: {
      pageUrl: normalized.website.pageUrl,
      discoveredFiles: normalized.website.discoveredFiles,
      rights: normalized.website.rights,
    },
    rightsNotice: normalized.rightsNotice,
    catalogFiles,
  }
}

function changedFields(before, after) {
  return ['filename', 'sourceUrl', 'assetPath', 'size', 'sha256', 'rights']
    .filter((field) => stableStringify(before[field]) !== stableStringify(after[field]))
}

export function compareCatalogFiles(previousFiles = [], currentFiles = []) {
  const previous = new Map(previousFiles.map((file) => [file.id, file]))
  const current = new Map(currentFiles.map((file) => [file.id, file]))
  const added = []
  const removed = []
  const modified = []
  let unchangedCount = 0

  for (const [id, file] of current) {
    const prior = previous.get(id)
    if (!prior) {
      added.push(file)
      continue
    }
    const fields = changedFields(prior, file)
    if (fields.length === 0) unchangedCount += 1
    else modified.push({ id, changedFields: fields, before: prior, after: file })
  }

  for (const [id, file] of previous) {
    if (!current.has(id)) removed.push(file)
  }

  const byId = (left, right) => left.id.localeCompare(right.id)
  added.sort(byId)
  removed.sort(byId)
  modified.sort((left, right) => left.id.localeCompare(right.id))
  return { added, removed, modified, unchangedCount }
}

function missingRights(rights, includeProvenance) {
  const missing = []
  if (!rights.license) missing.push('license')
  if (!rights.rightsHolder) missing.push('rightsHolder')
  if (!rights.attribution) missing.push('attribution')
  if (includeProvenance && !rights.provenanceUrl) missing.push('provenanceUrl')
  return missing
}

export function collectRightsReview(snapshot) {
  const items = []
  const archiveFile = snapshot.catalogFiles.find((file) => file.kind === 'archive')
  if (archiveFile) {
    const missing = missingRights(archiveFile.rights, true)
    if (missing.length > 0) {
      items.push({
        id: archiveFile.id,
        scope: 'archive',
        source: archiveFile.sourceUrl,
        affectedFiles: [archiveFile.filename],
        missing,
        note: 'The bundled archive is tracked and hash-pinned, but explicit provenance and permission metadata must be reviewed before public release.',
      })
    }
  }

  const unresolvedWebsiteFiles = snapshot.catalogFiles
    .filter((file) => file.kind === 'website')
    .map((file) => ({ file, missing: missingRights(file.rights, false) }))
    .filter((entry) => entry.missing.length > 0)

  if (unresolvedWebsiteFiles.length > 0) {
    items.push({
      id: `provider:${snapshot.website.pageUrl}`,
      scope: 'provider',
      source: snapshot.website.pageUrl,
      affectedFiles: unresolvedWebsiteFiles.map(({ file }) => file.filename).sort(),
      missing: [...new Set(unresolvedWebsiteFiles.flatMap(({ missing }) => missing))].sort(),
      note: 'Source URLs and hashes are retained, but the provider does not publish complete machine-readable license and rights-holder metadata per bank.',
    })
  }

  return {
    status: items.length === 0 ? 'clear' : 'review-required',
    unresolvedCount: items.length,
    items,
  }
}

export function buildReleaseAudit(manifest, previousAudit = null, options = {}) {
  const snapshot = buildCatalogSnapshot(manifest)
  const fingerprint = sha256(stableStringify(snapshot))
  const previousFiles = Array.isArray(previousAudit?.catalogFiles) ? previousAudit.catalogFiles : []
  const changes = compareCatalogFiles(previousFiles, snapshot.catalogFiles)
  const rightsReview = collectRightsReview(snapshot)
  const hasSourceChanges = changes.added.length > 0 || changes.removed.length > 0 || changes.modified.length > 0

  return {
    version: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    catalogFingerprint: fingerprint,
    previousCatalogFingerprint: typeof previousAudit?.catalogFingerprint === 'string'
      ? previousAudit.catalogFingerprint
      : null,
    sourceManifest: {
      path: options.manifestPath ?? 'public/catalog/sync-manifest.json',
      sha256: options.sourceManifestSha256 ?? null,
    },
    releaseStatus: rightsReview.unresolvedCount > 0 || hasSourceChanges ? 'review-required' : 'unchanged',
    sources: [
      {
        id: 'tracked-archive',
        kind: 'archive',
        source: snapshot.archive.source,
        assetPath: snapshot.archive.assetPath,
        size: snapshot.archive.size,
        sha256: snapshot.archive.sha256,
        expectedSha256: snapshot.archive.expectedSha256,
      },
      {
        id: 'yamaha-black-boxes',
        kind: 'website',
        source: snapshot.website.pageUrl,
        fileCount: snapshot.website.discoveredFiles,
        aggregateSha256: sha256(stableStringify(snapshot.catalogFiles.filter((file) => file.kind === 'website'))),
      },
    ],
    changes,
    rightsReview,
    rightsNotice: snapshot.rightsNotice,
    catalogFiles: snapshot.catalogFiles,
  }
}

function markdownFileList(files) {
  if (files.length === 0) return '_None._\n'
  return `${files.map((file) => `- \`${file.filename}\` — \`${file.sha256}\``).join('\n')}\n`
}

export function renderReleaseAuditMarkdown(audit) {
  const modifiedFiles = audit.changes.modified.map((entry) => entry.after)
  const rightsRows = audit.rightsReview.items.length === 0
    ? '| — | — | — | No unresolved rights metadata. |'
    : audit.rightsReview.items.map((item) => (
      `| ${item.scope} | ${item.source} | ${item.missing.join(', ')} | ${item.affectedFiles.length} |`
    )).join('\n')

  return `# Patch catalog release audit\n\n` +
    `Generated: \`${audit.generatedAt}\`  \n` +
    `Catalog fingerprint: \`${audit.catalogFingerprint}\`  \n` +
    `Previous fingerprint: \`${audit.previousCatalogFingerprint ?? 'none'}\`  \n` +
    `Release status: **${audit.releaseStatus}**\n\n` +
    `## Source hashes\n\n` +
    `| Source | Kind | Files | SHA-256 |\n|---|---:|---:|---|\n` +
    audit.sources.map((source) => (
      `| ${source.source} | ${source.kind} | ${source.fileCount ?? 1} | \`${source.aggregateSha256 ?? source.sha256}\` |`
    )).join('\n') +
    `\n\n## Changes since the previous reviewed snapshot\n\n` +
    `- Added: **${audit.changes.added.length}**\n` +
    `- Removed: **${audit.changes.removed.length}**\n` +
    `- Modified: **${audit.changes.modified.length}**\n` +
    `- Unchanged: **${audit.changes.unchangedCount}**\n\n` +
    `### Added\n\n${markdownFileList(audit.changes.added)}\n` +
    `### Removed\n\n${markdownFileList(audit.changes.removed)}\n` +
    `### Modified\n\n${markdownFileList(modifiedFiles)}\n` +
    `## Unresolved rights metadata\n\n` +
    `| Scope | Source | Missing metadata | Affected files |\n|---|---|---|---:|\n${rightsRows}\n\n` +
    `${audit.rightsReview.items.map((item) => `- **${item.scope}:** ${item.note}`).join('\n') || 'No rights review notes.'}\n\n` +
    `## Release procedure\n\n` +
    `1. Run \`npm run catalog:sync\`.\n` +
    `2. Run \`npm run catalog:audit\` and review this report plus the JSON snapshot.\n` +
    `3. Commit the reviewed audit files.\n` +
    `4. Run \`npm run release:verify\`; it fails when the synchronized catalog differs from the reviewed fingerprint.\n`
}

export function assertAuditMatchesManifest(manifest, audit) {
  if (!isRecord(audit) || audit.version !== 1 || typeof audit.catalogFingerprint !== 'string') {
    throw new Error('A valid catalog release audit is required. Run npm run catalog:audit and review the generated report.')
  }
  const currentFingerprint = sha256(stableStringify(buildCatalogSnapshot(manifest)))
  if (audit.catalogFingerprint !== currentFingerprint) {
    throw new Error(
      `Catalog release audit is stale: reviewed ${audit.catalogFingerprint}, synchronized ${currentFingerprint}. Run npm run catalog:audit and review the source changes before deployment.`,
    )
  }
  return {
    catalogFingerprint: currentFingerprint,
    releaseStatus: audit.releaseStatus,
    unresolvedRights: audit.rightsReview?.unresolvedCount ?? 0,
  }
}

async function readJson(path, required = true) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (cause) {
    if (!required && cause?.code === 'ENOENT') return null
    if (cause instanceof SyntaxError) throw new Error(`${path} is not valid JSON: ${cause.message}`)
    throw cause
  }
}

function optionValue(argumentsList, name, fallback) {
  const prefix = `${name}=`
  const option = argumentsList.find((argument) => argument.startsWith(prefix))
  return option ? resolve(REPOSITORY_ROOT, option.slice(prefix.length)) : fallback
}

export async function runCatalogReleaseAudit(argumentsList = process.argv.slice(2)) {
  const check = argumentsList.includes('--check')
  const manifestPath = optionValue(argumentsList, '--manifest', DEFAULT_MANIFEST_PATH)
  const auditPath = optionValue(argumentsList, '--audit', DEFAULT_AUDIT_PATH)
  const reportPath = optionValue(argumentsList, '--report', DEFAULT_REPORT_PATH)
  const manifestBytes = await readFile(manifestPath)
  const manifest = JSON.parse(manifestBytes.toString('utf8'))

  if (check) {
    const audit = await readJson(auditPath)
    const result = assertAuditMatchesManifest(manifest, audit)
    console.log(`Catalog audit matches ${result.catalogFingerprint}; rights review items: ${result.unresolvedRights}.`)
    return result
  }

  const previousAudit = await readJson(auditPath, false)
  const audit = buildReleaseAudit(manifest, previousAudit, {
    manifestPath: 'public/catalog/sync-manifest.json',
    sourceManifestSha256: sha256(manifestBytes),
  })
  const report = renderReleaseAuditMarkdown(audit)

  await mkdir(dirname(auditPath), { recursive: true })
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`)
  await writeFile(reportPath, report)
  console.log(
    `Catalog audit written: ${audit.catalogFiles.length} assets, ` +
    `${audit.changes.added.length} added, ${audit.changes.removed.length} removed, ` +
    `${audit.changes.modified.length} modified, ${audit.rightsReview.unresolvedCount} rights review items.`,
  )
  return audit
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null
if (invokedPath === import.meta.url) {
  runCatalogReleaseAudit().catch((cause) => {
    console.error(cause instanceof Error ? cause.stack ?? cause.message : cause)
    process.exitCode = 1
  })
}
