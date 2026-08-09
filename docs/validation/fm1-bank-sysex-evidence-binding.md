# FM-1 captured-bank → exact SysEx artifact binding

Validation PR: **#4 — Bind FM-1 delivery evidence to exact bank SysEx bytes**  
Final PR head: `d9cea8e5f22e31ccdeb862703dcb0b6f22f0f6d3`  
Merged to `main`: `bc43e5271d7d6ae1be81573a9680cd4671c6e681`

Software acceptance: **SUCCESS**

## Integrity gap closed

Before this change, delivery gate v3 required a package to contain a `.syx` artifact and separately required the selected raw MIDI capture to report recognized outgoing Yamaha 4,104-byte bank traffic. Those two facts were not cryptographically or byte-wise tied together: a package could contain the correct manifest/raw-MIDI files plus an unrelated `.syx` file and still satisfy the package-coverage layer.

This acceptance closes that repository-side evidence-integrity gap without making a hardware claim.

## Accepted behavior

### Physical evidence correlation

`fm1-editor.physical-evidence-consistency.v1` remains the correlation schema. For FM-1 manifests that record outgoing recognized Yamaha 32-voice bank traffic, the correlation helper now:

- retains selected `.syx` bytes only in browser memory during local evidence review;
- compares the raw captured outgoing Yamaha bank message byte-for-byte with selected `.syx` files;
- permits repeated sends of the same 4,104-byte payload;
- blocks sessions containing more than one distinct outgoing Yamaha bank payload because the downstream physical observation would be ambiguous;
- blocks zero matching `.syx` artifacts;
- blocks multiple matching `.syx` artifacts;
- records only the exact matching `.syx` filename and SHA-256 in the exported correlation receipt;
- never serializes raw MIDI or `.syx` payload bytes into the correlation receipt or package index.

Non-bank physical evidence retains the previous summary-level correlation behavior.

### Delivery gate composition

Delivery gate v2 remains backward-compatible. Historical structurally consistent manifest → raw-MIDI correlation receipts can still satisfy v2 even if they predate exact bank-artifact binding.

Final delivery gate v3 is stricter. For each selected Chrome/Edge session it now requires:

1. the existing v2 manifest → raw-MIDI hash-bound selection;
2. the exact same v2 correlation receipt to contain one byte-bound bank `.syx` filename/SHA-256 for that selected manifest/raw-MIDI pair;
3. the selected `fm1-editor.physical-evidence-package.v1` index to contain that exact `.syx` filename/SHA-256 pair;
4. the existing WAV and screenshot-or-notes coverage requirements.

A legacy correlation receipt without the exact bank-artifact fields remains parseable and may satisfy v2, but it cannot make v3 READY.

The same deliberately controlled merged-bank `.syx` may be shared by Chrome and Edge; manifest, raw-MIDI, package-index and WAV identities remain browser-session-specific under the existing rules.

## Tests added

Focused tests verify that:

- a captured FM-1 bank is bound to one byte-identical `.syx` artifact;
- repeated identical bank sends remain unambiguous;
- a different retained `.syx` payload blocks structural consistency;
- two distinct captured bank payloads block structural consistency;
- exported correlation metadata contains the bank artifact SHA but not raw MIDI or `.syx` payload bytes;
- v2 remains READY with a legacy correlation receipt when its older requirements are met;
- v3 blocks that legacy receipt;
- v3 blocks a package whose retained `.syx` identity differs from the exact bank binding;
- existing package/WAV/session uniqueness requirements remain enforced.

## Executed CI evidence

### Normal repository CI

Workflow: **CI #1200**  
Run ID: `31307038435`  
Job: `validate` (`93228929195`)  
Conclusion: **SUCCESS**

| Stage | Result |
| --- | --- |
| Install dependencies | SUCCESS |
| Audit virtual DX7 source boundary | SUCCESS |
| Audit reconstruction research boundary | SUCCESS |
| Audit learned asset provenance | SUCCESS |
| Typecheck | SUCCESS |
| Lint and accessibility | SUCCESS |
| Full test suite | SUCCESS |
| Production build | SUCCESS |

### Windows Chrome/Edge browser matrix

Workflow: **Browser layout #269**  
Run ID: `31307038434`  
Job: `chrome-edge-layout` (`93228929135`)  
Conclusion: **SUCCESS**

Successful workflow stages:

- project dependency installation;
- production build;
- transient Playwright runner installation;
- desktop, compact-desktop, tablet and mobile layout checks in Chrome and Microsoft Edge for the repository-defined FM-1/DX7 browser paths.

## Boundary

This acceptance proves repository-side evidence linkage only: **captured outgoing Yamaha bank bytes → exact retained `.syx` artifact identity**. It does not prove that the FM-1 accepted the bank, displayed a particular destination prompt, stored the intended bank, preserved voices, produced correct audio, or passed any tester-entered physical check.

Accordingly, no hardware-dependent `PLAN.md` checkbox is closed by this receipt.
