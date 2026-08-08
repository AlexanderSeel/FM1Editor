# FM-1 physical hardware validation protocol

This protocol records the evidence required to close the hardware-dependent items in `PLAN.md`. A software-only or mocked result must not be marked as a physical pass.

## In-app evidence helper

Open **MIDI monitor → Hardware evidence session** during a physical session. The helper records the test identity, browser/secure-context metadata, audio measurements and explicit PASS/FAIL observations while summarizing the current MIDI monitor capture. It recognizes outgoing standard Yamaha 4,104-byte bank messages and 163-byte single-voice messages by framing/length, but those detections are metadata only and never turn a physical check into a pass.

The MIDI monitor also shows a **Latest SysEx delta** after two same-direction SysEx captures exist. It reports message lengths, common prefix/suffix lengths and changed byte offsets/values. Use it only for controlled one-property-at-a-time comparisons; a changed offset is a candidate field, not proof of its semantic meaning.

For delivery validation, **FM-1 delivery evidence gate v2** retains the validated v1 manifest-completeness checks and adds a hash-bound integrity requirement. The selected Chrome and Edge manifests must still share the same FM-1 firmware, editor commit, Windows build and intended HTTPS origin and must contain the required physical USB-audio, bank, note-off recovery and channel-selection observations. In addition, each exact manifest SHA-256 must be backed by one structurally consistent **Physical evidence package → Export correlation receipt** that uniquely links it to its raw MIDI-monitor export. Chrome and Edge must use distinct manifest hashes and distinct raw-MIDI capture hashes. A v2 READY result is still an evidence-completeness/integrity result only; it does not enable deployment automatically or imply device readback, live-parameter, sequencer, BLE MIDI or virtual-synth validation.

Export the following artifacts whenever MIDI evidence is relevant:

1. **Export JSON** from the MIDI monitor for the raw captured bytes.
2. **Export evidence manifest** from the hardware evidence session for sanitized identity, measurements, result states and MIDI summary counts.
3. Run **Physical evidence package** over the sanitized session files and export the **correlation receipt** after the manifest is uniquely linked to the raw MIDI export.

For the Chrome/Edge delivery prerequisite, keep the manifest, raw MIDI export and correlation receipt from each browser session. Import both hardware manifests and both correlation receipts into **FM-1 delivery evidence gate v2** and export the compact v2 gate receipt. The receipt stores validation results, source filenames and SHA-256 bindings but does not embed imported manifest bodies, raw MIDI events, SysEx or WAV data. The historical v1 evaluator remains embedded as the manifest-completeness layer and cannot by itself make v2 READY.

The hardware manifest intentionally does not duplicate raw SysEx bytes or audio samples. Review tester names, device labels and free-text notes before retaining or committing sanitized evidence.

## Test identity

Record before every session:

- date and tester;
- FM-1 firmware version shown by the device;
- FM1 Editor commit SHA;
- Windows edition and build;
- Chrome or Edge exact version;
- FM-1 USB/MIDI driver name and version, when Windows exposes one;
- USB cable and direct-port/hub topology;
- selected Web MIDI input and output labels;
- selected browser audio-input label;
- MIDI channel, destination bank and target slot/preset.

## A. USB audio endpoint

1. Connect the FM-1 directly over USB and close other applications that may hold the audio endpoint.
2. In Windows sound settings, select `Microphone (FM-1)` and play a sustained FM-1 note.
3. Record whether the Windows input meter moves. A visible endpoint name alone is not a pass.
4. In FM1 Editor, open **FM-1 USB audio**, grant permission and select the same endpoint.
5. Record the browser-reported track label, sample rate, channel count and processing flags.
6. Record ten seconds containing silence, a single sustained note, a chord and a deliberately loud patch.
7. Save WAV, replay it outside the browser and record whether the synthesizer is audible, silent, clipped, stereo, dual-mono or mono.
8. Repeat with MASTER at minimum, midpoint and maximum. Record whether the USB stream level changes.
9. Measure approximate round-trip latency with an audible/transient note and a simultaneous external reference recording when available.

Required results:

| Field | Result |
| --- | --- |
| Windows meter moves | PASS / FAIL |
| Browser meter moves | PASS / FAIL |
| Audible saved WAV | PASS / FAIL |
| Sample rate | value |
| Bit depth of saved WAV | value |
| Browser channel count | value |
| Stereo / dual-mono / mono | value |
| MASTER affects USB level | YES / NO |
| Approximate latency | milliseconds |

## B. Chrome and Edge audio/MIDI resilience

Run the following matrix in both browsers:

- first permission grant;
- denied permission then explicit retry;
- disconnect and reconnect while idle;
- disconnect during recording;
- endpoint removed and restored;
- silent stream detection;
- concurrent Web MIDI note audition;
- concurrent bank transfer only after bank-transfer safety checks pass;
- repeated connect/record/disconnect cycles;
- all media tracks released after disconnect and page navigation;
- note-off/Panic recovery after an intentional held-note or interruption scenario;
- explicit MIDI channel selection with one matching and one deliberately mismatching channel.

For each case record browser, result, visible error/status text, whether MIDI remained usable and whether Windows still showed the endpoint in use after disconnect. Mark **Note-off/Panic recovery** and **MIDI channel selection** separately in the hardware evidence manifest; these checks are required by the delivery evidence gate.

