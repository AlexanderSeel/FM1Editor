# Patch catalog source and merge audit

Last reviewed: 2026-08-05

## Goal

Provide a direct in-application DX7 SysEx browser without requiring the user to leave FM1 Editor, while preserving source attribution and avoiding duplicate bank entries.

## Base archive

The user-provided `sysexFinal.zip` is used as the base collection.

- Source-compatible public attachment: https://github.com/probonopd/MiniDexed/files/11312517/sysexFinal.zip
- Expected SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`
- Uploaded archive size: 2,785,215 bytes
- `.syx` files after excluding `__MACOSX` metadata: 1,304
- Standard 4,104-byte DX7 banks with valid Yamaha checksum: 1,288
- Standard-size banks with checksum errors: 14
- Unsupported 4,084-byte files retained as diagnostics: 2

The browser does not silently discard diagnostic files. They are hidden by default and can be displayed with the diagnostics filter, but they cannot be loaded through the normal bank action.

## Yamaha Black Boxes overlay

Provider page:

- https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/

The sync script downloads and parses the provider page for direct `.syx` or `.sysex` links. At the review date, the catalog model represents:

- 8 factory banks;
- 24 VRC voice-ROM banks;
- 3 GreyMatter E! Card banks;
- 35 website banks total.

Filename matching against the base ZIP produces:

- 28 website banks matched to an archive bank;
- 7 website-only banks: `rom3a.syx`, `rom3b.syx`, `rom4a.syx`, `rom4b.syx`, `2.syx`, `5.syx`, and `7.syx`.

For duplicate filenames, the merger prefers the original-Yamaha area of the ZIP. The merged entry retains the Yamaha Black Boxes title and source URL but loads the ZIP copy. Website-only entries load the build mirror and fall back to the direct provider file if needed.

## Build and runtime flow

`scripts/sync-patch-catalog.mjs` performs the build-time synchronization:

1. Download `sysexFinal.zip` or reuse an existing generated copy.
2. Compare its SHA-256 with the audited baseline.
3. Parse the Yamaha Black Boxes page for direct SysEx links.
4. Download or reuse a generated mirror of each discovered file.
5. Write `public/catalog/sync-manifest.json` with URLs, sizes and hashes.

Generated third-party files are excluded from Git by `.gitignore`. Run:

```bash
npm run catalog:sync
```

The production `prebuild` runs the same command with `--best-effort`; a temporary provider outage does not invalidate the application source build when previously generated files are present.

At runtime, `src/catalog/catalogLoader.ts`:

1. loads the build-mirrored ZIP;
2. falls back to the original public archive attachment if necessary;
3. verifies the archive SHA-256 when Web Crypto is available;
4. decompresses and indexes it in the browser with `fflate`;
5. reads voice names and validates checksums;
6. merges the Yamaha Black Boxes overlay;
7. extracts only the selected bank for normal import.

## Rights boundary

The application source code is MIT licensed. Patch files are separate third-party works and are not relicensed by this repository.

The source discussion for `sysexFinal.zip` notes that contributed material can contain patches from different origins and that copyright questions exist for some commercial collections. Therefore:

- the application does not mark the full archive as public domain;
- source names and provider URLs remain visible in metadata;
- the generated mirror is intended for a reviewed application build, not as a claim of ownership;
- a release should audit changed hashes and unresolved rights metadata before public deployment;
- a source or bank can be removed from the sync process without changing the local file-import workflow.
