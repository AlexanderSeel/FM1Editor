# FM1 Editor

A TypeScript web editor and librarian for the **M-VAVE FM-1** pocket FM synthesizer.

## Implemented baseline

- React, TypeScript, Vite and Tailwind application shell with a viewport-safe sticky/scrollable sidebar;
- responsive two-column workspace navigation that remains inside the sidebar at desktop widths;
- Web MIDI capability detection, SysEx permission request and reconnect-aware input/output selection;
- persisted MIDI port preferences with descriptor fallback when browser port IDs change;
- timestamped incoming/outgoing MIDI monitor with direction/text filtering, hexadecimal data and JSON export;
- Yamaha DX7-compatible 155-byte single-voice and 4,096-byte 32-voice bank codecs;
- Yamaha checksum validation and multi-message `.syx` file classification;
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
- experimental paced push of 155 DX7 edit-buffer values through the documented FM-1 single-parameter SysEx frame;
- opt-in auto-push when a bank or library voice is selected, without resending every editor slider change;
- two-octave virtual piano for mouse, touch and focused computer-key input, with channel, velocity, octave and all-notes-off controls;
- documented FM-1 parameter-write, CC, note, program and real-time message encoders;
- documented FM-1 effects workspace for filter, reverb, delay, distortion, chorus and phaser CC 0–23;
- local 16-step sequence editor with note/rest/tie, velocity, gate, tempo, swing, length and MIDI channel;
- versioned sequence JSON load/save and scheduled Web MIDI playback through the monitored output adapter;
- 44 passing Vitest tests across 15 files covering codecs, imports, catalog, library migration/backup, voice audition, effects, sequencing and MIDI monitoring;
- GitHub Actions workflow for typecheck, ESLint/JSX accessibility, tests and production build.

See [`PLAN.md`](./PLAN.md) for unresolved work and [`docs/validation/ci-receipt.md`](./docs/validation/ci-receipt.md) for the latest executed validation.

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

`npm run catalog:sync` validates the tracked ZIP, parses the provider page, mirrors discovered website-only SysEx files into `public/catalog/yamaha-black-boxes`, and writes `public/catalog/sync-manifest.json`. It never replaces or downloads `sysexFinal.zip`.

```bash
npm run catalog:sync
```

The production `prebuild` hook performs the website synchronization in best-effort mode. The tracked ZIP remains available even when the provider page is temporarily unavailable. See [`docs/research/patch-catalog.md`](./docs/research/patch-catalog.md).

Patch ownership and usage permissions vary across the archive. FM1 Editor preserves source metadata and does not claim that every included bank is public domain. Review the generated manifest and source terms before publishing a hosted catalog.

## Voice push and virtual piano

The Voice workspace contains an FM-1 audition panel:

1. Connect Web MIDI with SysEx permission and select the FM-1 output.
2. Load or select a voice from a bank or the local library.
3. Recall a known preset and use **Test C4** to verify the selected output and note channel.
4. Use **Push voice parameters**, or enable **Auto-push bank/library selections**.
5. Play notes on the virtual piano with mouse, touch or the focused A–; computer-key range.
6. Use **Recall preset** or **All notes off** to recover from an invalid edit buffer or stuck note.

The former 163-byte Yamaha single-voice bulk send was removed after a physical FM-1 became silent after receiving it. Voice push now emits 155 individually paced `F0 43 10 pp qq vv F7` parameter writes. The byte-index mapping remains experimental until confirmed against the device. Preset recall uses documented Program Change messages; the virtual piano uses normal MIDI note-on, note-off and CC 123 all-notes-off messages.

## SysEx diagnostics

The import analyzer scans every complete `F0 … F7` message and reports:

- ignored bytes outside messages;
- stray `F7` bytes and nested `F0` starts;
- trailing incomplete messages;
- unsupported message lengths, manufacturer IDs and format bytes;
- DX7 decoding and checksum failures with exact offsets.

The UI displays these diagnostics per file while still importing valid complete voices from a mixed file. The strict `importSysexFile` API remains available for callers that must reject structurally incomplete input.

## Hardware verification boundary

The official FM-1 MIDI document defines a single-parameter write frame and parameter IDs 0–155, but it does not publish a semantic parameter map. Consequently:

- `.syx` parsing, editing, local storage and export are normal supported workflows;
- MIDI note/transport playback uses documented messages;
- the effects workspace uses the documented FX-channel CC 0–23 map, but physical-device behavior is not yet recorded;
- isolated Yamaha single-voice bulk push is disabled after it produced a silent active sound on physical hardware;
- the paced FM-1 parameter stream remains explicitly experimental until its 0–154 byte-index mapping is verified;
- destructive FM-1 bank transfer is not exposed as verified yet;
- internal FM-1 sequencer dump/restore is not implemented because no documented pattern protocol was found.

Physical-device tests must record the FM-1 firmware version and must not be reported as passed unless actually executed.

Detailed protocol findings are recorded in [`docs/research/fm1-midi-protocol.md`](./docs/research/fm1-midi-protocol.md).

## Intended complete workflow

- connect through Web MIDI with SysEx access;
- design and audition six-operator FM voices;
- import, browse, inspect, edit and export DX7-compatible `.syx` patches and banks;
- organize, back up and restore a searchable local patch library;
- transfer verified banks to FM-1 destinations A/B/C/D;
- control documented FM-1 filter and effects CCs;
- create, save and play sequences from the browser;
- add device-side pattern transfer only if a stable protocol is documented or hardware-verified.

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
- `fflate` for browser-side ZIP indexing and selective bank extraction
- framework-independent DX7/FM-1 protocol and file-format modules
- IndexedDB-backed local patch library
- Vitest for protocol, codec, scheduling, library and catalog tests

A desktop wrapper such as Tauri remains possible because device protocol, storage and UI state are kept behind adapters.

## Browser requirements

Web MIDI and SysEx require a compatible Chromium-based browser, a secure context (`https://` or `localhost`) and explicit user permission. Browser support and device behavior will be documented from real hardware tests.

## Development

```bash
npm install
npm run catalog:sync
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## License

Application source code is MIT licensed. Yamaha, DX7, M-VAVE and FM-1 are trademarks of their respective owners. Third-party patch banks are not covered by the application source-code license. This is an independent community project and is not affiliated with or endorsed by the referenced manufacturers or patch providers.
