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

Select the sanitized files in **MIDI monitor → Physical evidence package** and choose `FM-1`, `Stock DX7` or `Mixed`. The browser hashes files locally with Web Crypto SHA-256. Nothing is uploaded. Small `.syx` files are also read locally into browser memory so an FM-1 outgoing 4,104-byte Yamaha bank message can be compared byte-for-byte with the retained transmitted-bank artifact. Stock-DX7 recovery binding relies on the file SHA-256 and therefore does not require interpreting the recovery payload. Temporary bytes are not serialized into either exported receipt.

## Exported schemas

The package index uses schema:

`fm1-editor.physical-evidence-package.v1`

For each artifact it records only:

- filename;
- size in bytes;
- MIME type reported by the browser;
- SHA-256;
- a coarse artifact classification;
- a recognized repository evidence schema name when the selected JSON is small enough to inspect locally.

The raw-MIDI structural correlation receipt uses schema:

`fm1-editor.physical-evidence-consistency.v1`

It records only the selected package target, structural issue codes/messages, summary mismatch field names and filename/SHA-256 identities. For an FM-1 session containing outgoing Yamaha bank traffic it can record the one retained `.syx` artifact whose bytes exactly match that captured bank payload. For a stock-DX7 session it records the one retained `.syx` artifact whose SHA-256 exactly matches the manifest `recoveryBankSha256`. It does **not** contain MIDI event IDs, raw message bytes, SysEx payload bytes, audio, screenshots or parsed hardware-manifest payloads.

Both exports are evidence metadata. Neither proves physical device behavior.

## Classification

The helper recognizes:

- `fm1-editor.hardware-validation-evidence.v1` as an FM-1 hardware manifest;
- `fm1-editor.dx7-hardware-validation-evidence.v1` as a stock-DX7 hardware manifest;
- `fm1-editor.fm1-delivery-evidence-gate.v1` as the historical FM-1 manifest-completeness gate receipt;
- `fm1-editor.fm1-delivery-evidence-gate.v2` as the manifest/raw-MIDI hash-bound intermediate gate receipt;
- `fm1-editor.fm1-delivery-evidence-gate.v3` as the final package-bound FM-1 delivery-gate receipt;
- version-1 MIDI-monitor JSON exports;
- `.syx`, WAV, common screenshot image formats and text/CSV/Markdown notes.

Unknown JSON/data files remain in the package as generic artifacts rather than being discarded.

## Raw MIDI correlation review

When a target-specific hardware manifest and raw version-1 MIDI-monitor JSON are both selected, the helper recomputes `summarizeHardwareMidiCapture()` from the raw events and compares that result with the summary embedded in the manifest.

For each FM-1 or stock-DX7 manifest the correlation review requires **exactly one** raw MIDI export with matching:

- total/input/output message counts;
- SysEx input/output counts;
- recognized 4,104-byte Yamaha bank and 163-byte single-voice output counts;
- SysEx length histograms by direction;
- sorted input/output port names;
- first and last capture timestamps.

It also checks manifest-local invariants written by the recorder:

- FM-1 target identity, `sysexEnabled`, and selected input/output strings must agree with the embedded MIDI summary;
- stock-DX7 selected input/output arrays must agree with the embedded MIDI summary;
- DX7 recovery-bank SHA-256 must be a valid SHA-256 identity **and resolve to exactly one selected `.syx` artifact with that hash**;
- editor commit identity and FM-1 firmware / DX7 model identity are flagged when they are missing or not sufficiently pinned.

### FM-1 transmitted-bank binding

For an FM-1 manifest whose MIDI summary records one or more recognized outgoing Yamaha 32-voice banks, the correlation review additionally requires an unambiguous bank payload:

- repeated sends of the **same** 4,104-byte bank are allowed;
- two or more **different** 4,104-byte bank payloads in the same retained capture are blocked for delivery closure because the downstream physical observation would not identify which payload it refers to;
- the unique captured bank payload must match exactly one selected `.syx` artifact byte-for-byte;
- zero matching `.syx` artifacts or duplicate matching artifacts are reported as structural errors.

### Stock-DX7 recovery-bank binding

Every stock-DX7 hardware manifest records `identity.recoveryBankSha256` before destructive bank testing. Structural consistency now requires that identity to resolve to **exactly one** retained `.syx` artifact in the selected evidence set:

- no matching `.syx` is an error because the recorded recovery identity is not backed by the actual recovery artifact;
- more than one `.syx` with that same hash is treated as ambiguous so the receipt cannot silently choose a filename;
- exactly one match records its filename and SHA-256 in the correlation link;
- the validator does not infer whether that bank is correct for the device or whether restoration succeeded—the stock-DX7 physical `bank-recovery` check remains authoritative.

If no raw export matches, the helper shows the closest candidate and the summary fields that differ. If more than one raw export matches the same manifest, linkage is considered ambiguous rather than silently choosing one. Unlinked raw MIDI exports are also reported.

The **Export correlation receipt** action persists this result and binds each successful manifest/raw-capture link to the SHA-256 values calculated from the currently selected files. For FM-1 bank sessions it also persists the exact matching transmitted-bank `.syx` filename/SHA-256. For stock-DX7 sessions it persists the exact recovery-bank `.syx` filename/SHA-256. The receipt may also be exported for a failed or incomplete session so the inconsistency itself remains reviewable.

