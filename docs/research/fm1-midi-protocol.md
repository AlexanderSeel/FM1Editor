# M-VAVE FM-1 MIDI protocol research

Last reviewed: 2026-08-05

## Sources

Primary sources:

- M-VAVE FM-1 product page: https://www.m-vave.com/product?id=fm-1
- M-VAVE download center: https://www.m-vave.com/download
- Official `FM-1 MIDI EN.docx` linked by the M-VAVE download center

Interoperability references:

- Yamaha DX7 SysEx format documentation and implementations
- Yamaha Black Boxes DX7 patch archive: https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/

## Documented channel behavior

- **Note channel:** defaults to All/Omni and receives musical/performance messages.
- **FX channel:** defaults to MIDI channel 2 and receives effect control changes.
- **System Real-Time:** channel-independent.

Important: CC 1 on the FX channel selects the filter type; it is not interpreted as modulation wheel on that channel.

## Documented note-channel messages

| Function | MIDI message |
| --- | --- |
| Note | Note On / Note Off |
| Program selection | Program Change 0–127 |
| Pitch bend | 14-bit Pitch Bend |
| Pressure | Channel Aftertouch |
| Modulation | CC 1 |
| Sustain | CC 64 |

## Documented FX controls

The official document assigns CC 0–23 to six effect blocks on the FX channel.

| CC | Parameter | Documented range/meaning |
| ---: | --- | --- |
| 0 | Filter switch | Off/on |
| 1 | Filter type | LPF/BPF/HPF |
| 2 | Filter cutoff | 0–107 |
| 3 | Filter Q | 0–10 |
| 4 | Reverb switch | Off/on |
| 5 | Reverb type | Room/Hall/Plate |
| 6 | Reverb decay | 0–100 |
| 7 | Reverb mix | 0–100 |
| 8 | Delay switch | Off/on |
| 9 | Delay decay | 0–100 |
| 10 | Delay rate | 0–100 |
| 11 | Delay mix | 0–100 |
| 12 | Distortion switch | Off/on |
| 13 | Distortion gain | 0–100 |
| 14 | Distortion tone | 0–100 |
| 15 | Distortion level | 0–100 |
| 16 | Chorus switch | Off/on |
| 17 | Chorus frequency | 0–100 |
| 18 | Chorus depth | 0–100 |
| 19 | Chorus mix | 0–100 |
| 20 | Phaser switch | Off/on |
| 21 | Phaser frequency | 0–100 |
| 22 | Phaser depth | 0–100 |
| 23 | Phaser mix | 0–100 |

## Documented real-time transport

| Byte | Meaning |
| ---: | --- |
| `F8` | MIDI clock |
| `FA` | Start from step 0 |
| `FB` | Documented as equivalent to start; no resume behavior stated |
| `FC` | Stop |

The browser sequencer currently sends Note On/Off and Start/Stop. Clock generation at 24 PPQN remains unresolved work.

## Documented single-parameter SysEx write

The official document defines this frame:

```text
F0 43 10 pp qq vv F7
```

- `F0`: SysEx start
- `43`: Yamaha manufacturer ID
- `10`: fixed device/status byte in the FM-1 document
- parameter ID: `pp * 128 + qq`
- documented parameter range: `0–155`
- `vv`: seven-bit parameter value
- `F7`: SysEx end

Implemented by `encodeFm1ParameterWrite()` in `src/midi/fm1Protocol.ts`.

### Critical limitation

The official MIDI document does **not** provide a semantic table mapping parameter IDs 0–155 to operator, envelope, algorithm, LFO or performance fields. A DX7 unpacked byte offset must not be assumed to be the same thing as an FM-1 parameter ID.

Individual live voice edits remain disabled until a semantic map is documented or captured and verified on physical hardware.

## Rejected immediate single-voice approaches

Two approaches were tested on a physical FM-1 on 2026-08-05. Both left the active sound silent:

1. a standard 163-byte Yamaha DX7 single-voice message;
2. 155 individually paced FM-1 parameter-write messages populated from DX7 unpacked edit-buffer byte offsets 0–154.

The exact FM-1 firmware version was not recorded and remains required for the compatibility record. Regardless, both transports are removed from the normal UI and transfer module. They must not be reintroduced without a verified protocol.

Recovery remains limited to documented Program Change preset recall and normal MIDI note testing.

## DX7 voice and bank interoperability

The application implements standard Yamaha DX7 data structures:

- 155-byte unpacked single-voice payload / 163-byte complete SysEx message;
- 128-byte packed voice representation;
- 32 voices per packed bank;
- 4,096-byte bank payload / 4,104-byte complete SysEx message;
- Yamaha seven-bit checksum validation.

The FM-1 manual describes importing a standard 32-voice Yamaha DX7 bank and then choosing destination bank A, B, C or D on the device.

### Guarded bank-merge workflow

The editor now supports the only credible single-voice replacement workflow available without a device edit-buffer protocol:

1. load an exact 32-voice base or backup bank in the app;
2. select a slot and edit its voice;
3. merge the edited voice into that same slot while preserving the other 31 app-side voices;
4. export the unchanged base bank as a recovery copy;
5. optionally export the merged bank for inspection;
6. send one checksum-valid 4,104-byte DX7 bank message after explicit whole-bank overwrite confirmation;
7. choose the matching A/B/C/D destination on the FM-1;
8. recall the derived preset after the device confirms the save.

Bank A/B/C/D plus slot 1–32 maps to presets 1–128 in the editor.

### Remaining hardware boundary

The FM-1 does not expose a documented bank-read request. Therefore the application cannot automatically recall the current 32 voices from the device. The loaded base bank must be the exact bank that should be preserved.

Physical verification is still required for:

- the destination prompt and A/B/C/D mapping;
- preservation of the other 31 voices;
- target-preset playback after save;
- transfer acknowledgements or completion detection;
- any device-originated bank dump capability.

## Sequencer boundary

No documented FM-1 pattern dump/restore SysEx format was found. The current sequencer therefore provides:

- a local versioned JSON project format;
- 16-step note/rest/tie/velocity/gate editing;
- Web MIDI playback to the selected output;
- documented Start/Stop transport messages.

Writing directly into the FM-1 internal sequencer remains out of scope until a stable protocol is documented or captured and verified.
