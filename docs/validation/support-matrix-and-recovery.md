# Support matrix, known limitations and recovery guide

Last reviewed: 2026-08-08

This document distinguishes application implementation, software validation and physical-device verification. A feature appearing in the UI is not evidence that an FM-1 or Yamaha DX7 accepted it.

## Status definitions

- **Implemented**: source code and UI exist in the repository.
- **Software-validated**: deterministic tests, mocked browser APIs or an automated browser matrix have produced recorded evidence for the applicable commit.
- **Physically verified**: repeatable behavior was observed on named hardware with firmware, operating system, browser, connection topology and MIDI/audio settings recorded.
- **Blocked**: the required device protocol, data rights or physical evidence does not currently exist.

## Current support matrix

| Area | Implementation status | Evidence status | Current boundary |
| --- | --- | --- | --- |
| DX7 `.syx` single-voice and 32-voice parsing/export | Implemented | Covered by codec, checksum, semantic-range, original-import and synthetic-fixture tests recorded elsewhere under `docs/validation/` | File processing does not prove reception by a physical synthesizer. |
| Local voice library, JSON backup and catalog browsing | Implemented | Library and catalog tests exist; the tracked ZIP has a recorded hash and content audit | Third-party patch ownership varies. Additional providers require explicit data-use permission and stable machine-readable access. |
| MIDI notes, Program Change, Clock, Start, Continue, Stop and All Notes Off | Implemented | Message encoders and application routing are software-testable | Correct physical response still depends on selected output, channel and device configuration. |
| Browser sequencer | Implemented | Local scheduling, piano-roll operations, loop state and JSON project behavior have tests | The sequencer controls external MIDI only. It does not read or write FM-1 internal patterns. Section F of the physical protocol now defines discovery evidence required before that boundary can change. |
| FM-1 documented FX CC `0–23` | Implemented | Range and encoding logic are software-testable | Physical behavior and firmware differences are not fully recorded. The FX channel is separate from the note channel. |
| FM-1 merged 32-voice bank workflow | Implemented and guarded | Bank construction and preservation of the other 31 app-side voices are software-testable | Destination prompt, A/B/C/D mapping, save completion, persistence and recovery remain physically unverified. |
| FM-1 isolated single-voice transfer | Disabled | Two physical attempts on 2026-08-05 left the active sound silent | Firmware was not recorded. Standard 163-byte voice dumps and guessed DX7-byte-to-FM-1-parameter streams must remain disabled. |
| FM-1 individual voice-parameter writes | Blocked | The official frame exists, but no semantic parameter table is published | Do not infer FM-1 meanings from DX7 unpacked byte offsets. |
| FM-1 device backup/readback | Blocked | No supported bank-request or repeatable device-originated dump workflow is known | The app requires an exact app-side base or recovery bank. |
| FM-1 internal sequence transfer | Blocked | No stable pattern dump/restore protocol is known | Use the local `.fm1seq.json` project format and external MIDI playback only; physical protocol section F is discovery-only and does not authorize guessed pattern messages. |
| Yamaha DX7 single-voice and 32-voice bulk send | Implemented and guarded | Message construction and application safety routing are software-testable; a dedicated stock-DX7 physical protocol and target-specific evidence manifest are repository-owned | Reception, interrupted-transfer behavior and recovery remain physically unverified on a stock DX7. |
| Yamaha DX7 voice parameters `0–155` | Implemented and guarded | Semantic mapping, ranges, diffing and frame construction have tests; physical test coverage is specified in `dx7-hardware-test-protocol.md` | Hardware reception, operator-mask behavior and throttled live editing require a stock DX7 test. |
| Yamaha DX7 function parameters `64–77` | Implemented and guarded | Yamaha group-2 frame construction and semantic ranges have tests; physical test coverage is specified in `dx7-hardware-test-protocol.md` | Mono/poly, bend, portamento and controller-assignment behavior require a stock DX7 test. |
| Yamaha DX7 programmatic dump request | Not implemented | Yamaha's reviewed MIDI Data Format defines bulk transmission/reception but no stock-DX7 request frame | Initiate outgoing voice or bank dumps from the DX7 front panel. |
| Browser-local audio recording | Implemented | Media behavior is validated with mocked browser APIs | `Microphone (FM-1)` is only an endpoint label until audible FM-1 synthesis is recorded from physical hardware. |
| Chrome/Edge responsive layouts | Permanent FM-1 and DX7 matrices implemented | Same-source Windows receipt is **SUCCESS** in `docs/validation/current-software-browser-gate.md`: Chrome and Edge pass FM-1/DX7 at 1440×900, 1024×768 and 390×844 touch emulation | This is layout/browser evidence only; the smoke intentionally issues no MIDI requests and does not validate physical MIDI/audio. |
| BLE MIDI | No verified support claim | No recorded browser/platform/device matrix | Test only where the operating system and Chromium Web MIDI implementation expose the BLE device. |
| GitHub Pages deployment | Build/routing readiness plus a deterministic physical-evidence gate are implemented; deployment remains disabled | `/FM1Editor/` subpath/PWA/static routing is software-validated, and the in-app delivery gate can verify matching sanitized Chrome+Edge FM-1 manifests for one HTTPS origin/firmware/editor/Windows tuple | Do not treat Pages as delivery-ready until the gate is READY from real physical sessions on the intended HTTPS origin. A READY gate still does not enable deployment automatically. |
| Physical evidence capture and protocol discovery helpers | Implemented | Raw MIDI JSON, FM-1 and stock-DX7 sanitized evidence manifests, structural latest-SysEx byte deltas and an FM-1 Chrome/Edge delivery evidence gate are available in the MIDI monitor | No helper converts traffic patterns, outgoing message structure or software validation into hardware PASS results or protocol semantics. |

