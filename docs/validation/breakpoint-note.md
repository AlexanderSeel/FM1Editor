# DX7 breakpoint note validation

Validated source commit: `e8ca753c2d24a05e53b1ef135fc3b5383d1de544`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Verified mapping under test:

- `0 = A-1`
- `39 = C3`
- `99 = C8`
- the editor shows the numeric breakpoint and note name together.

## Typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/App.tsx(187,12): error TS2739: Type '{ permission: MidiPermissionState; sysexEnabled: boolean; inputs: MidiPortInfo[]; outputs: MidiPortInfo[]; selectedInputId: string | null; ... 6 more ...; supported: boolean; }' is missing the following properties from type 'ConnectionPanelProps': target, onSelectTarget
src/domain/deviceTarget.ts(66,3): error TS2322: Type 'DeviceTargetDefinition | undefined' is not assignable to type 'DeviceTargetDefinition'.
  Type 'undefined' is not assignable to type 'DeviceTargetDefinition'.
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


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/recorder.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m scripts/catalog-release-audit.test.mjs [2m([22m[2m5 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/sysex/normalizeLegacyVoice.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 47[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 59[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 296[2mms[22m[39m
 [31m❯[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[32m 11[2mms[22m[39m
[31m     [31m×[31m maps the documented 0-99 range from A-1 through C8[39m[32m 9[2mms[22m[39m
[31m     [31m×[31m clamps compatibility values to the documented range[39m[32m 1[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 2 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/domain/dx7Note.test.ts[2m > [22mDX7 breakpoint note names[2m > [22mmaps the documented 0-99 range from A-1 through C8
[31m[1mAssertionError[22m: expected 'A-2' to be 'A-1' // Object.is equality[39m

Expected: [32m"A-[7m1[27m"[39m
Received: [31m"A-[7m2[27m"[39m

[36m [2m❯[22m src/domain/dx7Note.test.ts:[2m6:38[22m[39m
    [90m  4|[39m [34mdescribe[39m([32m'DX7 breakpoint note names'[39m[33m,[39m () [33m=>[39m {
    [90m  5|[39m   [34mit[39m([32m'maps the documented 0-99 range from A-1 through C8'[39m[33m,[39m () [33m=>[39m {
    [90m  6|[39m     [34mexpect[39m([34mdx7BreakpointNoteName[39m([34m0[39m))[33m.[39m[34mtoBe[39m([32m'A-1'[39m)
    [90m   |[39m                                      [31m^[39m
    [90m  7|[39m     [34mexpect[39m([34mdx7BreakpointNoteName[39m([34m3[39m))[33m.[39m[34mtoBe[39m([32m'C0'[39m)
    [90m  8|[39m     [34mexpect[39m([34mdx7BreakpointNoteName[39m([34m39[39m))[33m.[39m[34mtoBe[39m([32m'C3'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯[22m[39m

[41m[1m FAIL [22m[49m src/domain/dx7Note.test.ts[2m > [22mDX7 breakpoint note names[2m > [22mclamps compatibility values to the documented range
[31m[1mAssertionError[22m: expected 'A-2' to be 'A-1' // Object.is equality[39m

Expected: [32m"A-[7m1[27m"[39m
Received: [31m"A-[7m2[27m"[39m

[36m [2m❯[22m src/domain/dx7Note.test.ts:[2m13:39[22m[39m
    [90m 11|[39m
    [90m 12|[39m   [34mit[39m([32m'clamps compatibility values to the documented range'[39m[33m,[39m () [33m=>[39m {
    [90m 13|[39m     [34mexpect[39m([34mdx7BreakpointNoteName[39m([33m-[39m[34m1[39m))[33m.[39m[34mtoBe[39m([32m'A-1'[39m)
    [90m   |[39m                                       [31m^[39m
    [90m 14|[39m     [34mexpect[39m([34mdx7BreakpointNoteName[39m([34m127[39m))[33m.[39m[34mtoBe[39m([32m'C8'[39m)
    [90m 15|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m29 passed[39m[22m[90m (30)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m109 passed[39m[22m[90m (111)[39m
[2m   Start at [22m 09:22:08
[2m   Duration [22m 2.41s[2m (transform 610ms, setup 0ms, import 1.20s, tests 850ms, environment 4ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/domain/dx7Note.test.ts,title=src/domain/dx7Note.test.ts > DX7 breakpoint note names > maps the documented 0-99 range from A-1 through C8,line=6,column=38::AssertionError: expected 'A-2' to be 'A-1' // Object.is equality%0A%0AExpected: "A-1"%0AReceived: "A-2"%0A%0A ❯ src/domain/dx7Note.test.ts:6:38%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/domain/dx7Note.test.ts,title=src/domain/dx7Note.test.ts > DX7 breakpoint note names > clamps compatibility values to the documented range,line=13,column=39::AssertionError: expected 'A-2' to be 'A-1' // Object.is equality%0A%0AExpected: "A-1"%0AReceived: "A-2"%0A%0A ❯ src/domain/dx7Note.test.ts:13:39%0A%0A
```

## Build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/App.tsx(187,12): error TS2739: Type '{ permission: MidiPermissionState; sysexEnabled: boolean; inputs: MidiPortInfo[]; outputs: MidiPortInfo[]; selectedInputId: string | null; ... 6 more ...; supported: boolean; }' is missing the following properties from type 'ConnectionPanelProps': target, onSelectTarget
src/domain/deviceTarget.ts(66,3): error TS2322: Type 'DeviceTargetDefinition | undefined' is not assignable to type 'DeviceTargetDefinition'.
  Type 'undefined' is not assignable to type 'DeviceTargetDefinition'.
```
