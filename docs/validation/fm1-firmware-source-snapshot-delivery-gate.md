# FM-1 firmware-source snapshot and explicit delivery-firmware acceptance

Official source reviewed: **2026-08-09**  
Source: `https://www.m-vave.com/download`  
Validation PR: **#3 — Correct FM-1 firmware source snapshot and fail-closed delivery gate**  
Final PR head: `5fa4995b59eb7b6113f608846972aa3b1cf60e6c`  
Merged to `main`: `db4f3b9fe352b5ecbd966a3fbd71ee578abcf911`

Software acceptance: **SUCCESS**

## Corrected public-source interpretation

At the reviewed official M-VAVE download page, FM-1 is exposed through two differently labelled firmware groupings:

- Windows firmware package: **V14 · 2026-07-06**;
- Mac firmware package: **V14 · 2026-07-06**;
- separate PC Firmware entry: **V09 · 2026-06-24**.

The source does not document how those download labels map to the firmware identity displayed by a physical FM-1. The repository therefore does not select V09 or V14 as an inferred device version and has withdrawn the earlier unsupported static-V15 interpretation.

## Accepted delivery behavior

- `src/validation/fm1FirmwareBaseline.ts` records the reviewed official source snapshot without claiming a device-displayed version.
- Compatibility evaluation may still inspect historical Chrome/Edge evidence without an expected firmware.
- Current-release delivery uses `requireExpectedFirmwareVersion: true` and fails closed unless the tester explicitly provides the exact device firmware expected for that release session.
- When an expected firmware is provided, each selected hardware manifest must match it; Chrome and Edge must also continue to share the same firmware/editor/Windows tuple.
- v2 raw-MIDI correlation and v3 package/WAV/SysEx/observation integrity remain unchanged and compose the v1 result.
- The production delivery panel requires operator-entered device firmware and displays the public source snapshot only as review context; it does not auto-fill or infer the device identity.
- The previous `fm1-firmware-baseline-delivery-gate.md` receipt is retained as historical CI evidence but marked superseded because its V15 external-source interpretation was incorrect.

## Browser-layout hardening discovered during acceptance

The PR browser matrix exposed two pre-existing validation/layout issues while exercising the corrected production build:

1. both FM-1 and DX7 piano instances can remain mounted, so the smoke scripts were updated to scope heading/key assertions to the active visible piano card instead of globally counting duplicate DOM instances;
2. the DX7 function-parameter summary overflowed a 390px Chrome viewport, so `Dx7FunctionControls` now uses shrink/wrapping constraints rather than weakening the viewport assertion.

The final browser run validates those fixes on the same PR head.

## Executed CI evidence

### Normal repository CI

Workflow: **CI #1195**  
Run ID: `31297845775`  
Job: `validate` (`93205731135`)  
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

Workflow: **Browser layout #267**  
Run ID: `31297845785`  
Job: `chrome-edge-layout` (`93205731138`)  
Conclusion: **SUCCESS**

Successful workflow stages:

- project dependency installation;
- production build;
- transient Playwright runner installation;
- desktop/tablet/mobile Chrome and Microsoft Edge layout matrix.

The matrix exercises FM-1 and stock-DX7 target layouts at the repository-defined desktop-wide, desktop-compact, tablet and 390×844 mobile viewports. It is browser/layout evidence only and does not issue a physical FM-1/DX7 hardware PASS.

## Boundary

This acceptance closes the repository-side correctness gap caused by inferring a static device firmware from changing public download metadata. It does **not** establish what firmware any physical FM-1 currently reports, does not validate MIDI/audio behavior on V09 or V14, and does not close any hardware-dependent `PLAN.md` item.
