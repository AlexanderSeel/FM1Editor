# FM1 Editor

A TypeScript web editor and librarian for the **M-VAVE FM-1** pocket FM synthesizer.

## Implemented baseline

- React, TypeScript, Vite and Tailwind application shell;
- Web MIDI capability detection, SysEx permission request and reconnect-aware input/output selection;
- Yamaha DX7-compatible 155-byte single-voice and 4,096-byte 32-voice bank codecs;
- Yamaha checksum validation and multi-message `.syx` file classification;
- drag-and-drop, multi-file and folder ingestion for `.syx` and `.sysex` files;
- `.syx` single-voice export plus draggable 32-slot bank reordering and bank export;
- persistent IndexedDB patch library with semantic duplicate detection, tags, favorites, search and A/B parameter comparison;
- attributed external source registry with a Yamaha Black Boxes browser entry;
- guarded user-triggered direct HTTPS SysEx URL imports with CORS, extension and 2 MB size checks;
- graphical six-operator voice editor with amplitude/pitch envelope views, operator frequency/level/scaling controls, algorithm, feedback and LFO controls;
- documented FM-1 parameter-write, CC, note, program and real-time message encoders;
- local 16-step sequence editor with note/rest/tie, velocity, gate, tempo, swing, length and MIDI channel;
- versioned sequence JSON load/save and scheduled Web MIDI playback;
- Vitest coverage for DX7 codecs, FM-1 message framing, sequence scheduling, library logic, bank reordering and remote-import safeguards;
- GitHub Actions workflow for typecheck, tests and production build.

See [`PLAN.md`](./PLAN.md) for unresolved work.

## Hardware verification boundary

The official FM-1 MIDI document defines a single-parameter write frame and parameter IDs 0–155, but it does not publish a semantic parameter map. Consequently:

- `.syx` file parsing, editing and export are normal supported workflows;
- MIDI note/transport playback uses documented messages;
- live voice parameter writes remain explicitly experimental;
- destructive FM-1 bank transfer is not exposed as verified yet;
- internal FM-1 sequencer dump/restore is not implemented because no documented pattern protocol was found.

Physical-device tests must record the FM-1 firmware version and must not be reported as passed unless actually executed.

Detailed protocol findings are recorded in [`docs/research/fm1-midi-protocol.md`](./docs/research/fm1-midi-protocol.md).

## Intended complete workflow

- connect through Web MIDI with SysEx access;
- design and audition six-operator FM voices;
- import, inspect, edit and export DX7-compatible `.syx` patches and banks;
- organize a searchable local patch library;
- browse attributed external patch sources without redistributing third-party collections;
- transfer verified banks to FM-1 destinations A/B/C/D;
- control documented FM-1 filter and effects CCs;
- create, save and play sequences from the browser;
- add device-side pattern transfer only if a stable protocol is documented or hardware-verified.

## External sources and downloads

The built-in source registry links to providers rather than mirroring their files. A direct URL import is only attempted after explicit user action and only for an HTTPS URL ending in `.syx` or `.sysex`. Browser CORS policy still applies.

Official product and firmware documentation:

- https://www.m-vave.com/product?id=fm-1
- https://www.m-vave.com/download

Reference DX7 patch archive used for interoperability research:

- https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/

The application does **not** redistribute third-party patch collections. Users import files they are permitted to use, or use source/provider-approved catalog endpoints configured by the application.

## Technology

- React + TypeScript + Vite
- Tailwind CSS
- Web MIDI API with `sysex: true`
- framework-independent DX7/FM-1 protocol and file-format modules
- IndexedDB-backed local patch library
- Vitest for protocol, codec, scheduling, library and import tests

A desktop wrapper such as Tauri remains possible because device protocol, storage and UI state are kept behind adapters.

## Browser requirements

Web MIDI and SysEx require a compatible Chromium-based browser, a secure context (`https://` or `localhost`) and explicit user permission. Browser support and device behavior will be documented from real hardware tests.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run test
npm run build
```

## License

MIT. Yamaha, DX7, M-VAVE and FM-1 are trademarks of their respective owners. This is an independent community project and is not affiliated with or endorsed by them.
