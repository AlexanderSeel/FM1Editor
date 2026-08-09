# Non-hardware roadmap closure

Original roadmap boundary source: `d2b04526a0fd74380e574136237cd1e76daef206`

Status: **REPOSITORY-SIDE NON-EXTERNAL WORK CLOSED**

## Scope

This receipt records a roadmap/acceptance boundary, not a physical or listening test result.

The original 2026-08-09 cleanup established that the then-current repository had no remaining actionable implementation work that could be completed without new external evidence. At that point the last application-code acceptance was the validated 2+2+2 evidence-runner commit `2ed077268368fc0b64ee8416a03db74dc3581a4f`; the cleanup itself changed only roadmap/research/validation documentation.

Later on 2026-08-09, a fresh review of M-VAVE's official download center exposed a newer current PC-firmware baseline, **FM-1 V15 dated 2026-07-30**. That new external public information created one legitimate repository-side follow-up: prevent otherwise-complete Chrome/Edge delivery evidence on a stale firmware from silently becoming current-release READY.

That follow-up is now implemented and accepted. See:

- `docs/research/fm1-firmware-baseline.md`;
- `docs/research/fm1-midi-protocol.md`;
- `docs/validation/fm1-firmware-baseline-delivery-gate.md`.

Normal GitHub PR CI **#1184** (run `31296462671`) validated the current implementation with successful dependency installation, virtual-DX7/reconstruction/learned-source audits, typecheck, lint/accessibility, full tests and production build. The protocol-document synchronization PR was merged as `4be483f8c2afd7cbc348e4edc23c16ec02e2a2a7`; the permanent acceptance receipt was then committed on `main`.

The repository-side boundary is therefore re-established after the V15 admission hardening: no hardware PASS is inferred, and no remaining `PLAN.md` checkbox can be completed from repository code or public firmware-version metadata alone.

## Closed non-external roadmap items

### Additional patch provider

The 2026-08-09 follow-up review found no currently admissible provider under the established stable-machine-readable-feed, patch-data rights, provenance and validation criteria. This is now a standing admission policy rather than a permanent unchecked implementation task.

Re-open provider implementation only when a concrete provider satisfies every criterion in `docs/research/additional-patch-providers.md`.

### Optional remote reconstruction accelerator

The local reconstruction path is complete for the current scope: retrieval, constrained CMA-ES, admitted browser-local SpiegeLib initialization, reproducible exact-winner receipts, receipt SHA binding, aggregation and the 2+2+2 evidence runner.

A remote service is not an active implementation/deployment task. Re-open it only if committed closure-ready real-reference evidence demonstrates a material local runtime or quality limitation and the future-service gate in `docs/validation/reconstruction-accelerator-contract.md` is satisfied.

### Current-release FM-1 firmware admission

The production delivery evidence gate now supplies the reviewed V15 firmware baseline when deciding current-release READY. Evidence recorded on another firmware remains usable compatibility evidence when evaluated without a current-release requirement, but it cannot silently satisfy the production current-release gate.

The baseline guard is an evidence-integrity mechanism only. V15 has not been physically validated by this repository, and the prior 2026-08-05 silent edit-buffer observation did not record firmware, so it cannot be attributed to V14, V15 or treated as cross-version behavior.

## Remaining boundary

`PLAN.md` contains only:

1. work requiring physical FM-1 or stock Yamaha DX7 observations, including downstream features that cannot be implemented safely before those semantics are known; and
2. one non-hardware external-evidence item: genuine 2+2+2 real isolated recordings plus structured human listening judgments and the resulting committed evidence artifacts.

The second item is intentionally not auto-closed. Synthetic fixtures, objective metrics or invented listening verdicts are not substitutes for the acceptance evidence defined by `docs/validation/real-reference-benchmark-protocol.md`.

This document does not claim a physical-device pass or a human listening result.
