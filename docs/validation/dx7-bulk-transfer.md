# Yamaha DX7 bulk transfer validation

Validated source commit: `9d581c936c0203607e34cb74aee0a2b2b82d49d1`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **FAILURE**
- npm run build: **SUCCESS**
- guarded DX7 transfer marker check: **SUCCESS**

- software tests cover channel-addressed 163-byte single-voice and 4,104-byte 32-voice bank messages.
- parameter changes, function data and device dump requests remain disabled.
- physical Yamaha DX7 reception and memory behavior remain unverified.

## Install output

```text

added 317 packages, and audited 318 packages in 17s

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

 ✓ scripts/catalog-release-audit.test.mjs (5 tests) 39ms
 ✓ src/audio/recorder.test.ts (8 tests) 22ms
 ✓ src/sysex/dx7.test.ts (9 tests) 38ms
 ✓ src/domain/voiceVariations.test.ts (5 tests) 17ms
 ✓ src/domain/deviceTarget.test.ts (6 tests) 13ms
 ✓ src/sysex/normalizeLegacyVoice.test.ts (2 tests) 19ms
 ✓ src/catalog/patchCatalog.test.ts (3 tests) 27ms
 ✓ src/library/backup.test.ts (3 tests) 34ms
 ✓ src/domain/keyboardScalingGeometry.test.ts (6 tests) 17ms
 ❯ src/midi/dx7Transfer.test.ts (3 tests | 1 failed) 22ms
     ✓ sends all notes off followed by one channel-addressed single voice 8ms
     ✓ sends one complete channel-addressed 32-voice bank 8ms
     × rejects invalid channels and incomplete banks before opening the output 4ms
 ✓ src/midi/fm1BankTransfer.test.ts (4 tests) 19ms
 ✓ src/domain/envelopeGeometry.test.ts (5 tests) 18ms
 ✓ src/library/storageMigration.test.ts (3 tests) 18ms
 ✓ src/domain/dx7Algorithms.test.ts (5 tests) 13ms
 ✓ src/sysex/importSysex.test.ts (2 tests) 10ms
 ✓ src/library/model.test.ts (4 tests) 25ms
 ✓ src/history/history.test.ts (4 tests) 9ms
 ✓ src/midi/voiceAudition.test.ts (2 tests) 12ms
 ✓ src/domain/operatorLevels.test.ts (5 tests) 9ms
 ✓ src/midi/monitor.test.ts (3 tests) 7ms
 ✓ src/catalog/catalogManifest.test.ts (2 tests) 22ms
 ✓ src/midi/fm1Protocol.test.ts (5 tests) 9ms
 ✓ src/midi/portPreferences.test.ts (4 tests) 5ms
 ✓ src/components/AlgorithmGraph.test.ts (2 tests) 59ms
 ✓ src/midi/fxProtocol.test.ts (3 tests) 9ms
 ✓ src/catalog/catalogSysexValidation.test.ts (4 tests) 20ms
 ✓ src/catalog/remoteSysex.test.ts (2 tests) 58ms
 ✓ src/midi/sequenceScheduler.test.ts (1 test) 10ms
 ✓ src/domain/dx7Note.test.ts (2 tests) 5ms
 ✓ src/domain/bank.test.ts (2 tests) 6ms
 ✓ src/catalog/trackedArchive.test.ts (1 test) 300ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/midi/dx7Transfer.test.ts > Yamaha DX7 bulk transfer > rejects invalid channels and incomplete banks before opening the output
RangeError: MIDI channel must be from 1 to 16; received 0.
 ❯ assertMidiChannel src/midi/dx7Transfer.ts:21:11
     19| function assertMidiChannel(midiChannel: number): void {
     20|   if (!Number.isInteger(midiChannel) || midiChannel < 1 || midiChannel…
     21|     throw new RangeError(`MIDI channel must be from 1 to 16; received …
       |           ^
     22|   }
     23| }
 ❯ sendSingleVoiceToDx7 src/midi/dx7Transfer.ts:54:3
 ❯ src/midi/dx7Transfer.test.ts:73:18

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 30 passed (31)
      Tests  1 failed | 114 passed (115)
   Start at  10:38:59
   Duration  2.62s (transform 748ms, setup 0ms, import 1.42s, tests 888ms, environment 5ms)


::error file=/home/runner/work/FM1Editor/FM1Editor/src/midi/dx7Transfer.ts,title=src/midi/dx7Transfer.test.ts > Yamaha DX7 bulk transfer > rejects invalid channels and incomplete banks before opening the output,line=21,column=11::RangeError: MIDI channel must be from 1 to 16; received 0.%0A ❯ assertMidiChannel src/midi/dx7Transfer.ts:21:11%0A ❯ sendSingleVoiceToDx7 src/midi/dx7Transfer.ts:54:3%0A ❯ src/midi/dx7Transfer.test.ts:73:18%0A%0A
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
dist/assets/index-D881D1A5.js   391.13 kB │ gzip: 115.70 kB

✓ built in 275ms
Service worker generated with 7 precached URLs (68206541e443c7ee).
```
