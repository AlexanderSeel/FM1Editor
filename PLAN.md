# FM1 Editor — unresolved work

## 1. Protocol verification

- [ ] Download and archive the current official FM-1 MIDI-control document in research notes without redistributing restricted binaries.
- [ ] Transcribe the documented parameter addresses, ranges and message framing into typed protocol definitions.
- [ ] Verify whether FM-1 firmware accepts standard Yamaha DX7 32-voice bulk dumps byte-for-byte or requires FM-1-specific framing.
- [ ] Capture real FM-1 input/output traffic for parameter edits, bank imports and bank selection.
- [ ] Determine whether the FM-1 exposes voice-dump requests or only receives dumps.
- [ ] Determine whether sequencer patterns have any undocumented but stable MIDI/SysEx transfer protocol.
- [ ] Record firmware version with every hardware verification.

## 2. Application foundation

- [ ] Create the Vite + React + TypeScript + Tailwind application shell.
- [ ] Add strict TypeScript, linting, tests and production build scripts.
- [ ] Add a browser capability/permission screen for Web MIDI and SysEx.
- [ ] Add resilient MIDI input/output selection and reconnect handling.
- [ ] Add a protocol monitor showing timestamped incoming/outgoing MIDI messages.

## 3. Voice codecs and library

- [ ] Implement Yamaha DX7 155-byte single-voice decoding and encoding.
- [ ] Implement Yamaha DX7 4,104-byte 32-voice bank decoding and encoding with checksum validation.
- [ ] Preserve unknown/reserved bits to avoid destructive round-trips.
- [ ] Add `.syx` drag/drop, file picker and export.
- [ ] Add IndexedDB library storage, metadata, tags, favorites, search and duplicate detection.
- [ ] Add a pluggable online catalog model; do not scrape or redistribute third-party archives without permission.
- [ ] Add explicit source attribution and license metadata per imported patch pack.

## 4. Graphical synth editor

- [ ] Add six-operator overview with algorithm routing and carrier/modulator distinction.
- [ ] Add interactive four-rate/four-level operator envelope graphs.
- [ ] Add pitch envelope editor.
- [ ] Add frequency ratio/fixed mode, detune, output level, scaling, sensitivity and velocity controls.
- [ ] Add algorithm, feedback, oscillator sync, transpose, mono/poly and pitch-bend controls.
- [ ] Add LFO waveform, speed, delay, pitch modulation and amplitude modulation controls.
- [ ] Add undo/redo, A/B comparison, randomization constraints and initialized voice creation.
- [ ] Batch and throttle live parameter writes to avoid overrunning the device.

## 5. Banks and device workflow

- [ ] Add 32-slot bank browser and drag/drop reordering.
- [ ] Add A/B/C/D FM-1 destination workflow with explicit confirmation.
- [ ] Add send progress, cancellation, retry and checksum diagnostics.
- [ ] Add safe backup workflow if device-side dump requests can be verified.
- [ ] Distinguish verified device operations from file-only operations in the UI.

## 6. Sequencer

- [ ] Add local 16-step note, rest, tie, velocity, gate and octave editing.
- [ ] Add tempo, swing, length, direction and transport controls.
- [ ] Save/load sequence projects locally and export/import a documented JSON format.
- [ ] Play sequences through Web MIDI with stable scheduling.
- [ ] Add FM-1 pattern transfer only after protocol verification; otherwise keep it explicitly local/playback-only.

## 7. Validation and delivery

- [ ] Add codec fixture tests with known legal/public-domain or user-provided SysEx files.
- [ ] Add property-based round-trip tests for valid parameter ranges.
- [ ] Test Chrome/Edge on Windows, macOS and Linux where hardware is available.
- [ ] Perform real FM-1 tests for USB MIDI and, where feasible, BLE MIDI.
- [ ] Add GitHub Pages deployment after browser routing and secure-context behavior are verified.
- [ ] Document known firmware-specific limitations and recovery steps.
