# FM1 Editor — unresolved work

## 1. FM-1 protocol verification

- [ ] Record the firmware version and reproduce/recover the observed silent edit buffer caused by an isolated Yamaha DX7 single-voice dump; keep that transport disabled.
- [ ] Verify whether the paced 0–154 FM-1 parameter stream recreates a selected voice correctly and remains playable after all writes complete.
- [ ] Verify on physical FM-1 hardware whether standard Yamaha DX7 32-voice bulk dumps are accepted byte-for-byte and document the tested firmware version.
- [ ] Capture FM-1 MIDI traffic for live parameter edits, program changes, paced parameter streams, bank imports and A/B/C/D destination selection.
- [ ] Derive and verify the semantic meaning of FM-1 parameter IDs 0–155; keep byte-index live editing experimental until proven.
- [ ] Determine whether the FM-1 can transmit voice dumps or only receive them.
- [ ] Determine whether sequencer patterns expose a stable MIDI/SysEx dump and restore protocol.
- [ ] Add cancellation and retry around the paced parameter stream and long bank transfers; preset recall and progress are implemented.

## 2. Application foundation

- [ ] Add application-level undo/redo and unsaved-change protection.
- [ ] Add installable PWA metadata and offline application caching.

## 3. Voice library and SysEx explorer

- [ ] Add adapters for additional providers only when they publish stable, permission-compatible machine-readable catalogs.
- [ ] Add a catalog release audit that records source hashes, changed files and unresolved rights metadata before deployment.

## 4. Graphical voice editor

- [ ] Add graphical algorithm routing with carrier/modulator distinction and operator enable/solo controls.
- [ ] Make operator and pitch envelopes directly draggable while retaining numeric precision controls.
- [ ] Add keyboard-scaling depth controls and visual scaling curves.
- [ ] Add mono/poly, portamento, pitch-bend and performance controls where supported by the FM-1.
- [ ] Add constrained randomization, mutation, initialized-voice variants and A/B comparison inside the editor.
- [ ] Add opt-in throttled live parameter writes after the parameter map is hardware-verified.

## 5. FM-1 bank/device workflow

- [ ] Add A/B/C/D destination selection with explicit destructive-operation confirmation.
- [ ] Add transfer progress, checksum diagnostics, retry and cancellation.
- [ ] Add backup/restore only if device-originated dumps are verified.
- [ ] Keep verified operations visually distinct from experimental or file-only operations.

## 6. Sequencer

- [ ] Add octave-oriented note entry, direction modes, copy/paste, rotation and pattern randomization.
- [ ] Add a playhead and timing diagnostics while browser MIDI events are scheduled.
- [ ] Add MIDI clock output at 24 PPQN and selectable internal/external clock behavior.
- [ ] Add pattern chaining and a small song-arrangement view.
- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.
- [ ] Make it more like a step sequencer with a pianoroll layout
- [ ] Add common presets/patterns to select single/poly styles like chrod progression based on a starting note

## 7. Validation and delivery

- [ ] Add legal/public-domain or user-provided SysEx fixtures and broader codec compatibility tests.
- [ ] Add property-based round-trip tests for all valid parameter ranges and preserved reserved bits.
- [ ] Test the viewport-safe sidebar and virtual piano in Chrome and Edge at desktop, tablet and narrow mobile widths.
- [ ] Test Chrome and Edge on Windows with a physical FM-1 over USB MIDI, including voice push, note-off recovery and channel selection; test BLE MIDI where browser/platform support permits.
- [ ] Add GitHub Pages deployment after secure-context routing and Web MIDI behavior are verified.
- [ ] Document firmware-specific limitations, recovery steps and tested hardware/browser combinations.
