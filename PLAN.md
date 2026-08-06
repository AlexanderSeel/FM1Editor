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

- [ ] Add a persistent target selector for `FM-1` and a stock Yamaha `DX7`, with an optional MIDI-port-name suggestion but an explicit manual override before any transmission.
- [ ] Route capabilities and safety messages through the selected target: retain the guarded FM-1 merged 32-voice workflow while enabling only documented Yamaha DX7 single-voice, 32-voice bank, parameter-change, dump-request and function-data operations.
- [ ] Keep documented DX7 voice parameters normalized to their semantic ranges in both modes: values `100–127` remain invalid for parameters defined as `0–99`, and detune `15` remains invalid for the defined `0–14` positions.
- [ ] Preserve the original imported SysEx bytes and record every compatibility normalization so an untouched file can be downloaded exactly as received, while edited or hardware-bound exports use standards-compliant values and a recalculated checksum.
- [ ] Treat DX7 parameter `155` as an edit-session operator enable bitmask only; do not add it to the 155-byte single-voice dump or 128-byte packed bank voice.
- [ ] Separate DX7 function/performance data such as mono/poly, portamento and pitch-bend settings from the 155-byte voice model instead of incorrectly embedding them in voice dumps.
- [ ] Add target-specific tests and hardware validation for stock DX7 receive/send, bank dump requests, MIDI channel handling, memory-protect guidance and recovery from interrupted transfers.

## 3. FM-1 USB audio capture and recording

- [ ] Physically verify that the Windows input endpoint shown as `Microphone (FM-1)` carries the FM-1 synthesizer output over USB, and record firmware, driver, Windows version, sample rate, bit depth, channel count, latency and whether the MASTER control affects the USB stream.
- [ ] Test USB audio capture in Chrome and Edge on Windows with the physical FM-1, including reconnects, device removal, denied permission, silent streams, stereo/dual-mono behavior and concurrent MIDI use.

## 4. Voice library and SysEx explorer

- [ ] Add adapters for additional providers only when they publish stable, permission-compatible machine-readable catalogs.

## 5. Graphical voice editor

- [ ] Add mono/poly, portamento, pitch-bend and performance controls where supported by the FM-1.
- [ ] Add opt-in throttled live parameter writes only after the FM-1 semantic parameter map is hardware-verified.

## 6. FM-1 bank/device workflow

- [ ] Confirm the app's bank A/B/C/D and slot-to-preset mapping against the physical device.
- [ ] Add transfer completion detection if the FM-1 exposes an acknowledgement or observable response.
- [ ] Add device backup/restore only if device-originated bank dumps are verified.

## 7. Sequencer

- [ ] Add octave-oriented note entry, direction modes, copy/paste, rotation and pattern randomization.
- [ ] Add a playhead and timing diagnostics while browser MIDI events are scheduled.
- [ ] Add MIDI clock output at 24 PPQN and selectable internal/external clock behavior.
- [ ] Add pattern chaining and a small song-arrangement view.
- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.
- [ ] Make it more like a step sequencer with a piano-roll layout.
- [ ] Add common presets and patterns for single-note, polyphonic and chord-progression styles based on a starting note.

## 8. Validation and delivery

- [ ] Add legal/public-domain or user-provided SysEx fixtures and broader codec compatibility tests.
- [ ] Add property-based round-trip tests for all valid parameter ranges and preserved reserved bits.
- [ ] Test the viewport-safe sidebar, bank-merge controls and virtual piano in Chrome and Edge at desktop, tablet and narrow mobile widths.
- [ ] Test Chrome and Edge on Windows with a physical FM-1 over USB MIDI and USB audio, including merged bank import, destination selection, preset recall, recording, note-off recovery and channel selection; test BLE MIDI where browser/platform support permits.
- [ ] Add GitHub Pages deployment after secure-context routing and Web MIDI/Web Audio behavior are verified.
- [ ] Document firmware-specific limitations, recovery steps and tested hardware/browser combinations.