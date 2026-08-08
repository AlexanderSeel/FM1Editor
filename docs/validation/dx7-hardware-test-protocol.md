# Stock Yamaha DX7 physical validation protocol

This protocol defines the physical evidence required for the two unresolved DX7 target-mode items in `PLAN.md`. Software tests, virtual rendering and mocked MIDI are not physical passes.

## In-app evidence helper

Open **MIDI monitor → Stock DX7 hardware evidence session** during a physical test. The helper summarizes the current MIDI capture, records DX7-specific identity/configuration, requires a full recovery-bank SHA-256 before export, and starts every protocol result as `Pending`. It does not derive hardware PASS from outgoing frames.

Export both artifacts when MIDI evidence is relevant:

1. **Export JSON** from the MIDI monitor for authoritative raw bytes.
2. **Export DX7 evidence manifest** for sanitized hardware/configuration metadata and explicit observations.

The shared **Latest SysEx delta** view may help compare controlled captures, but changed offsets remain structural evidence only and do not prove a Yamaha parameter meaning.

## Test identity and safety

Record before every session:

- date and tester;
- exact DX7 model/revision and serial-number suffix or another sanitized hardware identifier;
- ROM/firmware identification when the instrument exposes one;
- FM1 Editor commit SHA;
- Windows edition/build and exact Chrome/Edge version;
- MIDI interface/cable model and driver version;
- selected Web MIDI input/output labels;
- DX7 MIDI receive channel and app MIDI channel;
- `MIDI SYS INFO AVAIL` state;
- Memory Protect state;
- SHA-256 of the recovery 32-voice bank used before destructive tests.

Before bank reception, create and verify a recovery bank outside the instrument. Do not start destructive bank tests without a known restore path.

## A. Single-voice edit-buffer reception

Goal: verify the guarded stock-DX7 single-voice path without claiming that the FM-1 supports the same behavior.

1. Select a recognizable DX7 voice and record its name and audible character.
2. Set the DX7 receive channel to match the app and enable System Info reception.
3. Start MIDI capture in FM1 Editor.
4. Send one standard Yamaha 163-byte single-voice bulk message from the app.
5. Confirm the monitor shows one outgoing message with Yamaha manufacturer `43`, format `00`, declared length `01 1B` and final `F7`.
6. Audition the DX7 immediately without storing. Record whether the edit buffer contains the sent voice.
7. Change programs away and back without storing; record whether the original internal voice remains unchanged.
8. Repeat once with an intentionally mismatched MIDI channel and once with System Info reception disabled. Record the exact device behavior; do not infer rejection from silence alone.
9. Restore the normal channel/System Info state and repeat the successful case.

A pass requires repeatable edit-buffer reception on the matching configuration and no unintended overwrite of internal voice memory before an explicit store operation.

## B. Destructive 32-voice bank reception

1. Verify the recovery bank and keep a copy outside the DX7.
2. Record all 32 voice names currently in internal memory.
3. Prepare a known 32-voice test bank with at least three unmistakable voices at low, middle and high slots.
4. Set matching MIDI channel/System Info state and disable Memory Protect only for the transfer window.
5. Start MIDI capture and send one standard Yamaha 4,104-byte 32-voice bank message.
6. Confirm the monitor shows Yamaha manufacturer `43`, format `09`, declared length `20 00` and final `F7`.
7. Re-enable Memory Protect immediately after reception if the instrument requires manual protection.
8. Recall and audition all 32 slots or use a documented checksum/name comparison that still includes audible spot checks at low, middle and high positions.
9. Power-cycle the DX7 and verify the received bank persists.
10. Restore the recovery bank and verify at least the original voice-name list plus audible spot checks.

Record separately:

- behavior when Memory Protect is enabled;
- behavior when MIDI channel does not match;
- behavior after cable removal/interruption only after the recovery path has been proven;
- any front-panel error/status shown by the DX7.

A pass requires the intended 32 voices to replace the bank, persist across power cycle and be recoverable from the known backup without unexplained partial state.

## C. Guarded voice parameters `0–155`

The app may exercise live Yamaha parameter changes only against a stock DX7 after bulk reception is proven. Capture every test.

1. Load a simple reference voice with audible contribution from all six operators.
2. For representative voice parameters, test minimum, midpoint and maximum values, then restore the original value.
3. Cover at least one parameter from each semantic group implemented by the editor: operator envelope, keyboard scaling, output level, oscillator mode/frequency, pitch envelope, algorithm, feedback, oscillator key sync, LFO and transpose.
4. Verify the targeted parameter changes audibly or visibly and unrelated parameters remain unchanged.
5. For edit-only parameter `155`, exercise each individual operator bit and at least one multi-operator mask. Verify the operator on/off state matches the six-bit mask and is not serialized into the 155-byte voice payload.
6. Repeat representative writes after changing MIDI channel to prove channel guarding.
7. Exercise the app's opt-in throttled live-edit path after individual writes are proven; record whether rapid UI changes remain stable without dropped/stuck or unrelated state changes.
8. Capture and document any value the stock DX7 ignores, clamps or handles differently from the app model.

Do not promote a parameter to hardware-validated solely because the outgoing byte stream matches Yamaha documentation; the physical DX7 must demonstrate the expected state change.

## D. Function parameters `64–77`

Validate the guarded global/function controls independently from voice payloads. For each implemented function parameter:

1. record the initial front-panel state;
2. transmit minimum and maximum legal values plus one representative midpoint where meaningful;
3. verify the front-panel or audible behavior;
4. restore the initial value;
5. change programs and confirm whether the function is global or voice-local as expected;
6. power-cycle where persistence is relevant;
7. verify unrelated voice data remains unchanged.

The matrix must include the app-supported mono/poly, pitch-bend, portamento and controller-assignment functions. Record exact parameter number, transmitted value, observed result and recovery action.

## E. Browser/interface resilience

Repeat the successful single-voice transfer and a non-destructive parameter write in both Chrome and Edge on Windows:

- first permission grant;
- permission denial and retry;
- MIDI interface disconnect/reconnect while idle;
- interface removal after a note-on followed by the app's all-notes-off recovery;
- manual input/output port override;
- matching and mismatching MIDI channels.

Bank interruption testing is optional and must not be attempted until recovery from a normal destructive bank transfer has already been demonstrated.

## Evidence package

Keep unsanitized captures outside the repository until device paths, user names and serial details are reviewed. A commit-ready evidence package should contain:

- this protocol with results filled in;
- exported DX7 hardware evidence manifest;
- MIDI monitor JSON exports for the relevant sessions;
- source single-voice and 32-voice `.syx` files with SHA-256 values;
- recovery-bank SHA-256 and sanitized recovery result;
- parameter/function test matrix;
- browser/interface resilience matrix;
- screenshots or short front-panel state timelines when useful;
- exact failure and recovery notes;
- the specific `PLAN.md` item proposed for closure.
