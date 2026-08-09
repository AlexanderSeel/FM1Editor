# FM-1 official firmware source snapshot

Last reviewed: 2026-08-09

## Primary source

M-VAVE download center:

- https://www.m-vave.com/download

At review time the live official page exposes **two differently labelled FM-1 firmware groupings**:

- **Firmware → FM-1 (Windows): V14 · 2026-07-06**;
- **Firmware → FM-1 (Mac): V14 · 2026-07-06**;
- **PC Firmware → FM-1: V09 · 2026-06-24**.

The page also exposes FM-1 MIDI CONTROL links alongside those firmware listings.

The public page does not explain how the Windows/Mac V14 package label and the separate PC Firmware V09 label map to the firmware identity displayed by the physical FM-1. The repository therefore does **not** choose either value as an inferred device-version baseline.

A previous repository review recorded a V15 / 2026-07-30 PC-firmware baseline. The live official source checked again on 2026-08-09 does not support that claim, so V15 must not be used as the production delivery requirement unless a future official source explicitly publishes it again and that review is recorded.

## Validation policy

Before a new FM-1 physical session:

1. Re-check the official download center and record the FM-1 entries visible at session start.
2. Record the exact firmware identity actually shown by the device in the hardware evidence manifest.
3. Enter that exact expected device firmware into the production delivery evidence gate before assessing current-release READY.
4. Do not derive the device firmware identity from either official download label unless M-VAVE explicitly documents that relationship.
5. Chrome and Edge delivery sessions must use the same exact device firmware, editor commit, Windows build and intended HTTPS origin as required by delivery gate v3.
6. Evidence collected on another firmware remains useful compatibility evidence but must not silently become the current delivery baseline.
7. A newly published firmware package does not itself validate MIDI semantics. Previously blocked live-parameter, bank-readback, completion/ACK and sequencer-transfer features remain blocked until the relevant protocol is documented or physically verified.
8. Do not repeat the two rejected isolated-voice experiments merely because a firmware package changed. They remain disabled unless a documented/verified semantic protocol justifies a new controlled test.

## Current evidence consequence

The 2026-08-05 physical observation that both isolated-voice approaches left the active sound silent did not record firmware. It therefore remains sufficient only to keep those approaches disabled; it cannot establish V09, V14 or cross-version compatibility.

The next physical FM-1 evidence package must record the exact device firmware under test. The delivery gate should compare that explicit identity across Chrome and Edge instead of relying on a static firmware constant derived from the download page.

## Boundary

This document is a public-source snapshot, not physical evidence. It does not claim that V09 or V14 is the version displayed by the hardware, does not infer undocumented protocol behavior from release labels, and does not close any hardware-dependent `PLAN.md` item.