## Recorded hardware and browser combinations

### M-VAVE FM-1

The only recorded physical observation is from 2026-08-05:

- standard Yamaha 163-byte single-voice transfer: active sound became silent;
- 155 paced FM-1 parameter writes populated from DX7 unpacked byte offsets: active sound became silent;
- FM-1 firmware version: **not recorded**;
- Windows, browser, cable topology and driver versions: **not recorded in sufficient detail**.

This observation is enough to keep both methods disabled, but not enough to define a firmware compatibility rule.

### Yamaha DX7

No stock Yamaha DX7 hardware combination is recorded as physically verified. Use `docs/validation/dx7-hardware-test-protocol.md` and the in-app **Stock DX7 hardware evidence session** for the first evidence package.

### Browser layout automation

The recorded same-source Windows browser gate passed for installed Google Chrome and Microsoft Edge, for both FM-1 and DX7 targets, at:

- `1440 × 900` desktop;
- `1024 × 768` narrow desktop;
- `390 × 844` mobile touch emulation.

The receipt also records successful audit, typecheck, lint, full tests and production build from the same checkout. It is not physical MIDI/audio evidence.

## Recovery playbooks

### 1. Stuck or sustained MIDI notes

1. Press **Panic** or **All Notes Off** on the same MIDI channel used for audition or sequencing.
2. Stop the sequencer explicitly.
3. Verify that the selected MIDI output and channel have not changed.
4. When notes remain held, disconnect and reconnect the MIDI output, then send Panic again.
5. Record the MIDI monitor export when the problem is repeatable.

Do not treat closing a panel as a reliable note-off mechanism. The sequencer is intentionally kept mounted while switching workspaces.

### 2. Sequencer continues while another workspace is open

This is expected during loop playback.

1. Return to **Sequencer** and press **Stop** to end the internal scheduler.
2. Use **Panic** when a receiving device still holds notes.
3. Use the Live MIDI **Stop** control only when the external device also needs a MIDI real-time Stop message.
4. After changing output or target, confirm playback state before resuming.

### 3. Web MIDI or SysEx permission is lost

1. Stop sequencing and send Panic when the old output is still available.
2. Reconnect Web MIDI with SysEx permission.
3. Manually reselect and verify the intended input and output; persisted names are hints, not proof of device identity.
4. Verify the target mode and MIDI channel before any Program Change, parameter or bank operation.
5. Repeat all destructive-operation confirmations.

The application must not silently resume a pending bank or parameter transfer after reconnection.

### 4. Audio permission, endpoint or recording is lost

