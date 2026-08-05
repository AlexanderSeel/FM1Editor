# CI validation receipt

Validated on GitHub Actions with Node `v22.23.1`.

- Validated commit: `3e3ce17201ab2ad9d82f4215adbd700d4d85ea8d`
- `npm install --no-audit --no-fund`: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity (`unzip -t`): **PASS**
- `npm run typecheck`: **PASS**
- `npm run lint`: **PASS**
- `npm run test`: **PASS** — 15 test files, 44 tests
- `npm run build`: **PASS**

Validated FM-1 recovery changes:

- the unsupported 163-byte Yamaha single-voice audition send is no longer used;
- a selected voice produces 155 paced FM-1 parameter-write frames;
- the selected note channel is used for all-notes-off and audition notes;
- preset recall emits a documented Program Change;
- Test C4 schedules matching note-on and note-off messages;
- virtual-piano input is blocked while voice parameters are being written;
- packed DX7 detune reserved bits and cached schema-v2 records remain covered by regression tests;
- ESLint, React Hooks and JSX accessibility checks pass.

Tracked archive:

- path: `public/catalog/sysexFinal.zip`
- size: 2,785,215 bytes
- SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

Physical FM-1 acceptance of the 0–154 parameter mapping and resulting audio were not validated by GitHub Actions and remain a hardware test.
