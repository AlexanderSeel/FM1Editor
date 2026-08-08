# FM1 Editor — unresolved roadmap

This file contains unresolved or blocked work only. Completed implementation and validation history lives in the linked research/validation documents and Git history. A task is removed only when the repository contains the required implementation plus appropriate validation evidence; physical-device tasks remain here until physical evidence exists.

## 1. FM-1 protocol verification

Use [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) and the validated in-app MIDI-monitor hardware evidence recorder before proposing closure of any physical FM-1 item.

- [ ] Record the tested FM-1 firmware version for the observed silent edit buffer after both rejected single-voice approaches; keep isolated Yamaha voice dumps and byte-index parameter streams disabled.
- [ ] Verify on physical FM-1 hardware that the merged standard Yamaha DX7 32-voice dump opens the A/B/C/D destination prompt, preserves the other 31 voices from the loaded base bank and produces a playable target preset.
- [ ] Capture FM-1 MIDI traffic and device-screen behavior for bank imports, destination confirmation, preset recall and any device-originated dump request.
- [ ] Determine whether the FM-1 can transmit complete voice banks; otherwise retain the explicit requirement for an exact app-side base/backup bank.
- [ ] Use the original Yamaha DX7 data-format table as the baseline semantic map: voice parameters `0–154`, plus edit-only operator on/off parameter `155` as a six-operator bitmask; hardware-verify the FM-1 SysEx framing and behavior before enabling any individual live edit writes.
- [ ] Determine whether sequencer patterns expose a stable MIDI/SysEx dump and restore protocol.
- [ ] Add bank-transfer timeout, retry and post-save recovery guidance after physical import behavior is verified.

## 2. Device target modes

Execute [`docs/validation/dx7-hardware-test-protocol.md`](./docs/validation/dx7-hardware-test-protocol.md) against a stock Yamaha DX7 and attach sanitized captures before closing either target-mode item.

- [ ] Hardware-validate stock DX7 single-voice edit-buffer reception and destructive 32-voice bank reception, including MIDI channel matching, System Info, Memory Protect guidance and recovery from interrupted transfers.
- [ ] Hardware-validate guarded voice parameters `0–155` and function parameters `64–77` on a stock DX7, including operator mask, live-change throttling, mono/poly, pitch bend, portamento and controller assignments. No programmatic dump-request frame is constructed because Yamaha's original MIDI Data Format documents none.

## 3. FM-1 USB audio capture and recording

Execute sections A and B of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) and attach sanitized evidence before closing these physical checks.

- [ ] Physically verify that the Windows input endpoint shown as `Microphone (FM-1)` carries the FM-1 synthesizer output over USB, and record firmware, driver, Windows version, sample rate, bit depth, channel count, latency and whether the MASTER control affects the USB stream.
- [ ] Test USB audio capture in Chrome and Edge on Windows with the physical FM-1, including reconnects, device removal, denied permission, silent streams, stereo/dual-mono behavior and concurrent MIDI use.

## 4. Voice library and SysEx explorer

- [ ] Add adapters for additional providers only when they publish stable, permission-compatible machine-readable catalogs. The 2026-08-06 review found no eligible provider; apply the admission criteria in [`docs/research/additional-patch-providers.md`](./docs/research/additional-patch-providers.md) before implementing one.

## 5. Graphical voice editor

- [ ] Add mono/poly, portamento, pitch-bend and performance controls for FM-1 only after FM-1 support and direct MIDI semantics are hardware-verified.
- [ ] Add opt-in throttled FM-1 live voice-parameter writes only after the FM-1 semantic parameter map is hardware-verified.

## 6. FM-1 bank/device workflow

Execute sections C and D of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) before enabling completion detection, readback or recovery automation.

- [ ] Confirm the app's bank A/B/C/D and slot-to-preset mapping against the physical device.
- [ ] Add transfer completion detection if the FM-1 exposes an acknowledgement or observable response.
- [ ] Add device backup/restore only if device-originated bank dumps are verified.

## 7. Sequencer

- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.

## 8. Validation and delivery

Known limitations, current evidence and conservative recovery procedures are maintained in [`docs/validation/support-matrix-and-recovery.md`](./docs/validation/support-matrix-and-recovery.md).

- [ ] Test Chrome and Edge on Windows with a physical FM-1 over USB MIDI and USB audio, including merged bank import, destination selection, preset recall, recording, note-off recovery and channel selection; test BLE MIDI where browser/platform support permits.
- [ ] Enable GitHub Pages deployment only after the physical Chrome/Edge FM-1 secure-context test records Web MIDI/SysEx and USB/Web Audio behavior on the intended HTTPS deployment. Repository-subpath build/PWA/static routing for `/FM1Editor/` is implemented and validated in [`docs/validation/pages-subpath-readiness.md`](./docs/validation/pages-subpath-readiness.md); do not publish before the hardware/browser prerequisite is satisfied.

## 9. Audio-to-FM sound reconstruction

The staged technical decision and reviewed libraries/research are documented in [`docs/research/audio-to-fm-and-virtual-synth.md`](./docs/research/audio-to-fm-and-virtual-synth.md).

- [ ] Run the implemented benchmark on the real 2+2+2 isolated-sound set defined by [`docs/validation/real-reference-benchmark-protocol.md`](./docs/validation/real-reference-benchmark-protocol.md), import the exported receipts into the evidence-set aggregator, complete listening assessments and commit the aggregate hash/metrics/runtime evidence. Synthetic ground-truth comparison, real-reference receipts and aggregate validation are implemented; learned initialization remains explicitly unavailable until a separately license-admitted implementation/checkpoint exists.
- [ ] Implement and deploy an optional reconstruction accelerator only if committed real-reference benchmark receipts demonstrate a material runtime/quality need or a separately license-admitted learned initializer becomes available. The disabled-by-default client boundary, capability/policy validation, one-shot SHA-bound consent, bounded automatic-deletion receipt enforcement, returned DX7 validation and fully local fallback are implemented; any service must satisfy [`docs/validation/reconstruction-accelerator-contract.md`](./docs/validation/reconstruction-accelerator-contract.md).

## 10. Virtual DX7 / FM-1-inspired synthesizer

The virtual engine must be described as DX7-compatible and FM-1-inspired until physical comparison proves stronger equivalence.

- [ ] After physical USB audio is verified, record controlled dry/effected FM-1 samples by firmware and document measured differences without silently changing Yamaha-compatible file semantics.