This is **structural correlation only**. Matching summaries and artifact identities are evidence that the selected evidence set is internally consistent; they do not prove what the hardware did, that the device accepted/restored a message, that audio is correct, or that a tester-entered PASS is valid.

## FM-1 delivery gate v2/v3 linkage

For Chrome/Edge delivery validation, create a separate correlation receipt and physical-evidence package index for each browser session. The package index must contain the exact hardware manifest and raw MIDI export produced by that session plus its WAV, relevant SysEx and screenshot-or-notes evidence. The v2 layer consumes manifests/correlations; the final v3 layer also consumes both package indexes.

The v2 gate hashes those imported JSON files again and accepts final READY only when:

- the embedded v1 manifest-completeness evaluator accepts a matching Chrome/Edge firmware/editor/Windows/HTTPS tuple;
- the selected Chrome manifest SHA-256 appears in exactly one structurally consistent FM-1 correlation link with a raw-MIDI SHA-256;
- the selected Edge manifest SHA-256 appears in exactly one structurally consistent FM-1 correlation link with a raw-MIDI SHA-256;
- Chrome and Edge use distinct manifest hashes and distinct raw-MIDI capture hashes.

The v2 receipt records the manifest/raw-MIDI source/hash bindings but not imported bodies or MIDI payloads. It intentionally remains compatible with older correlation receipts.

The final v3 gate is stricter. For each selected browser session it requires:

- one `fm1-editor.physical-evidence-package.v1` index containing the exact manifest SHA-256 and raw-MIDI SHA-256 already selected by v2;
- the same structurally consistent correlation receipt selected by v2 to contain an exact byte-bound bank `.syx` filename/SHA-256;
- the package index to contain that exact `.syx` filename/SHA-256 pair;
- at least one WAV and screenshot-or-notes evidence.

Chrome and Edge package-index hashes and WAV hashes must be distinct. The same controlled merged-bank `.syx` may legitimately be shared across both sessions when the same exact bank was deliberately transmitted. Legacy correlation receipts without the exact bank-artifact binding remain parseable and may still satisfy v2, but they cannot make v3 READY.

v3 stores artifact identities/coverage metadata only and does not embed WAV, SysEx or MIDI payloads. These layers close evidence ambiguity only; physical observations remain tester evidence governed by the hardware protocol.

## Package warnings

Warnings are coverage hints, not physical failures. Depending on the selected target, the helper warns when the package lacks:

- the matching target-specific hardware manifest;
- a raw MIDI-monitor export;
- a `.syx` artifact;
- an FM-1 WAV artifact for FM-1/mixed packages;
- a screenshot or text timeline/notes artifact.

Identical SHA-256 values under multiple filenames are also reported for duplicate review. For stock-DX7 evidence, duplicate files matching the declared recovery hash are additionally a structural ambiguity until one canonical recovery artifact remains in the selected set.

A package may legitimately retain warnings or correlation errors when it covers only one protocol section or records a failed session. Conversely, a warning-free and structurally consistent package does not prove that any hardware check passed.

## Commit workflow

1. Keep unsanitized physical captures outside the repository while testing.
2. Review filenames, tester/device identifiers, screenshots and notes for privacy-sensitive content.
3. Export the target-specific hardware manifest **without clearing the MIDI monitor**, then export the raw MIDI JSON from that same captured session.
4. Add the relevant `.syx`, WAV, screenshots/timeline and matrices/notes to a sanitized folder. For FM-1 merged-bank delivery, the `.syx` must be the exact file whose bytes were sent in the captured session. For stock-DX7 destructive bank testing, include the exact recovery `.syx` whose SHA-256 was recorded in the manifest before testing.
5. Run **Physical evidence package** over that exact sanitized file set and review package-coverage warnings, raw-MIDI correlation, FM-1 bank→`.syx` binding when bank output is present, and stock-DX7 recovery-bank binding when applicable.
6. Resolve accidental mixed-session, multiple-bank-payload or ambiguous raw-capture/artifact errors before proposing closure. Do not alter legitimate failed observations merely to make the package look green.
7. Export **both** the package index and the correlation receipt from the same selected file set. Retain the raw sanitized files with those receipts externally, or commit only the artifacts appropriate for the repository.
8. For FM-1 Chrome/Edge delivery, repeat this for both browser sessions and then export the final **v3 delivery gate receipt** from both manifests, both correlation receipts and both package indexes.
9. When proposing a `PLAN.md` item for closure, cite the package index and correlation-receipt hashes together with the target manifest/protocol result; for delivery/Pages also cite the v3 gate receipt. These integrity artifacts are not substitutes for the physical observations.

## Security and evidence boundary

Hashing, JSON inspection and temporary `.syx` byte comparison happen locally in the browser. The helper does not upload selected files, does not serialize raw `.syx` bytes into metadata receipts, does not decode unknown FM-1/DX7 SysEx semantics and does not claim that an FM-1/DX7 accepted or restored any message. Physical support status changes only from repeatable observations collected under the corresponding hardware protocol.
