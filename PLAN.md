# FM1 Editor — unresolved roadmap

This file contains unresolved or blocked work only. Completed implementation and validation history lives in the linked research/validation documents and Git history. A task is removed only when the repository contains the required implementation plus appropriate validation evidence.

**Current boundary:** repository-side work that can be completed without new external evidence is complete. All remaining items require either physical FM-1/Yamaha DX7 observations or, in section 8, genuine real isolated recordings plus human listening judgments. Conditional future ideas such as additional patch providers and a remote reconstruction accelerator are governed by their admission documents and are not active roadmap tasks unless their documented trigger becomes true.

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

## 4. Graphical voice editor

- [ ] Add mono/poly, portamento, pitch-bend and performance controls for FM-1 only after FM-1 support and direct MIDI semantics are hardware-verified.
- [ ] Add opt-in throttled FM-1 live voice-parameter writes only after the FM-1 semantic parameter map is hardware-verified.

## 5. FM-1 bank/device workflow

Execute sections C and D of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) before enabling completion detection, readback or recovery automation.

- [ ] Confirm the app's bank A/B/C/D and slot-to-preset mapping against the physical device.
- [ ] Add transfer completion detection if the FM-1 exposes an acknowledgement or observable response.
- [ ] Add device backup/restore only if device-originated bank dumps are verified.

## 6. Sequencer

Execute section F of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md). App-side pattern transfer remains disabled until a repeatable device-originated payload boundary, field mapping, checksum/length rule, target-slot semantic and successful captured-message round trip are demonstrated.

- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.

## 7. Validation and delivery

Known limitations, current evidence and conservative recovery procedures are maintained in [`docs/validation/support-matrix-and-recovery.md`](./docs/validation/support-matrix-and-recovery.md). The in-app **FM-1 delivery evidence gate v3** composes three fail-closed integrity layers: v1 checks Chrome/Edge physical-manifest completeness, v2 binds each selected manifest SHA-256 to exactly one structurally consistent raw-MIDI capture SHA-256, and v3 additionally requires one unique FM-1 physical-evidence package index per browser session containing those exact manifest/raw-MIDI hashes plus WAV, SysEx and screenshot-or-notes evidence. Chrome and Edge must use distinct manifest, raw-MIDI, package-index and WAV hashes; the controlled merged-bank SysEx input may legitimately be shared. Software acceptance is recorded in [`docs/validation/fm1-delivery-evidence-integrity.md`](./docs/validation/fm1-delivery-evidence-integrity.md) and [`docs/validation/fm1-delivery-package-integrity.md`](./docs/validation/fm1-delivery-package-integrity.md). None of these integrity layers is a physical PASS.

- [ ] Test Chrome and Edge on Windows with a physical FM-1 over USB MIDI and USB audio, including merged bank import, destination selection, preset recall, recording, note-off recovery and channel selection; test BLE MIDI where browser/platform support permits. For each browser session retain the sanitized hardware manifest, matching raw MIDI export, hash-bound correlation receipt and SHA-indexed FM-1 physical-evidence package containing that exact pair plus WAV, SysEx and screen/recovery evidence; import both complete session sets into delivery gate v3 and commit the READY receipt when the physical matrix is genuinely complete.
- [ ] Enable GitHub Pages deployment only after a committed **v3 READY** delivery evidence receipt records the intended HTTPS origin/firmware/editor/Windows tuple and binds both browser sessions through manifest → raw MIDI → package index, including distinct WAV evidence. Repository-subpath build/PWA/static routing for `/FM1Editor/` is implemented and validated in [`docs/validation/pages-subpath-readiness.md`](./docs/validation/pages-subpath-readiness.md); the delivery-gate implementation itself does not satisfy the physical prerequisite or enable deployment automatically.

## 8. Audio-to-FM real-reference evidence

The Audio → FM reconstruction implementation itself is complete for the current local scope: retrieval supplies seeds, deterministic CMA-ES reconstructs DX7-compatible patches, the admitted local SpiegeLib initializer supplies the third comparison path, exact benchmark winners are retained for reproducible audition, exact receipt bytes are SHA-bound into the aggregate, and the validated 2+2+2 runner exports the final evidence set. See [`docs/validation/primary-sound-recreation-ui.md`](./docs/validation/primary-sound-recreation-ui.md), [`docs/validation/real-reference-reproducible-listening.md`](./docs/validation/real-reference-reproducible-listening.md), [`docs/validation/real-reference-receipt-integrity.md`](./docs/validation/real-reference-receipt-integrity.md) and [`docs/validation/real-reference-2x2x2-runner.md`](./docs/validation/real-reference-2x2x2-runner.md).

- [ ] Run the current three-way benchmark on the genuine 2+2+2 isolated-sound set defined by [`docs/validation/real-reference-benchmark-protocol.md`](./docs/validation/real-reference-benchmark-protocol.md), retain poor/failure cases, complete the structured retrieval/CMA and learned **human listening** assessments, and commit the six exact winner-bearing per-reference receipt JSON files plus the unmodified aggregate JSON and generated closure Markdown/SHA-256 evidence. This is external real-audio/listening evidence rather than missing repository implementation; it cannot be replaced by synthetic fixtures, objective metrics, or fabricated listening verdicts.

Additional provider admission is a standing policy in [`docs/research/additional-patch-providers.md`](./docs/research/additional-patch-providers.md); the 2026-08-09 review found no currently admissible provider, so there is no active adapter task. A remote reconstruction service is likewise not active work: [`docs/validation/reconstruction-accelerator-contract.md`](./docs/validation/reconstruction-accelerator-contract.md) re-opens that path only if committed real-reference evidence later demonstrates a material limitation of the local implementation.

## 9. Virtual DX7 / FM-1-inspired synthesizer

The virtual engine must be described as DX7-compatible and FM-1-inspired until physical comparison proves stronger equivalence.

- [ ] After physical USB audio is verified, record controlled dry/effected FM-1 samples by firmware and document measured differences without silently changing Yamaha-compatible file semantics.
