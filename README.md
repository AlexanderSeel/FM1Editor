# FM1 Editor

A TypeScript web editor and librarian with separate, persistent target modes for the **M-VAVE FM-1** pocket FM synthesizer and a stock **Yamaha DX7**.

## Implemented baseline

- React, TypeScript, Vite and Tailwind application shell with a viewport-safe sticky/scrollable sidebar;
- responsive two-column workspace navigation that remains inside the sidebar at desktop widths;
- Web MIDI capability detection, SysEx permission request and reconnect-aware input/output selection;
- persisted device target selection plus per-target MIDI port preferences, descriptor fallback and non-binding FM-1/DX7 port-name suggestions;
- target-routed safety boundaries that prevent FM-1 bank/effects operations from appearing in Yamaha DX7 mode;
- timestamped incoming/outgoing MIDI monitor with direction/text filtering, hexadecimal data and JSON export;
- Yamaha DX7-compatible 155-byte single-voice and 4,096-byte 32-voice bank codecs;
- guarded stock-DX7 transmission of standard 163-byte single-voice and 4,104-byte 32-voice bank messages with matching-channel, System Info, Memory Protect and destructive-bank confirmations;
- Yamaha checksum validation and multi-message `.syx` file classification;
- strict DX7 semantic ranges for edited voices, with legacy reserved values normalized only at import;
- structured compatibility-normalization records and visible per-parameter import warnings;
- byte-for-byte preservation and unchanged download of each imported SysEx file before normalization;
- structured per-message diagnostics with byte offsets, message indexes, lengths, manufacturer/format bytes and checksum errors;
- salvage of complete supported messages from mixed files that also contain padding, unsupported messages or incomplete trailing data;
- drag-and-drop, multi-file and folder ingestion for `.syx` and `.sysex` files;
- `.syx` single-voice export plus draggable 32-slot bank reordering and bank export;
- persistent IndexedDB schema-v3 patch library with semantic duplicate detection, tags, favorites, search and A/B comparison;
- portable JSON library backup with merge restore and explicitly confirmed full replacement;
- the supplied `public/catalog/sysexFinal.zip` tracked directly in the repository as the catalog source;
- direct in-app ZIP browser indexed by source folder, bank and voice name;
- build-time parser for the Yamaha Black Boxes DX7 page and mirror of every discovered direct `.syx` link;
- merged ZIP/website catalog: matching website banks use the tracked ZIP copy while website-only banks use the mirrored source file;
- catalog checksum diagnostics, archive SHA-256 verification, source/availability filters and paginated bank grid;
- graphical six-operator voice editor with amplitude/pitch envelope views, operator frequency/level/scaling controls, algorithm, feedback and LFO controls;
- explicit selected-slot tracking that remains stable while a bank voice is edited;
- guarded merge of the current edited voice into one slot of an exact 32-voice base bank;
- export of both unchanged recovery bank and merged bank before device transfer;
- explicitly confirmed 4,104-byte whole-bank SysEx transfer with A/B/C/D destination and preset mapping;
- two-octave virtual piano for mouse, touch and focused computer-key input, with channel, velocity, octave and all-notes-off controls;
- browser-local audio-input recording with explicit permission, FM-1-labelled device suggestion, manual selection, live level/clipping diagnostics, lossless WAV output and optional browser-compressed fallback;
- documented FM-1 CC, note, program and real-time message encoders;
- documented FM-1 effects workspace for filter, reverb, delay, distortion, chorus and phaser CC 0–23;
- local 16-step sequence editor with note/rest/tie, velocity, gate, tempo, swing, length and MIDI channel;
- versioned sequence JSON load/save and scheduled Web MIDI playback through the monitored output adapter;
- Vitest coverage for codecs, imports, catalog, library migration/backup, bank merging, audition, audio recording, effects, sequencing and MIDI monitoring;
- GitHub Actions workflow for typecheck, ESLint/JSX accessibility, tests and production build.

See [`PLAN.md`](./PLAN.md) for unresolved work, [`docs/validation/ci-receipt.md`](./docs/validation/ci-receipt.md) for the general validation receipt, [`docs/validation/audio-recorder.md`](./docs/validation/audio-recorder.md) for mocked-media recorder validation, [`docs/validation/target-capability-routing.md`](./docs/validation/target-capability-routing.md) for target routing, and [`docs/validation/dx7-bulk-transfer.md`](./docs/validation/dx7-bulk-transfer.md) for the guarded DX7 bulk-transfer gate. DX7 compatibility handling is validated in [`docs/validation/dx7-semantic-ranges.md`](./docs/validation/dx7-semantic-ranges.md) and [`docs/validation/dx7-original-import.md`](./docs/validation/dx7-original-import.md).

## Merged patch catalog

The catalog uses the supplied [`public/catalog/sysexFinal.zip`](./public/catalog/sysexFinal.zip) file as its only ZIP source. The browser does not download or substitute a remote archive at runtime.

Tracked archive identity:

