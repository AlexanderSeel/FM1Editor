# Application history validation

Validated source commit: `13413921f3e4b99dafdf819cfb84c1f3be8d4d0e`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Verified behavior:

- independent undo/redo histories for Voice, Effects and Sequencer;
- Undo/Redo controls and standard keyboard shortcuts outside text-editing fields;
- saved-baseline tracking for imported/loaded voices, SysEx export and local-library save;
- confirmation before replacing a modified voice with another patch, bank or slot;
- browser unload protection while any editor workspace contains unsaved changes;
- history resets when another voice document is loaded;
- Uint8Array source data participates in dirty-state comparison by byte value.
