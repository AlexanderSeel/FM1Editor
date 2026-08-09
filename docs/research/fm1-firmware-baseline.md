# FM-1 official firmware baseline

Last reviewed: 2026-08-09

## Primary source

M-VAVE download center:

- https://www.m-vave.com/download

At review time the live official page exposes two FM-1 firmware groupings:

- **Firmware → FM-1 (Windows/Mac): V14 · 2026-07-06**;
- **PC Firmware → FM-1: V15 · 2026-07-30**.

Both groupings expose the official FM-1 MIDI CONTROL document; the PC Firmware V15 row also exposes the FM-1 release-note link.

The repository treats **V15 (2026-07-30)** as the current reviewed PC-firmware baseline for physical validation. The separate V14 Windows/Mac package is retained as an official distribution-track observation, not interpreted as evidence that V14 and V15 have identical behavior.

## Validation policy

Before a new FM-1 physical session:

1. Re-check the official download center and record the newest FM-1 PC-firmware version/date visible at session start.
2. Record the exact firmware actually shown by the device in the hardware evidence manifest.
3. For current-release delivery evidence, test the newest official PC-firmware baseline unless the evidence package explicitly explains why another version is under test.
4. Evidence collected on an older firmware remains useful compatibility evidence but must not silently become the current delivery baseline.
5. Chrome and Edge delivery sessions must still use the same exact firmware version, editor commit, Windows build and intended HTTPS origin as required by delivery gate v3.
6. A newly published firmware version does not itself validate MIDI semantics. Previously blocked live-parameter, bank-readback, completion/ACK and sequencer-transfer features remain blocked until the relevant protocol is documented or physically verified.
7. Do not repeat the two rejected isolated-voice experiments merely because firmware changed. They remain disabled unless a documented/verified semantic protocol justifies a new controlled test.

## Current evidence consequence

The 2026-08-05 physical observation that both isolated-voice approaches left the active sound silent did not record firmware. It therefore remains sufficient only to keep those approaches disabled; it cannot establish a V14, V15 or cross-version compatibility conclusion.

The next physical FM-1 evidence package should use the current official baseline at test time (V15 as of this review) or explicitly label another firmware as compatibility coverage.

## Boundary

This document is a public-source firmware baseline, not physical evidence. It does not claim that V15 has been installed or tested, does not infer undocumented protocol behavior from the release number, and does not close any hardware-dependent `PLAN.md` item.
