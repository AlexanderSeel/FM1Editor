import { describe, expect, it } from 'vitest'
import {
  assertAuditMatchesManifest,
  buildCatalogSnapshot,
  buildReleaseAudit,
  compareCatalogFiles,
  renderReleaseAuditMarkdown,
  sha256,
  stableStringify,
} from './catalog-release-audit.mjs'

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)
const HASH_C = 'c'.repeat(64)
const HASH_D = 'd'.repeat(64)

function createManifest(overrides = {}) {
  return {
    version: 1,
    generatedAt: overrides.generatedAt ?? '2026-08-05T12:00:00.000Z',
    archive: {
      sourceKind: 'tracked-source',
      source: 'public/catalog/sysexFinal.zip',
      assetPath: 'catalog/sysexFinal.zip',
      size: 1000,
      sha256: HASH_A,
      expectedSha256: HASH_A,
    },
    website: {
      pageUrl: 'https://example.test/patches/',
      discoveredFiles: 2,
      files: [
        {
          filename: 'one.syx',
          sourceUrl: 'https://example.test/one.syx',
          assetPath: 'catalog/example/one.syx',
          size: 4104,
          sha256: overrides.firstHash ?? HASH_B,
        },
        {
          filename: 'two.syx',
          sourceUrl: 'https://example.test/two.syx',
          assetPath: 'catalog/example/two.syx',
          size: 4104,
          sha256: HASH_C,
        },
      ],
    },
    rightsNotice: 'Rights vary by source.',
  }
}

describe('catalog release audit', () => {
  it('uses a stable fingerprint that ignores sync timestamps', () => {
    const first = buildCatalogSnapshot(createManifest({ generatedAt: '2026-08-05T12:00:00.000Z' }))
    const second = buildCatalogSnapshot(createManifest({ generatedAt: '2026-08-06T12:00:00.000Z' }))

    expect(sha256(stableStringify(first))).toBe(sha256(stableStringify(second)))
  })

  it('records added, removed and modified catalog files', () => {
    const previous = [
      { id: 'a', filename: 'a.syx', sourceUrl: 'a', assetPath: 'a', size: 1, sha256: HASH_A, rights: {} },
      { id: 'b', filename: 'b.syx', sourceUrl: 'b', assetPath: 'b', size: 1, sha256: HASH_B, rights: {} },
      { id: 'removed', filename: 'removed.syx', sourceUrl: 'removed', assetPath: 'removed', size: 1, sha256: HASH_C, rights: {} },
    ]
    const current = [
      previous[0],
      { ...previous[1], sha256: HASH_D },
      { id: 'added', filename: 'added.syx', sourceUrl: 'added', assetPath: 'added', size: 1, sha256: HASH_C, rights: {} },
    ]

    const changes = compareCatalogFiles(previous, current)

    expect(changes.added.map((file) => file.id)).toEqual(['added'])
    expect(changes.removed.map((file) => file.id)).toEqual(['removed'])
    expect(changes.modified).toEqual([
      expect.objectContaining({ id: 'b', changedFields: ['sha256'] }),
    ])
    expect(changes.unchangedCount).toBe(1)
  })

  it('records missing archive and provider rights metadata', () => {
    const audit = buildReleaseAudit(createManifest(), null, {
      generatedAt: '2026-08-05T12:00:00.000Z',
      sourceManifestSha256: HASH_D,
    })

    expect(audit.releaseStatus).toBe('review-required')
    expect(audit.rightsReview.status).toBe('review-required')
    expect(audit.rightsReview.items).toEqual([
      expect.objectContaining({ scope: 'archive', missing: ['license', 'rightsHolder', 'attribution', 'provenanceUrl'] }),
      expect.objectContaining({ scope: 'provider', affectedFiles: ['one.syx', 'two.syx'] }),
    ])
    expect(audit.changes.added).toHaveLength(3)
  })

  it('accepts a reviewed snapshot and rejects a changed source hash', () => {
    const manifest = createManifest()
    const audit = buildReleaseAudit(manifest, null, { generatedAt: '2026-08-05T12:00:00.000Z' })

    expect(assertAuditMatchesManifest(manifest, audit)).toEqual(
      expect.objectContaining({ catalogFingerprint: audit.catalogFingerprint, unresolvedRights: 2 }),
    )
    expect(() => assertAuditMatchesManifest(createManifest({ firstHash: HASH_D }), audit)).toThrow(/stale/i)
  })

  it('renders source hashes, file changes and rights review instructions', () => {
    const audit = buildReleaseAudit(createManifest(), null, { generatedAt: '2026-08-05T12:00:00.000Z' })
    const markdown = renderReleaseAuditMarkdown(audit)

    expect(markdown).toContain('# Patch catalog release audit')
    expect(markdown).toContain('Added: **3**')
    expect(markdown).toContain('Unresolved rights metadata')
    expect(markdown).toContain('npm run release:verify')
  })
})
