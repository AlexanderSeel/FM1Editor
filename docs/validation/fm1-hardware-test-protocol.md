# FM-1 physical hardware validation protocol

This protocol records the evidence required to close the hardware-dependent items in `PLAN.md`. A software-only or mocked result must not be marked as a physical pass.

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

## B. Chrome and Edge audio resilience

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
- all media tracks released after disconnect and page navigation.

For each case record browser, result, visible error/status text, whether MIDI remained usable and whether Windows still showed the endpoint in use after disconnect.

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

## Evidence package

Store each completed session under a dated folder outside the application repository until privacy-sensitive device paths and user names are removed. The sanitized evidence package should contain:

- this protocol with results filled in;
- MIDI monitor JSON export;
- original and merged `.syx` files with SHA-256 values;
- saved WAV samples;
- screenshots or a short screen-state timeline;
- exact failure/recovery notes;
- a proposed `PLAN.md` item to close, linked to the evidence.
