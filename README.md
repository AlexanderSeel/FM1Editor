# FM1 Editor

A TypeScript web editor and librarian for the **M-VAVE FM-1** pocket FM synthesizer.

The project targets a complete graphical workflow around the FM-1:

- connect through Web MIDI with SysEx access;
- inspect and edit six-operator FM voices;
- visualize operator envelopes, pitch envelope, algorithms, feedback, LFO and performance settings;
- import, inspect and export Yamaha DX7-compatible `.syx` single voices and 32-voice banks;
- send compatible voice banks to the FM-1 and organize its A/B/C/D banks;
- maintain a searchable local patch library with tags, favorites, comparisons and duplicate detection;
- build, save and play 16-step sequences from the browser;
- provide a protocol adapter boundary for future device-side sequence transfer if a documented or verified FM-1 pattern protocol becomes available.

## Current device facts

The FM-1 is documented as a six-operator FM synthesizer with 32 algorithms, 128 presets, arpeggiator and 16-step sequencer. It receives MIDI notes, pitch bend, control changes and FM-1 voice-bank SysEx. Its manual describes importing standard Yamaha DX7 32-voice banks and choosing an FM-1 destination bank A, B, C or D after receipt.

Official product and firmware documentation:

- https://www.m-vave.com/product?id=fm-1
- https://www.m-vave.com/download

Reference DX7 patch archive used for interoperability research:

- https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/

The application does **not** redistribute third-party patch collections. Users import files they are permitted to use, or open source/provider-approved catalog endpoints configured by the application.

## Technology

- React + TypeScript + Vite
- Tailwind CSS
- Web MIDI API with `sysex: true`
- framework-independent DX7/FM-1 protocol and file-format modules
- IndexedDB-backed local library
- Vitest for protocol, codec and state tests

A desktop wrapper such as Tauri remains possible because device protocol, storage and UI state are kept behind adapters.

## Browser requirements

Web MIDI and SysEx require a compatible Chromium-based browser, a secure context (`https://` or `localhost`) and explicit user permission. Browser support and device behavior will be documented from real hardware tests; the project will not claim unexecuted FM-1 transfers as verified.

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

## Status

Initial implementation is in progress. See [`PLAN.md`](./PLAN.md) for unresolved work and protocol risks.

## License

MIT. Yamaha, DX7, M-VAVE and FM-1 are trademarks of their respective owners. This is an independent community project and is not affiliated with or endorsed by them.