1. Stop the current recording if the UI still permits it.
2. Disconnect the browser audio input so media tracks are released.
3. Restore the endpoint or browser site permission.
4. Use **Allow and connect input** again and manually verify the selected device label.
5. Confirm meter movement before recording important material.
6. Save completed recordings before refreshing or navigating away; recordings remain in memory until explicitly saved.
7. Keep speaker monitoring disabled unless feedback risk has been assessed.

An FM-1-labelled endpoint with no meter movement or audible WAV is a failed physical-audio test.

### 5. FM-1 becomes silent after an edit or transfer attempt

1. Do not retry the disabled isolated-voice or guessed parameter-stream methods.
2. Send All Notes Off, then recall a known preset with documented Program Change.
3. Audition a normal note and record the device screen and MIDI monitor state.
4. Do not claim that a whole-bank recovery is safe until the merged-bank and recovery procedure has been physically verified for the exact firmware.
5. Record the firmware version before any further protocol experiment.

The currently known software-side recovery is preset recall and normal note testing. A verified edit-buffer reset command is not known.

### 6. FM-1 bank transfer is interrupted or completion is unclear

1. Do not automatically retry or send another bank.
2. Preserve the unchanged base/recovery bank and the exact merged bank with hashes.
3. Record the FM-1 screen state, elapsed time, destination selection and MIDI monitor traffic.
4. Manually inspect the target slot and several untouched slots only after the device returns to an idle state.
5. Treat the destination as unknown when save completion was not observed.
6. Restore a recovery bank only under the physical protocol in `fm1-hardware-test-protocol.md`; that recovery path is not yet certified.

No timeout, acknowledgement, retry or completion-detection behavior should be inferred without repeatable captures.

### 7. Yamaha DX7 bulk or parameter operation fails

1. Stop notes and send All Notes Off.
2. Record the selected output, MIDI channel, System Info state and Memory Protect state.
3. Do not assume that a failed 32-voice transfer left the internal bank unchanged.
4. Initiate backups and outgoing dumps from the DX7 front panel; the app has no programmatic dump-request frame.
5. Restore only from a known backup and verify all 32 voices using `dx7-hardware-test-protocol.md`.
6. Lock voice/function writes in the app before changing ports, channels or device settings.

Memory Protect should be disabled only for the intended operation and restored according to the DX7 operating procedure afterward.

### 8. Imported SysEx is malformed or produces unexpected values

1. Download or retain the exact original import before editing.
2. Review message offsets, manufacturer, format, length and checksum diagnostics.
3. Distinguish rejected structure from compatibility normalization.
4. Do not send unsupported or checksum-invalid messages to hardware through the normal guarded workflow.
5. Export edited data only from the semantic model, which recalculates standards-valid payloads and checksums.

Legacy breakpoint `127` and detune `15` are normalized only at the import boundary and are reported explicitly.

### 9. Catalog synchronization or provider access fails

1. Keep using the tracked `public/catalog/sysexFinal.zip`; runtime must not substitute an arbitrary remote ZIP.
2. Treat the Yamaha Black Boxes mirror as optional when the provider is unavailable.
3. Verify hashes and file formats before exposing newly synchronized banks.
4. Do not add a provider without the admission review in `docs/research/additional-patch-providers.md`.

## Evidence required to change a physical status

For FM-1 use `docs/validation/fm1-hardware-test-protocol.md`; for stock DX7 use `docs/validation/dx7-hardware-test-protocol.md`. Record at minimum:

- date, tester and application commit;
- exact device and firmware/ROM identity where available;
- Windows, browser and driver versions;
- direct USB or hub/cable topology;
- selected MIDI/audio endpoint labels and channels;
- original and transmitted files with SHA-256 hashes;
- raw MIDI monitor JSON export;
- the matching sanitized in-app FM-1 or stock-DX7 evidence manifest;
- the exported FM-1 delivery evidence gate receipt when proposing the Chrome/Edge delivery or Pages prerequisite complete;
- device-screen timeline;
- audible recordings where audio is involved;
- exact recovery result after an intentional or observed failure.

A screenshot of an endpoint name, a successful software build, a structural SysEx delta, a delivery-gate implementation or an emitted MIDI frame is not physical-device verification.
