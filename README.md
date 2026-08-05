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
- explicit selected-slot tracking that remains stable while a bank voice is edited;
- guarded merge of the current edited voice into one slot of an exact 32-voice base bank;
- export of both unchanged recovery bank and merged bank before device transfer;
- explicitly confirmed 4,104-byte whole-bank SysEx transfer with A/B/C/D destination and preset mapping;
- two-octave virtual piano for mouse, touch and focused computer-key input, with channel, velocity, octave and all-notes-off controls;
- documented FM-1 CC, note, program and real-time message encoders;
- documented FM-1 effects workspace for filter, reverb, delay, distortion, chorus and phaser CC 0–23;
- local 16-step sequence editor with note/rest/tie, velocity, gate, tempo, swing, length and MIDI channel;
- versioned sequence JSON load/save and scheduled Web MIDI playback through the monitored output adapter;
- 46 passing Vitest tests across 16 files covering codecs, imports, catalog, library migration/backup, bank merging, audition, effects, sequencing and MIDI monitoring;
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

`npm run catalog:sync` validates the tracked ZIP, parses the provider page, validates every downloaded website bank, mirrors valid website-only SysEx files into `public/catalog/yamaha-black-boxes`, and writes `public/catalog/sync-manifest.json`. It never replaces or downloads `sysexFinal.zip`.

```bash
npm run catalog:sync
```

Both `npm run dev` and `npm run build` execute the synchronization in best-effort mode before Vite starts. This prevents a missing `.syx` mirror path from being answered by Vite's SPA fallback `index.html`. When no validated sync manifest exists, runtime loading skips the local mirror and attempts the direct source instead.

Patch ownership and usage permissions vary across the archive. FM1 Editor preserves source metadata and does not claim that every included bank is public domain. Review the generated manifest and source terms before publishing a hosted catalog.

## Bank merge and virtual piano

The FM-1 documents standard Yamaha DX7 **32-voice bank** import, followed by device-side A/B/C/D destination selection. It does not document an immediately playable isolated single-voice transfer or a bank-read operation.

The Voice workspace therefore uses this guarded workflow:

1. Load the exact 32-voice base or backup bank that should remain in the destination.
2. Select the slot to edit in the bank grid.
3. Edit the selected voice.
4. Choose destination bank A/B/C/D. The selected slot and bank determine preset 1–128.
