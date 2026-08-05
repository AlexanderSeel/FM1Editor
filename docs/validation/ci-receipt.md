# CI validation receipt

Validated on GitHub Actions with Node `v22.23.1`.

- Validated commit: `c69483daf264a6b6cd5f2a8b60ebd82dc8fa07b0`
- `npm install --no-audit --no-fund`: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity (`unzip -t`): **PASS**
- `npm run typecheck`: **PASS**
- `npm run test`: **PASS** — 15 test files, 40 tests
- `npm run build`: **PASS**

Validated changes:

- viewport-safe sticky/scrollable sidebar and two-column workspace menu;
- IndexedDB schema-v2 migration plus JSON backup/merge/replace restore;
- experimental 163-byte Yamaha single-voice push to the selected MIDI output;
- opt-in auto-push for bank/library voice selections;
- two-octave mouse, touch and computer-key virtual MIDI piano;
- explicit note-off and all-notes-off safety messages;
- tracked `public/catalog/sysexFinal.zip` exact SHA-256 verification.

Production build output:

- `dist/index.html`: 0.55 kB
- CSS bundle: 36.92 kB (7.04 kB gzip)
- JavaScript bundle: 302.83 kB (92.15 kB gzip)

Physical FM-1 voice reception, audible behavior and browser layout were not hardware/browser-visual tested in this validation run.
