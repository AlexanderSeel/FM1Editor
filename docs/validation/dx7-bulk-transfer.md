# Yamaha DX7 bulk transfer validation

Validated source commit: `651d6a04813cd850e848d8d593bdd9b47aba2118`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **SUCCESS**
- npm run build: **SUCCESS**
- guarded DX7 transfer marker check: **SUCCESS**

- software tests cover channel-addressed 163-byte single-voice and 4,104-byte 32-voice bank messages.
- parameter changes, function data and device dump requests remain disabled.
- physical Yamaha DX7 reception and memory behavior remain unverified.

## Install output

```text

added 317 packages, and audited 318 packages in 18s

138 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

## Typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

```

## Lint output

```text

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts

```

## Test output

```text

> fm1-editor@0.1.0 test
> vitest run


 RUN  v4.1.10 /home/runner/work/FM1Editor/FM1Editor

 ✓ scripts/catalog-release-audit.test.mjs (5 tests) 27ms
 ✓ src/audio/recorder.test.ts (8 tests) 13ms
 ✓ src/sysex/dx7.test.ts (9 tests) 40ms
 ✓ src/domain/deviceTarget.test.ts (6 tests) 13ms
 ✓ src/domain/voiceVariations.test.ts (5 tests) 11ms
 ✓ src/sysex/normalizeLegacyVoice.test.ts (2 tests) 20ms
 ✓ src/library/backup.test.ts (3 tests) 35ms
 ✓ src/catalog/patchCatalog.test.ts (3 tests) 33ms
 ✓ src/domain/keyboardScalingGeometry.test.ts (6 tests) 8ms
 ✓ src/domain/envelopeGeometry.test.ts (5 tests) 21ms
 ✓ src/midi/dx7Transfer.test.ts (3 tests) 23ms
 ✓ src/midi/fm1BankTransfer.test.ts (4 tests) 21ms
 ✓ src/domain/dx7Algorithms.test.ts (5 tests) 13ms
 ✓ src/library/storageMigration.test.ts (3 tests) 34ms
 ✓ src/sysex/importSysex.test.ts (2 tests) 13ms
 ✓ src/library/model.test.ts (4 tests) 25ms
 ✓ src/midi/voiceAudition.test.ts (2 tests) 13ms
 ✓ src/history/history.test.ts (4 tests) 8ms
 ✓ src/domain/operatorLevels.test.ts (5 tests) 9ms
 ✓ src/catalog/catalogManifest.test.ts (2 tests) 19ms
 ✓ src/midi/monitor.test.ts (3 tests) 6ms
 ✓ src/midi/portPreferences.test.ts (4 tests) 6ms
 ✓ src/midi/fm1Protocol.test.ts (5 tests) 11ms
 ✓ src/components/AlgorithmGraph.test.ts (2 tests) 48ms
 ✓ src/midi/fxProtocol.test.ts (3 tests) 10ms
 ✓ src/catalog/catalogSysexValidation.test.ts (4 tests) 12ms
 ✓ src/midi/sequenceScheduler.test.ts (1 test) 6ms
 ✓ src/catalog/remoteSysex.test.ts (2 tests) 63ms
 ✓ src/catalog/trackedArchive.test.ts (1 test) 311ms
     ✓ is the exact audited ZIP and indexes all supported banks  308ms
 ✓ src/domain/bank.test.ts (2 tests) 4ms
 ✓ src/domain/dx7Note.test.ts (2 tests) 4ms

 Test Files  31 passed (31)
      Tests  115 passed (115)
   Start at  10:40:00
   Duration  2.50s (transform 625ms, setup 0ms, import 1.27s, tests 877ms, environment 5ms)

```

## Build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

vite v8.2.0 building client environment for production...
transforming...✓ 82 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.96 kB │ gzip:   0.46 kB
dist/assets/index-Dr0lVQxS.css   59.92 kB │ gzip:  11.84 kB
dist/assets/index-urj-ykjR.js   391.14 kB │ gzip: 115.70 kB

✓ built in 264ms
Service worker generated with 7 precached URLs (513e73e723d78171).
```
