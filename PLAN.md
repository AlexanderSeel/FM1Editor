# FM1 Editor — unresolved work

## 1. FM-1 protocol verification

- [ ] Record the tested FM-1 firmware version for the observed silent edit buffer after both rejected single-voice approaches; keep isolated Yamaha voice dumps and byte-index parameter streams disabled.
- [ ] Verify on physical FM-1 hardware that the merged standard Yamaha DX7 32-voice dump opens the A/B/C/D destination prompt, preserves the other 31 voices from the loaded base bank and produces a playable target preset.
- [ ] Capture FM-1 MIDI traffic and device-screen behavior for bank imports, destination confirmation, preset recall and any device-originated dump request.
- [ ] Determine whether the FM-1 can transmit complete voice banks; otherwise retain the explicit requirement for an exact app-side base/backup bank.
- [ ] Derive and verify the semantic meaning of FM-1 parameter IDs 0–155 before enabling any individual live voice edits.
- [ ] Determine whether sequencer patterns expose a stable MIDI/SysEx dump and restore protocol.
- [ ] Add bank-transfer timeout, retry and post-save recovery guidance after physical import behavior is verified.

## 2. Voice library and SysEx explorer

- [ ] Add adapters for additional providers only when they publish stable, permission-compatible machine-readable catalogs.

## 3. Graphical voice editor

- [ ] Add mono/poly, portamento, pitch-bend and performance controls where supported by the FM-1.
- [ ] Add constrained randomization, mutation, initialized-voice variants and A/B comparison inside the editor.
- [ ] Add opt-in throttled live parameter writes only after the FM-1 semantic parameter map is hardware-verified.

## 4. FM-1 bank/device workflow

- [ ] Confirm the app's bank A/B/C/D and slot-to-preset mapping against the physical device.
- [ ] Add transfer completion detection if the FM-1 exposes an acknowledgement or observable response.
- [ ] Add device backup/restore only if device-originated bank dumps are verified.

## 5. Sequencer

- [ ] Add octave-oriented note entry, direction modes, copy/paste, rotation and pattern randomization.
- [ ] Add a playhead and timing diagnostics while browser MIDI events are scheduled.
- [ ] Add MIDI clock output at 24 PPQN and selectable internal/external clock behavior.
- [ ] Add pattern chaining and a small song-arrangement view.
- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.
- [ ] Make it more like a step sequencer with a piano-roll layout.
- [ ] Add common presets and patterns for single-note, polyphonic and chord-progression styles based on a starting note.

## 6. Validation and delivery

- [ ] Add legal/public-domain or user-provided SysEx fixtures and broader codec compatibility tests.
- [ ] Add property-based round-trip tests for all valid parameter ranges and preserved reserved bits.
- [ ] Test the viewport-safe sidebar, bank-merge controls and virtual piano in Chrome and Edge at desktop, tablet and narrow mobile widths.
- [ ] Test Chrome and Edge on Windows with a physical FM-1 over USB MIDI, including merged bank import, destination selection, preset recall, note-off recovery and channel selection; test BLE MIDI where browser/platform support permits.
- [ ] Add GitHub Pages deployment after secure-context routing and Web MIDI behavior are verified.
- [ ] Document firmware-specific limitations, recovery steps and tested hardware/browser combinations.
