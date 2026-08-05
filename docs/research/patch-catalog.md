# Patch catalog source and merge audit

Last reviewed: 2026-08-05

## Goal

Provide a direct in-application DX7 SysEx browser without requiring the user to leave FM1 Editor, while preserving source attribution and avoiding duplicate bank entries.

## Tracked base archive

The user-provided `sysexFinal.zip` is committed directly as:

- `public/catalog/sysexFinal.zip`

It is a normal tracked repository file, not a generated asset and not a runtime download.

Audited identity:

- size: 2,785,215 bytes;
- SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`;
- ZIP integrity: verified with `unzip -t` before the binary commit;
- source-compatible public attachment: https://github.com/probonopd/MiniDexed/files/11312517/sysexFinal.zip.

Archive contents after excluding `__MACOSX` metadata:

- 1,304 `.syx` files;
- 1,288 standard 4,104-byte DX7 banks with valid Yamaha checksum;
- 14 standard-size banks with checksum errors;
- 2 unsupported 4,084-byte files retained as diagnostics.

The browser does not silently discard diagnostic files. They are hidden by default and can be displayed with the diagnostics filter, but they cannot be loaded through the normal bank action.

## Yamaha Black Boxes overlay

Provider page:

- https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/

The sync script downloads and parses the provider page for direct `.syx` or `.sysex` links. At the review date, the parsed collection contains:

- 8 factory banks;
- 24 VRC voice-ROM banks;
- 3 GreyMatter E! Card banks;
- 35 website banks total.

Filename matching against the tracked ZIP produces:

- 28 website banks matched to an archive bank;
- 7 website-only banks: `rom3a.syx`, `rom3b.syx`, `rom4a.syx`, `rom4b.syx`, `2.syx`, `5.syx`, and `7.syx`.

For duplicate filenames, the merger prefers the original-Yamaha area of the ZIP. The merged entry retains the Yamaha Black Boxes title and source URL but loads the tracked ZIP copy. Website-only entries load the generated website mirror and fall back to the direct provider file if needed.

## Build-time synchronization

`scripts/sync-patch-catalog.mjs` does not create, replace or download the base ZIP. It performs these steps:

1. Read `public/catalog/sysexFinal.zip`.
2. Verify the ZIP signature and audited SHA-256.
3. Parse the Yamaha Black Boxes page for direct SysEx links.
4. Download or reuse a generated mirror of each discovered website file.
5. Write `public/catalog/sync-manifest.json` with source URLs, sizes and hashes.

Only website-derived files are ignored by Git:

- `public/catalog/sync-manifest.json`;
- `public/catalog/yamaha-black-boxes/`.

Run:

```bash
npm run catalog:sync
```

The production `prebuild` runs the same command with `--best-effort`. A provider outage can prevent a fresh website mirror, but it cannot remove or replace the tracked ZIP.

## Runtime flow

At runtime, `src/catalog/catalogLoader.ts`:

1. loads only `public/catalog/sysexFinal.zip`;
2. rejects a missing asset, HTML response or other non-ZIP data before decompression;
3. verifies the archive SHA-256 when Web Crypto is available;
4. decompresses and indexes it in the browser with `fflate`;
5. reads voice names and validates DX7 bank checksums;
6. loads the generated website manifest when available, otherwise uses the curated static overlay;
7. merges website entries with ZIP banks by filename;
8. extracts only the selected bank for normal import.

There is intentionally no runtime fallback to a remote ZIP URL. This prevents a redirect page or blocked remote response from being passed to the ZIP decoder as `invalid zip data`.

## Rights boundary

The application source code is MIT licensed. Patch files are separate third-party works and are not relicensed by this repository.

The source discussion for `sysexFinal.zip` notes that contributed material can contain patches from different origins and that copyright questions exist for some commercial collections. Therefore:

- the application does not mark the full archive as public domain;
- source names and provider URLs remain visible in metadata;
- tracking the exact archive in the repository is not a claim of ownership over its banks;
- a release should audit changed hashes and unresolved rights metadata before public deployment;
- a source or bank can be removed without changing the local file-import workflow.
