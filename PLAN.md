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

- [ ] Implement only primary-source-verified Yamaha DX7 voice-parameter and function-parameter changes behind the selected DX7 target, with semantic ranges, operation-specific confirmation and tests.
- [ ] Determine from an original Yamaha data-format source whether a stock DX7 supports a programmatic single-voice or bank dump request. Until verified, provide no request frame and require dumps to be initiated from the DX7 front panel.
- [ ] Hardware-validate stock DX7 single-voice edit-buffer reception and destructive 32-voice bank reception, including MIDI channel matching, System Info, Memory Protect guidance and recovery from interrupted transfers.
- [ ] Add hardware validation for later parameter/function operations and any verified dump-request workflow.

## 3. FM-1 USB audio capture and recording

Execute sections A and B of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) and attach sanitized evidence before closing these physical checks.

- [ ] Physically verify that the Windows input endpoint shown as `Microphone (FM-1)` carries the FM-1 synthesizer output over USB, and record firmware, driver, Windows version, sample rate, bit depth, channel count, latency and whether the MASTER control affects the USB stream.
- [ ] Test USB audio capture in Chrome and Edge on Windows with the physical FM-1, including reconnects, device removal, denied permission, silent streams, stereo/dual-mono behavior and concurrent MIDI use.

## 4. Voice library and SysEx explorer

- [ ] Add adapters for additional providers only when they publish stable, permission-compatible machine-readable catalogs.

## 5. Graphical voice editor

- [ ] Add mono/poly, portamento, pitch-bend and performance controls only after the FM-1 support and direct MIDI semantics are hardware-verified.
- [ ] Add opt-in throttled live voice-parameter writes only after the FM-1 semantic parameter map is hardware-verified.

## 6. FM-1 bank/device workflow

Execute sections C and D of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) before enabling completion detection, readback or recovery automation.

- [ ] Confirm the app's bank A/B/C/D and slot-to-preset mapping against the physical device.
- [ ] Add transfer completion detection if the FM-1 exposes an acknowledgement or observable response.
- [ ] Add device backup/restore only if device-originated bank dumps are verified.

## 7. Sequencer

- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.

## 8. Validation and delivery

- [ ] Test the viewport-safe sidebar, bank-merge controls and virtual piano in Chrome and Edge at desktop, tablet and narrow mobile widths.
- [ ] Test Chrome and Edge on Windows with a physical FM-1 over USB MIDI and USB audio, including merged bank import, destination selection, preset recall, recording, note-off recovery and channel selection; test BLE MIDI where browser/platform support permits.
- [ ] Add GitHub Pages deployment after secure-context routing and Web MIDI/Web Audio behavior are verified.
- [ ] Document firmware-specific limitations, recovery steps and tested hardware/browser combinations.
