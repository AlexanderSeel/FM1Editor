# Non-hardware roadmap closure

Original roadmap boundary source: `d2b04526a0fd74380e574136237cd1e76daef206`

Status: **REPOSITORY-SIDE NON-EXTERNAL WORK CLOSED**

## Scope

This receipt records a roadmap/acceptance boundary, not a physical or listening test result.

The original 2026-08-09 cleanup established that the then-current repository had no remaining actionable implementation work that could be completed without new external evidence. At that point the last application-code acceptance was the validated 2+2+2 evidence-runner commit `2ed077268368fc0b64ee8416a03db74dc3581a4f`; the cleanup itself changed only roadmap/research/validation documentation.

A later public-source review created one legitimate repository-side follow-up: the delivery gate must not infer a physical FM-1 firmware identity from mutable download-page metadata. A first follow-up incorrectly selected a static V15 baseline. A fresh review of the live official M-VAVE source on the same date showed that interpretation was not supportable: the page exposes Windows/Mac firmware package V14 dated 2026-07-06 and a separate PC Firmware V09 entry dated 2026-06-24, without documenting how either label maps to the firmware identity displayed by the device.

That correctness gap was resolved and accepted by PR #3. See:

- `docs/research/fm1-firmware-baseline.md`;
- `docs/research/fm1-midi-protocol.md`;
- `docs/validation/fm1-firmware-source-snapshot-delivery-gate.md`;
- the superseded historical receipt `docs/validation/fm1-firmware-baseline-delivery-gate.md`.

Final PR #3 acceptance used the exact head `5fa4995b59eb7b6113f608846972aa3b1cf60e6c` and merged as `db4f3b9fe352b5ecbd966a3fbd71ee578abcf911`. GitHub CI **#1195** (run `31297845775`) and Windows browser-layout CI **#267** (run `31297845785`) both completed successfully.

A subsequent integrity review found one more repository-side delivery-evidence ambiguity: v3 required a `.syx` artifact and independently required raw MIDI evidence of outgoing Yamaha bank traffic, but did not prove that the retained `.syx` contained the exact bytes captured on MIDI.

That gap is now also resolved and accepted by PR #4. See:

- `docs/validation/physical-evidence-package.md`;
- `docs/validation/fm1-bank-sysex-evidence-binding.md`.

PR #4 used final head `d9cea8e5f22e31ccdeb862703dcb0b6f22f0f6d3` and merged as `bc43e5271d7d6ae1be81573a9680cd4671c6e681`. Normal CI **#1200** (run `31307038435`) completed successfully for dependency installation, virtual-DX7/reconstruction/learned-source audits, typecheck, lint/accessibility, full tests and production build. Browser-layout CI **#269** (run `31307038434`) also completed successfully.

The physical correlation helper now byte-compares outgoing recognized FM-1 Yamaha 4,104-byte bank traffic with locally selected `.syx` artifacts, stores only the exact matching artifact filename/SHA-256 in the receipt and blocks ambiguous/mismatched bank evidence. Delivery v2 remains backward-compatible; final v3 requires that exact bank binding and requires the selected package index to contain the same filename/SHA-256. This is evidence-integrity logic only and does not infer device acceptance or a physical PASS.

The repository-side boundary is therefore re-established: no hardware PASS is inferred, and no remaining `PLAN.md` checkbox can be completed from repository code, synthetic fixtures, public firmware metadata or invented observations alone.

## Closed non-external roadmap items

### Additional patch provider

The 2026-08-09 follow-up review found no currently admissible provider under the established stable-machine-readable-feed, patch-data rights, provenance and validation criteria. This is now a standing admission policy rather than a permanent unchecked implementation task.

Re-open provider implementation only when a concrete provider satisfies every criterion in `docs/research/additional-patch-providers.md`.

### Optional remote reconstruction accelerator

The local reconstruction path is complete for the current scope: retrieval, constrained CMA-ES, admitted browser-local SpiegeLib initialization, reproducible exact-winner receipts, receipt SHA binding, aggregation and the 2+2+2 evidence runner.

A remote service is not an active implementation/deployment task. Re-open it only if committed closure-ready real-reference evidence demonstrates a material local runtime or quality limitation and the future-service gate in `docs/validation/reconstruction-accelerator-contract.md` is satisfied.

### Current-release FM-1 firmware admission

The repository retains the official download-page entries as a source snapshot only. It does **not** infer the physical device firmware from the V14 Windows/Mac package label or the separate V09 PC Firmware label.

For current-release delivery, the tester must re-check the official source, record the exact firmware identity displayed by the FM-1 and explicitly enter that expected device firmware into the production delivery gate. The gate then requires both Chrome and Edge manifests to match that identity in addition to the existing editor/Windows/origin and evidence-integrity requirements.

Historical sessions can still be evaluated as compatibility evidence without an expected release firmware. They cannot silently satisfy the production current-release gate.

This guard is an evidence-integrity mechanism only. Neither V09 nor V14 has been physically validated by this repository, and the prior 2026-08-05 silent edit-buffer observation did not record firmware, so it cannot be attributed to either current download track or treated as cross-version behavior.

### FM-1 delivery artifact integrity

The final delivery evidence chain is now explicitly:

`physical manifest SHA → matched raw MIDI SHA → exact captured bank .syx filename/SHA → physical package index SHA → v3 delivery receipt`

Chrome and Edge must still retain distinct manifest, raw-MIDI, package-index and WAV identities. The deliberately controlled merged-bank `.syx` may be shared when the same exact bank is intentionally sent in both browser sessions.

The byte binding proves only that the retained `.syx` corresponds to the outgoing captured Yamaha bank bytes. It does not prove the FM-1 accepted, stored or played that bank correctly.

## Remaining boundary

`PLAN.md` contains only:

1. work requiring physical FM-1 or stock Yamaha DX7 observations, including downstream features that cannot be implemented safely before those semantics are known; and
2. one non-hardware external-evidence item: genuine 2+2+2 real isolated recordings plus structured human listening judgments and the resulting committed evidence artifacts.

The second item is intentionally not auto-closed. Synthetic fixtures, objective metrics or invented listening verdicts are not substitutes for the acceptance evidence defined by `docs/validation/real-reference-benchmark-protocol.md`.

This document does not claim a physical-device pass or a human listening result.
