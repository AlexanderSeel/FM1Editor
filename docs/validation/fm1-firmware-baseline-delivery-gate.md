# FM-1 firmware-baseline delivery gate acceptance

Reviewed firmware source date: 2026-08-09  
Current reviewed FM-1 PC-firmware baseline: **V15 · 2026-07-30**

Software acceptance: **SUCCESS**

## Validated implementation

The current-release delivery path now distinguishes a reviewed firmware baseline from general compatibility evidence:

- `src/validation/fm1FirmwareBaseline.ts` records the reviewed V15 identity and review metadata;
- `evaluateFm1DeliveryEvidence()` accepts an optional `expectedFirmwareVersion` and fails a current-release manifest when its recorded firmware does not match that baseline;
- omitting the option preserves historical/compatibility evaluation behavior;
- Chrome and Edge still have to share the same firmware/editor/Windows tuple;
- v2 raw-MIDI integrity and v3 physical-package integrity continue to compose the v1 result unchanged;
- `Fm1DeliveryEvidenceGatePanel` supplies the reviewed V15 baseline for production current-release delivery evaluation;
- historical v1 receipt-shaped callers remain source-compatible because `expectedFirmwareVersion` is optional in the receipt interface.

This changes evidence admission only. It does **not** claim that V15 has been installed, physically tested or shown to change any MIDI/audio protocol behavior.

## Executed CI evidence

Validation PR: **#2 — Validate V15 delivery baseline on normal CI**  
PR head: `cb122edcf640d62098cbbc6a19521db2a963ad60`  
Merged to `main`: `4be483f8c2afd7cbc348e4edc23c16ec02e2a2a7`  
GitHub Actions workflow: **CI #1184**  
Workflow run ID: `31296462671`  
Job: `validate` (`93202220425`)

The normal repository PR CI completed with conclusion **success**. Recorded successful steps:

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

The PR delta itself only synchronized `docs/research/fm1-midi-protocol.md`; therefore the normal PR merge checkout validated the firmware-baseline implementation already present on the target `main` plus that documentation synchronization.

## Delivery boundary

A current-release v3 READY receipt must now be built from Chrome and Edge physical sessions that satisfy the reviewed firmware baseline supplied by the production panel, in addition to all existing manifest, raw-MIDI correlation, package, WAV, SysEx and observation requirements.

Evidence from another firmware may still be retained and evaluated as compatibility evidence, but it cannot silently make the current-release production delivery gate READY.

Physical FM-1 verification remains required for every hardware-dependent `PLAN.md` item.