For the Pages/delivery prerequisite, create one complete sanitized manifest in branded Chrome and one in branded Microsoft Edge while running the same editor commit against the same FM-1 firmware and Windows build on the intended HTTPS origin. Each browser manifest must include a captured standard 4,104-byte merged-bank send plus sections A and C evidence. For each browser session export the raw MIDI monitor JSON without changing/clearing the captured session first, then use **Physical evidence package** to create a structurally consistent correlation receipt that binds the exact hardware-manifest SHA-256 to that raw MIDI export SHA-256. Import both manifests and both correlation receipts into **FM-1 delivery evidence gate v2**. Do not treat a single-browser result, origin/commit mismatch, missing correlation receipt, reused raw capture or ambiguous hash binding as delivery-ready.

## C. FM-1 merged 32-voice bank import

Prerequisites:

- export and retain the unchanged recovery bank;
- use a known exact 32-voice base bank;
- make one obvious, reversible edit in one selected slot;
- record all original voice names and the selected destination A/B/C/D;
- keep isolated 163-byte voice transfer and byte-index parameter streams disabled.

Procedure:

1. Start MIDI capture before pressing **Send merged 32-voice bank**.
2. Confirm the app sends one standard 4,104-byte Yamaha bank message.
3. Record whether the FM-1 opens the A/B/C/D destination prompt.
4. Select the same destination bank in the app and device.
5. Wait for the device to finish saving; record all screen states and elapsed time.
6. Recall the computed target preset and audition it.
7. Audition at least three untouched slots, including one before and one after the edited slot.
8. Power-cycle the FM-1 and repeat target and untouched-slot recalls.
9. If any step fails, record whether the recovery bank restores the destination.

A pass requires all of the following:

- destination prompt appeared;
- edited slot is playable and contains the expected edit;
- all 31 untouched voices remain correct;
- slot-to-preset mapping matches the app;
- data survives power cycle;
- interrupted-transfer recovery is understood and reproducible.

## D. Device-originated bank dump and completion signals

1. Capture all MIDI input while initiating every relevant front-panel send/dump operation.
2. Record complete messages, lengths, checksums and device-screen states.
3. Repeat without any app request frame; do not introduce a guessed request.
4. During app-to-device bank transfer, capture any acknowledgement, busy, completion or error response.
5. Repeat with an intentionally disconnected cable only after a recovery bank exists.

Do not implement backup/readback, acknowledgements, retries or completion detection until repeatable message semantics are demonstrated by captures.

## E. FM-1 performance and live-parameter controls

For each candidate mono/poly, portamento, pitch-bend or other performance control:

1. Change exactly one device control while capturing MIDI.
2. Repeat minimum, midpoint and maximum values.
3. Restore the original value and repeat on a second firmware/session.
4. Confirm whether the value is global, per voice, temporary or stored.
5. Confirm that transmitting the captured message reproduces the same behavior without changing unrelated state.

Live parameter writes remain disabled until the semantic map and framing are both verified. Parameter `155` operator state and Yamaha function parameters must remain outside voice payloads.

## F. FM-1 sequencer protocol discovery

Do not send guessed sequencer SysEx. This section is discovery-first and must establish a repeatable device-originated format before any app transfer implementation is enabled.

1. Create a minimal pattern on the FM-1: one active step, fixed note, fixed velocity, no ties/accents/automation where the device permits.
2. Start MIDI capture and exercise every front-panel operation that could plausibly send/export/copy the pattern. Record whether any MIDI or SysEx appears.
3. Change exactly one pattern property at a time—step position, note, velocity, gate/tie, accent, pattern length and tempo where stored in-pattern—and repeat the capture.
4. Use the raw JSON exports as the authoritative capture and the in-app **Latest SysEx delta** as a convenience view. Record message lengths, common prefix/suffix boundaries and candidate changed offsets; confirm every candidate against repeated captures before assigning semantics.
5. Repeat the same source pattern in at least two pattern slots to determine whether slot identity is embedded in the payload or selected separately on the device.
6. If a complete device-originated pattern message is found, capture at least three distinct patterns and verify the framing/checksum rule repeats.
7. Only after a stable format is identified, replay one previously captured unmodified device-originated message to a sacrificial pattern slot and verify exact round-trip behavior.
8. Power-cycle and verify the restored pattern persists as expected.
9. Capture any acknowledgement, busy, completion or error response separately; do not conflate a transport response with pattern payload data.

A protocol is considered stable enough for implementation only when:

- a complete pattern payload boundary is repeatable;
- changed pattern fields produce explainable, repeatable byte changes;
- any checksum/length rule is understood;
- target slot semantics are understood;
- one captured unmodified message round-trips successfully to hardware;
- failure/recovery behavior is documented.

If no device-originated pattern transfer exists, record that negative result across at least two sessions/firmware-identical reconnects and leave app-side internal-pattern transfer disabled.

## Evidence package

Store each completed session under a dated folder outside the application repository until privacy-sensitive device paths and user names are removed. The sanitized evidence package should contain:

- this protocol with results filled in;
- exported hardware evidence manifest;
- MIDI monitor JSON export;
- exported hash-bound physical-evidence correlation receipt for the manifest/raw-MIDI pair;
- original and merged `.syx` files with SHA-256 values;
- saved WAV samples;
- sequencer capture pairs where exactly one pattern property changed;
- exported **v2** delivery evidence gate receipt when validating Chrome/Edge delivery readiness;
- screenshots or a short screen-state timeline;
- exact failure/recovery notes;
- a proposed `PLAN.md` item to close, linked to the evidence.

For a Chrome/Edge delivery proposal, retain both browser manifests, both distinct raw MIDI exports, both correlation receipts and the final v2 gate receipt. A v1 manifest-completeness result, package index or correlation receipt alone is not sufficient to close delivery/Pages readiness.
