# Patch catalog release process

The patch catalog combines the tracked `public/catalog/sysexFinal.zip` archive with checksum-valid Yamaha Black Boxes DX7 bank files discovered during synchronization. Because the provider page and downloaded files can change independently of the application source, a deployment must use a reviewed catalog snapshot rather than trusting a successful HTTP response.

## Audit artifacts

`npm run catalog:audit` reads `public/catalog/sync-manifest.json` and writes:

- `public/catalog/release-audit.json` — the machine-readable reviewed snapshot;
- `docs/catalog-release-audit.md` — the human-readable source/change/rights report.

The JSON snapshot contains:

- a stable catalog fingerprint that excludes volatile synchronization timestamps;
- the tracked ZIP SHA-256 and expected SHA-256;
- a provider aggregate SHA-256;
- every catalog asset path, source URL, byte size and SHA-256;
- added, removed, modified and unchanged files compared with the previous checked-in audit;
- changed fields for each modified file;
- unresolved license, rights-holder, attribution and provenance metadata;
- a release status of `review-required` whenever source files changed or rights metadata remains unresolved.

The audit records unresolved rights metadata; it does not infer that a downloadable patch is public domain or grant redistribution permission.

## Review a catalog update

Run the synchronization and audit explicitly:

```bash
npm run catalog:sync
npm run catalog:audit
```

Review both generated audit files. In particular:

1. Confirm that added and modified files are expected provider changes.
2. Investigate removed files before accepting their disappearance.
3. Confirm that the tracked archive hash still matches the pinned expected hash.
4. Review every unresolved rights item against the source provider and original author information.
5. Commit the two audit artifacts only after that review is complete.

Running `npm run catalog:audit` again against an existing snapshot compares the newly synchronized catalog to the previous reviewed `catalogFiles` list.

## Deployment gate

Use this command before deployment:

```bash
npm run release:verify
```

It performs:

1. strict catalog synchronization;
2. `catalog:audit:check` against the checked-in reviewed fingerprint;
3. TypeScript type checking;
4. ESLint and JSX accessibility validation;
5. all Vitest tests;
6. the production PWA build.

The command fails when the provider catalog, any source hash, path, size or relevant rights metadata differs from the reviewed snapshot. In that case, regenerate and review the audit instead of bypassing the check.

The normal development and production build pre-hooks remain best-effort so local work is not blocked by a temporary provider outage. That best-effort behavior is not a substitute for `release:verify` before deployment.