- size: 2,785,215 bytes;
- SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`;
- 1,304 `.syx` files after excluding macOS metadata;
- 1,288 checksum-valid standard DX7 32-voice banks;
- 14 standard-size banks with checksum diagnostics;
- 2 unsupported 4,084-byte files retained only for diagnostics.

The Yamaha Black Boxes overlay currently represents:

- 35 website bank links;
- 28 banks matched to a ZIP bank by filename;
- 7 website-only banks represented by mirrored/direct source files.

The application does not show a button that sends the user to the Yamaha patch page. Banks appear directly in the application grid and load into the voice workspace and local library.

`npm run catalog:sync` validates the tracked ZIP, parses the provider page, validates every downloaded website bank, mirrors valid website-only SysEx files into `public/catalog/yamaha-black-boxes`, and writes `public/catalog/sync-manifest.json`. It never replaces or downloads `sysexFinal.zip`.

```bash
npm run catalog:sync
```

Both `npm run dev` and `npm run build` execute the synchronization in best-effort mode before Vite starts. This prevents a missing `.syx` mirror path from being answered by Vite's SPA fallback `index.html`. When no validated sync manifest exists, runtime loading skips the local mirror and attempts the direct source instead. See [`docs/research/patch-catalog.md`](./docs/research/patch-catalog.md).

Patch ownership and usage permissions vary across the archive. FM1 Editor preserves source metadata and does not claim that every included bank is public domain. Review the generated manifest and source terms before publishing a hosted catalog.

## Stock Yamaha DX7 target

Selecting **Yamaha DX7** keeps file editing, the local library, audio recording and MIDI note audition available while hiding FM-1-only effects and bank/preset mapping. Device transmission is never automatic.

The DX7 audition panel supports two separately confirmed standard Yamaha receive operations:

1. **Send current voice to edit buffer** transmits one channel-addressed 163-byte single-voice bulk message. It does not automatically store the voice in a numbered internal slot.
2. **Overwrite DX7 with loaded 32-voice bank** transmits one channel-addressed 4,104-byte bank message and is treated as a destructive replacement of the complete internal bank.

Both controls require Web MIDI SysEx permission, a manually verified output, a matching DX7 MIDI channel, confirmation that System Info is available and confirmation that Memory Protect is off. The application sends all-notes-off before the bulk message and records the transfer in the MIDI monitor.

Voice-parameter changes, function/performance data and programmatic dump requests remain disabled. No dump-request frame will be added unless an original Yamaha data-format source proves that the stock DX7 supports it; initiate outgoing dumps from the DX7 front panel meanwhile. Physical stock-DX7 reception remains unverified and must not be reported as passed until tested.

## Bank merge and virtual piano

The FM-1 documents standard Yamaha DX7 **32-voice bank** import, followed by device-side A/B/C/D destination selection. It does not document an immediately playable isolated single-voice transfer or a bank-read operation.

The Voice workspace therefore uses this guarded workflow:

1. Load the exact 32-voice base or backup bank that should remain in the destination.
2. Select the slot to edit in the bank grid.
3. Edit the selected voice.
4. Choose destination bank A/B/C/D. The selected slot and bank determine preset 1–128.
5. Export the unchanged base bank as a recovery copy.
6. Optionally export the merged bank for inspection.
7. Click **Send merged 32-voice bank** and accept the whole-bank overwrite confirmation.
8. On the FM-1 destination screen, choose the same A/B/C/D bank.
9. After the FM-1 confirms the save, use **Recall target preset**, **Test C4** or the virtual piano.

The application replaces exactly one selected slot and preserves the other 31 voices from the loaded base bank. It cannot retrieve those voices from the FM-1, so the loaded base bank must be correct.

Both attempted isolated-voice methods are disabled after physical tests left the FM-1 active sound silent:

- a 163-byte Yamaha DX7 single-voice bulk message;
- a guessed byte-index stream through FM-1 parameter IDs 0–154.

Neither method will be re-enabled without a verified semantic FM-1 parameter map or documented edit-buffer protocol.

## FM-1 USB audio recording

The Voice workspace contains a collapsed **FM-1 USB audio** recorder that is independent from MIDI connection state.

- Microphone/audio-input permission is requested only after **Allow and connect input** is pressed.
- The browser enumerates `audioinput` devices after permission, suggests an endpoint whose label contains `FM-1`, and keeps the selector available for manual override.
- Capture requests disable echo cancellation, noise suppression and automatic gain control where the browser/device supports those constraints.
- The panel reports the actual track label, sample rate, channel count and processing settings returned by the browser.
- A live RMS level meter and clipping indicator remain active while connected.
- Lossless PCM is encoded locally as a 16-bit WAV. WebM/Opus or Ogg/Opus is offered only when `MediaRecorder` reports a supported fallback.
- Recordings remain in memory until **Save recording** is pressed. They are not uploaded, added to IndexedDB or persisted automatically.
- Filenames include the patch name, target mode, available bank/slot metadata and a UTC timestamp.
- Monitoring is disabled by default, requires a separate confirmation and remains switchable off during recording because speaker monitoring can create loud feedback.
- Disconnect, device removal, capture failure and component disposal release the media tracks and perform a best-effort MIDI all-sound-off/all-notes-off safety action when a MIDI output exists.

The Windows endpoint name `Microphone (FM-1)` is only a device-label finding. The application does **not** claim that it carries synthesizer audio until playing the physical FM-1 moves the Windows/browser input meter and produces an audible recording. Firmware, driver, sample format, channel layout, latency and MASTER-knob behavior remain hardware-verification tasks.

Microphone permission can be revoked from the browser's site permissions. The application must then be reconnected explicitly; it does not retry permission in the background.

## SysEx diagnostics

The import analyzer scans every complete `F0 … F7` message and reports:

- ignored bytes outside messages;
- stray `F7` bytes and nested `F0` starts;
- trailing incomplete messages;
- unsupported message lengths, manufacturer IDs and format bytes;
- DX7 decoding and checksum failures with exact offsets;
- every compatibility normalization with voice/operator path, original value and normalized value.

The UI displays these diagnostics per file while still importing valid complete voices from a mixed file. The strict `importSysexFile` API remains available for callers that must reject structurally incomplete input.

Imported files are copied byte-for-byte before decoding. The **Exact original imports** section keeps those copies in browser memory and offers **Download unchanged** with the original filename. They remain available until the next import or page reload and are not automatically persisted to the patch library. Edited or hardware-bound exports use the normalized semantic model, standards-valid ranges and a recalculated Yamaha checksum.

Legacy raw values such as keyboard-scaling breakpoint `127` and detune `15` are accepted only at the import boundary and recorded as compatibility normalizations (`127 → 99`, `15 → 14`). The editable voice model rejects breakpoint values above `99` and detune values above `14` instead of silently repairing user edits during export.

## Hardware verification boundary

The official FM-1 MIDI document defines a single-parameter write frame and parameter IDs 0–155, but it does not publish a semantic parameter map. Consequently:

- `.syx` parsing, editing, local storage and export are normal supported workflows;
- MIDI note/transport playback and preset recall use documented messages;
- the effects workspace uses the documented FX-channel CC 0–23 map, but physical-device behavior is not yet fully recorded;
- browser-local audio capture is software-validated with mocked media, but the physical `Microphone (FM-1)` endpoint is not yet verified to carry audible synthesizer output;
- isolated single-voice and guessed byte-index parameter transfers are disabled;
- the guarded standard 32-voice bank merge/send workflow is implemented but still requires physical verification on the user's FM-1 and firmware;
- device-originated bank readback/backup is unavailable until a supported dump request is identified;
- internal FM-1 sequencer dump/restore is not implemented because no documented pattern protocol was found.

Physical-device tests must record the FM-1 firmware version and must not be reported as passed unless actually executed.

Detailed protocol findings are recorded in [`docs/research/fm1-midi-protocol.md`](./docs/research/fm1-midi-protocol.md).

## Intended complete workflow

- connect through Web MIDI with SysEx access;
- design and audition six-operator FM voices;
- import, browse, inspect, edit and export DX7-compatible `.syx` patches and banks;
- organize, back up and restore a searchable local patch library;
- merge one edited voice into an exact 32-voice base bank and transfer it to FM-1 destination A/B/C/D;
- record the selected browser audio input locally and save WAV files explicitly;
- control documented FM-1 filter and effects CCs;
- create, save and play sequences from the browser;
- add device-originated backup and pattern transfer only if stable protocols are documented or hardware-verified.

## Sources

Official product and firmware documentation:

- https://www.m-vave.com/product?id=fm-1
- https://www.m-vave.com/download

Catalog provenance:

- tracked archive: [`public/catalog/sysexFinal.zip`](./public/catalog/sysexFinal.zip)
- source-compatible archive reference: https://github.com/probonopd/MiniDexed/files/11312517/sysexFinal.zip
- website overlay: https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/

## Technology

- React + TypeScript + Vite
- Tailwind CSS
- Web MIDI API with `sysex: true`
- MediaDevices, Web Audio and MediaRecorder for browser-local audio capture
- `fflate` for browser-side ZIP indexing and selective bank extraction
- framework-independent DX7/FM-1 protocol and file-format modules
- IndexedDB-backed local patch library
- Vitest for protocol, codec, scheduling, library, audio and catalog tests

A desktop wrapper such as Tauri remains possible because device protocol, storage and UI state are kept behind adapters.

## Browser requirements

Web MIDI, SysEx and audio-input capture require a compatible Chromium-based browser, a secure context (`https://` or `localhost`) and explicit user permission. MIDI and microphone permissions are separate. Browser support and physical device behavior will be documented from real hardware tests.

## Development

```bash
npm install
npm run dev
```

`npm run dev` performs a best-effort catalog synchronization before starting Vite. Run `npm run catalog:sync` explicitly when the provider mirror must be refreshed and validated without starting the development server.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## License

Application source code is MIT licensed. Yamaha, DX7, M-VAVE and FM-1 are trademarks of their respective owners. Third-party patch banks are not covered by the application source-code license. This is an independent community project and is not affiliated with or endorsed by the referenced manufacturers or patch providers.