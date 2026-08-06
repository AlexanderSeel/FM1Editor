# Device target capability routing validation

Validated source commit: `17a5b1d07cf3569079041d106fae122ab16dcbfe`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **SUCCESS**
- npm run build: **SUCCESS**
- target routing marker check: **SUCCESS**

Physical FM-1 and Yamaha DX7 hardware behavior remains unverified.

## Install output

```text

added 317 packages, and audited 318 packages in 15s

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

 ✓ scripts/catalog-release-audit.test.mjs (5 tests) 33ms
 ✓ src/audio/recorder.test.ts (8 tests) 17ms
 ✓ src/sysex/dx7.test.ts (9 tests) 32ms
 ✓ src/domain/deviceTarget.test.ts (6 tests) 11ms
 ✓ src/domain/voiceVariations.test.ts (5 tests) 15ms
 ✓ src/sysex/normalizeLegacyVoice.test.ts (2 tests) 16ms
 ✓ src/library/backup.test.ts (3 tests) 32ms
 ✓ src/catalog/patchCatalog.test.ts (3 tests) 22ms
 ✓ src/domain/keyboardScalingGeometry.test.ts (6 tests) 11ms
 ✓ src/domain/envelopeGeometry.test.ts (5 tests) 11ms
 ✓ src/library/storageMigration.test.ts (3 tests) 20ms
 ✓ src/midi/fm1BankTransfer.test.ts (4 tests) 17ms
 ✓ src/domain/dx7Algorithms.test.ts (5 tests) 19ms
 ✓ src/sysex/importSysex.test.ts (2 tests) 17ms
 ✓ src/library/model.test.ts (4 tests) 30ms
 ✓ src/midi/voiceAudition.test.ts (2 tests) 11ms
 ✓ src/history/history.test.ts (4 tests) 6ms
 ✓ src/domain/operatorLevels.test.ts (5 tests) 6ms
 ✓ src/midi/monitor.test.ts (3 tests) 7ms
 ✓ src/catalog/catalogManifest.test.ts (2 tests) 20ms
 ✓ src/midi/portPreferences.test.ts (4 tests) 5ms
 ✓ src/midi/fm1Protocol.test.ts (5 tests) 6ms
 ✓ src/midi/fxProtocol.test.ts (3 tests) 8ms
 ✓ src/components/AlgorithmGraph.test.ts (2 tests) 41ms
 ✓ src/catalog/catalogSysexValidation.test.ts (4 tests) 13ms
 ✓ src/midi/sequenceScheduler.test.ts (1 test) 7ms
 ✓ src/catalog/remoteSysex.test.ts (2 tests) 52ms
 ✓ src/domain/bank.test.ts (2 tests) 4ms
 ✓ src/catalog/trackedArchive.test.ts (1 test) 285ms
 ✓ src/domain/dx7Note.test.ts (2 tests) 3ms

 Test Files  30 passed (30)
      Tests  112 passed (112)
   Start at  10:29:43
   Duration  2.22s (transform 557ms, setup 0ms, import 1.11s, tests 779ms, environment 4ms)

```

## Build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

vite v8.2.0 building client environment for production...
transforming...✓ 81 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.96 kB │ gzip:   0.47 kB
dist/assets/index-B_9qeqHP.css   60.27 kB │ gzip:  11.89 kB
dist/assets/index-B1tGqUkC.js   386.43 kB │ gzip: 114.74 kB

✓ built in 259ms
Service worker generated with 7 precached URLs (56eaa82a51060f61).
```
