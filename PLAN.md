# FM1 Editor — unresolved work

## 1. FM-1 protocol verification

- [ ] Record the tested FM-1 firmware version for the observed silent edit buffer after both rejected single-voice approaches; keep isolated Yamaha voice dumps and byte-index parameter streams disabled.
- [ ] Verify on physical FM-1 hardware that the merged standard Yamaha DX7 32-voice dump opens the A/B/C/D destination prompt, preserves the other 31 voices from the loaded base bank and produces a playable target preset.
- [ ] Capture FM-1 MIDI traffic and device-screen behavior for bank imports, destination confirmation, preset recall and any device-originated dump request.
- [ ] Determine whether the FM-1 can transmit complete voice banks; otherwise retain the explicit requirement for an exact app-side base/backup bank.
- [ ] Use the original Yamaha DX7 data-format table as the baseline semantic map: voice parameters `0–154`, plus edit-only operator on/off parameter `155` as a six-operator bitmask; hardware-verify the FM-1 SysEx framing and behavior before enabling any individual live edit writes.
- [ ] Determine whether sequencer patterns expose a stable MIDI/SysEx dump and restore protocol.
- [ ] Add bank-transfer timeout, retry and post-save recovery guidance after physical import behavior is verified.

## 2. Device target modes

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

- [ ] Execute typecheck, lint, the full test suite, production build and the permanent Chrome/Edge FM-1 + DX7 responsive matrices successfully on the same source commit. [`docs/validation/current-software-browser-gate.md`](./docs/validation/current-software-browser-gate.md) records that the Ubuntu software job passed for `ffb582b5245d5de6cffbeaf3cceac212dce04f1a` while the Windows Chrome/Edge job failed, so the overall gate remains open.
- [ ] Test Chrome and Edge on Windows with a physical FM-1 over USB MIDI and USB audio, including merged bank import, destination selection, preset recall, recording, note-off recovery and channel selection; test BLE MIDI where browser/platform support permits.
- [ ] Add GitHub Pages deployment after secure-context routing and Web MIDI/Web Audio behavior are verified.

## 9. Audio-to-FM sound reconstruction

The staged technical decision and reviewed libraries/research are documented in [`docs/research/audio-to-fm-and-virtual-synth.md`](./docs/research/audio-to-fm-and-virtual-synth.md).

- [ ] Add local WAV/MP3 upload with region selection, duration/size limits, silence trimming, mono analysis, pitch detection with manual override, normalization controls, content hashes and explicit privacy status.
- [ ] Implement reproducible audio descriptors for both references and virtual renders: amplitude envelope, multi-resolution STFT/mel spectrum, MFCCs, spectral centroid, rolloff and flatness.
- [ ] Implement nearest-preset retrieval by rendering and indexing eligible voices from the existing DX7 catalog at standardized notes/velocities, then return several ranked candidates with dry A/B playback and explicit load actions.
- [ ] Add a descriptor cache and standardized render-index workflow around the validated deterministic local renderer so matching does not depend on physical FM-1 hardware or real-time playback timing.
- [ ] Implement cancellable, repeatable evolutionary/CMA-ES refinement starting from the best catalog candidates and operating only on legal semantic `Dx7Voice` fields; begin with constrained parameter groups before attempting the full search space.
- [ ] Compare retrieval-only, evolutionary and learned-initialization approaches using synthetic ground-truth patches and real isolated sounds; report similarity metrics, runtime and failure cases rather than promising exact reconstruction.
- [ ] Reproduce and license-audit Sound2Synth, SpiegeLib/Dexed sound matching, DDX7 and related DDSP approaches before using code, weights, datasets or preprocessing in production.
- [ ] Add optional server/Python acceleration only behind explicit upload consent, documented retention/deletion, model/version metadata and a fully local fallback for normal editing and audition.
- [ ] Return multiple editable candidates with semantic parameter diffs, source initialization, metric breakdown, `.syx` export and optional FM-1-inspired FX state; never auto-send a generated patch to hardware.

## 10. Virtual DX7 / FM-1-inspired synthesizer

The virtual engine must be described as DX7-compatible and FM-1-inspired until physical comparison proves stronger equivalence. The audited deterministic offline renderer, explicit local preview, 16-voice stateful AudioWorklet, deterministic allocation/stealing, local DX7-style pitch bend/modulation/sustain/aftertouch and internal-clock browser sequencer routing are software/browser-validated. Evidence is recorded in [`docs/research/virtual-dx7-renderer-feasibility-spike.md`](./docs/research/virtual-dx7-renderer-feasibility-spike.md), [`docs/validation/msfa-audioworklet-ten-minute-soak.md`](./docs/validation/msfa-audioworklet-ten-minute-soak.md), [`docs/validation/msfa-audioworklet-polyphony.md`](./docs/validation/msfa-audioworklet-polyphony.md), [`docs/validation/msfa-performance-package.md`](./docs/validation/msfa-performance-package.md), [`docs/validation/local-virtual-preview-combined-acceptance.md`](./docs/validation/local-virtual-preview-combined-acceptance.md) and [`docs/validation/local-sequence-ui-browser.md`](./docs/validation/local-sequence-ui-browser.md).

- [ ] Add direct local audition actions for catalog/library voices without first loading them into the editor; keep audition, load and hardware transmission as distinct user actions.
- [ ] Add an external-MIDI-clock-to-local-audio route only through a separately validated input-clock scheduler; current local sequence playback intentionally supports internal BPM clock only.
- [ ] Evaluate Synth_Dexed and `dx7-synth-js` as implementation references or fallbacks only after branch-level license, compatibility, missing-parameter and maintenance audits.
- [ ] Implement a separate FM-1-inspired effect graph for documented CC `0–23`: filter, reverb, delay, distortion, chorus and phaser, using native Web Audio and/or audited MIT-licensed Tone.js components.
- [ ] Reuse `Fm1FxState` and the documented value ranges, but keep dry bypass and clearly state that effect algorithms, internal scaling, routing order, stereo behavior and headroom are not known to match physical FM-1 firmware.
- [ ] Add a Virtual FM-1 preview target with local-audio enable, dry/FX toggle, master gain, limiter, polyphony/CPU diagnostics, current voice/effect synchronization, note/chord WAV rendering and uploaded-reference A/B comparison.
- [ ] Add deterministic render regression tests, effect-isolation tests, integrated AudioWorklet underrun/error checks and Chrome/Edge performance limits as the renderer expands beyond the accepted dry performance-control core.
- [ ] After physical USB audio is verified, record controlled dry/effected FM-1 samples by firmware and document measured differences without silently changing Yamaha-compatible file semantics.
