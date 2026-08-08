# Physical evidence package index

The in-app **Physical evidence package** helper creates a reproducible SHA-256 index for files collected during FM-1 or stock Yamaha DX7 physical validation. It is an integrity and inventory layer only. It does not evaluate hardware behavior and cannot turn an observation into a PASS.

## Purpose

Physical sessions can produce several artifacts that should remain correlated even when the raw files are too large, private or inconvenient to commit directly:

- sanitized FM-1 or stock-DX7 hardware evidence manifests;
- raw MIDI-monitor JSON exports;
- source, transmitted and recovery `.syx` files;
- FM-1 WAV recordings;
- screenshots or device-screen timelines;
- parameter/function matrices and failure/recovery notes;
- the compact FM-1 Chrome/Edge delivery-gate receipt when applicable.

Select the sanitized files in **MIDI monitor → Physical evidence package** and choose `FM-1`, `Stock DX7` or `Mixed`. The browser hashes files locally with Web Crypto SHA-256. Nothing is uploaded.

## Exported schema

The exported JSON uses schema:

`fm1-editor.physical-evidence-package.v1`

For each artifact it records only:

- filename;
- size in bytes;
- MIME type reported by the browser;
- SHA-256;
- a coarse artifact classification;
- a recognized repository evidence schema name when the selected JSON is small enough to inspect locally.

The export does **not** embed raw SysEx, audio, screenshots, MIDI events or parsed JSON payloads.

## Classification

The helper recognizes:

- `fm1-editor.hardware-validation-evidence.v1` as an FM-1 hardware manifest;
- `fm1-editor.dx7-hardware-validation-evidence.v1` as a stock-DX7 hardware manifest;
- `fm1-editor.fm1-delivery-evidence-gate.v1` as an FM-1 delivery-gate receipt;
- version-1 MIDI-monitor JSON exports;
- `.syx`, WAV, common screenshot image formats and text/CSV/Markdown notes.

Unknown JSON/data files remain in the package as generic artifacts rather than being discarded.

## Package warnings

Warnings are coverage hints, not physical failures. Depending on the selected target, the helper warns when the package lacks:

- the matching target-specific hardware manifest;
- a raw MIDI-monitor export;
- a `.syx` artifact;
- an FM-1 WAV artifact for FM-1/mixed packages;
- a screenshot or text timeline/notes artifact.

Identical SHA-256 values under multiple filenames are also reported for duplicate review.

A package may legitimately retain warnings when it covers only one protocol section. Conversely, a warning-free package does not prove that any hardware check passed.

## Commit workflow

1. Keep unsanitized physical captures outside the repository while testing.
2. Review filenames, tester/device identifiers, screenshots and notes for privacy-sensitive content.
3. Export the target-specific hardware manifest and raw MIDI JSON where applicable.
4. Add the relevant `.syx`, WAV, screenshots/timeline and matrices/notes to a sanitized folder.
5. Run **Physical evidence package** over that exact sanitized file set and export the index.
6. Retain the raw sanitized files with the index externally, or commit only the artifacts appropriate for the repository.
7. When proposing a `PLAN.md` item for closure, cite the package index SHA together with the target manifest/protocol result. The package index is not a substitute for those results.

## Security and evidence boundary

Hashing and JSON inspection happen locally in the browser. The helper does not upload selected files, does not decode unknown SysEx semantics and does not claim that an FM-1/DX7 accepted any message. Physical support status changes only from repeatable observations collected under the corresponding hardware protocol.
