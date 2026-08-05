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

Third-party patch files are not vendored or redistributed by this project.

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

The official two-page MIDI document does **not** provide a semantic table mapping parameter IDs 0–155 to operator, envelope, algorithm, LFO or performance fields. The code can generate the documented frame, but the current DX7 edit-buffer-byte-to-FM-1-parameter mapping is intentionally named and presented as experimental. It must not be enabled as a normal live-edit workflow until verified on real hardware.

## DX7 voice and bank interoperability

The application implements standard Yamaha DX7 data structures:

- 155-byte unpacked single-voice payload / 163-byte complete SysEx message;
- 128-byte packed voice representation;
- 32 voices per packed bank;
- 4,096-byte bank payload / 4,104-byte complete SysEx message;
- Yamaha seven-bit checksum validation.

The FM-1 manual is reported to support importing standard 32-voice Yamaha DX7 banks and placing them into destination banks A, B, C or D. This must still be verified against a physical FM-1 and recorded with the device firmware version before the web UI exposes a destructive bank-send action as verified.

## Sequencer boundary

No documented FM-1 pattern dump/restore SysEx format was found. The current sequencer therefore provides:

- a local versioned JSON project format;
- 16-step note/rest/tie/velocity/gate editing;
- Web MIDI playback to the selected output;
- documented Start/Stop transport messages.

Writing directly into the FM-1 internal sequencer remains out of scope until a stable protocol is documented or captured and verified.
