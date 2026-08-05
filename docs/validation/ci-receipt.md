# CI validation receipt

- Validated commit: `30a2ad80ad683d6b9c1c32109eea102150a6581a`
- Node: `v22.23.1`
- npm install: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity: **PASS**
- npm run typecheck: **FAIL (2)**
- npm run test: **FAIL (1)**
- npm run build: **FAIL (2)**

Expected archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

Actual archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

## install output

```text

added 70 packages in 9s

```

## archive output

```text
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc108b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc112a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc104b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc108a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc112b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/ROM2A.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc109a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc105b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/ROM2B.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc109b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc105a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc102b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc102a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc103a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc103b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc101a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc101b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/ROM1B.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc110a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc106a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc110b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc106b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc107b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc111b.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc107a.syx   OK
    testing: sysexFinal/0_Original_Yamaha/0_DX7/vrc111a.syx   OK
    testing: __MACOSX/sysexFinal/0_Original_Yamaha/._0_DX7   OK
    testing: sysexFinal/0_Original_Yamaha/DX7-TX81Z/   OK
    testing: sysexFinal/0_Original_Yamaha/DX7-TX81Z/DX7-TX81Z-1.syx   OK
    testing: sysexFinal/0_Original_Yamaha/DX7-TX81Z/DX7-TX81Z-2.syx   OK
    testing: sysexFinal/0_Original_Yamaha/DX7-TX81Z/DX7-TX81Z-3.syx   OK
    testing: sysexFinal/0_Original_Yamaha/DX7-TX81Z/DX7-TX81Z-4.syx   OK
    testing: __MACOSX/sysexFinal/0_Original_Yamaha/._DX7-TX81Z   OK
    testing: __MACOSX/sysexFinal/._0_Original_Yamaha   OK
    testing: sysexFinal/Miguel_Ratton/   OK
    testing: sysexFinal/Miguel_Ratton/RATTON01.syx   OK
    testing: sysexFinal/Miguel_Ratton/RATTON02.syx   OK
    testing: __MACOSX/sysexFinal/._Miguel_Ratton   OK
    testing: sysexFinal/Mukaiya/      OK
    testing: sysexFinal/Mukaiya/MUKAIYA01.syx   OK
    testing: sysexFinal/Mukaiya/MUKAIYA02.syx   OK
    testing: __MACOSX/sysexFinal/._Mukaiya   OK
    testing: sysexFinal/Hollywood_Sounds/   OK
    testing: sysexFinal/Hollywood_Sounds/HOLLYWOOD01.syx   OK
    testing: sysexFinal/Hollywood_Sounds/HOLLYWOOD03.syx   OK
    testing: sysexFinal/Hollywood_Sounds/HOLLYWOOD02.syx   OK
    testing: sysexFinal/Hollywood_Sounds/HOLLYWOOD05.syx   OK
    testing: sysexFinal/Hollywood_Sounds/HOLLYWOOD04.syx   OK
    testing: __MACOSX/sysexFinal/._Hollywood_Sounds   OK
    testing: sysexFinal/Godric/       OK
    testing: sysexFinal/Godric/GPERC02.syx   OK
    testing: sysexFinal/Godric/GPERC03.syx   OK
    testing: sysexFinal/Godric/GPERC01.syx   OK
    testing: sysexFinal/Godric/GSYNSUS08.syx   OK
    testing: sysexFinal/Godric/GBELL.syx   OK
    testing: sysexFinal/Godric/GPERC04.syx   OK
    testing: sysexFinal/Godric/GBRASS01.syx   OK
    testing: sysexFinal/Godric/GPIANO01.syx   OK
    testing: sysexFinal/Godric/GPIANO03.syx   OK
    testing: sysexFinal/Godric/GBRASS02.syx   OK
    testing: sysexFinal/Godric/GPIANO02.syx   OK
    testing: sysexFinal/Godric/GWOODWIND.syx   OK
    testing: sysexFinal/Godric/GSYNDEC02.syx   OK
    testing: sysexFinal/Godric/GETHER03.syx   OK
    testing: sysexFinal/Godric/GETHER02.syx   OK
    testing: sysexFinal/Godric/GSYNDEC03.syx   OK
    testing: sysexFinal/Godric/GSYNDEC01.syx   OK
    testing: sysexFinal/Godric/GETHER01.syx   OK
    testing: sysexFinal/Godric/GSYNDEC04.syx   OK
    testing: sysexFinal/Godric/GPLUCK01.syx   OK
    testing: sysexFinal/Godric/GSTRNGSOL.syx   OK
    testing: sysexFinal/Godric/GSTRNGAC.syx   OK
    testing: sysexFinal/Godric/GPLUCK02.syx   OK
    testing: sysexFinal/Godric/GBASS01.syx   OK
    testing: sysexFinal/Godric/GSTRNGSYN.syx   OK
    testing: sysexFinal/Godric/GBASS02.syx   OK
    testing: sysexFinal/Godric/GBASS03.syx   OK
    testing: sysexFinal/Godric/GORGAN.syx   OK
    testing: sysexFinal/Godric/GFX03.syx   OK
    testing: sysexFinal/Godric/GSYNSUS03.syx   OK
    testing: sysexFinal/Godric/GSYNSUS02.syx   OK
    testing: sysexFinal/Godric/GFX02.syx   OK
    testing: sysexFinal/Godric/GCMPST04.syx   OK
    testing: sysexFinal/Godric/GSYNSUS01.syx   OK
    testing: sysexFinal/Godric/GFX01.syx   OK
    testing: sysexFinal/Godric/GCHOIR.syx   OK
    testing: sysexFinal/Godric/GSYNSUS05.syx   OK
    testing: sysexFinal/Godric/GCMPST01.syx   OK
    testing: sysexFinal/Godric/GSYNSUS04.syx   OK
    testing: sysexFinal/Godric/GFX04.syx   OK
    testing: sysexFinal/Godric/GSYNSUS06.syx   OK
    testing: sysexFinal/Godric/GCMPST03.syx   OK
    testing: sysexFinal/Godric/GCMPST02.syx   OK
    testing: sysexFinal/Godric/GSYNSUS07.syx   OK
    testing: sysexFinal/Godric/GSYNSOLO.syx   OK
    testing: __MACOSX/sysexFinal/._Godric   OK
    testing: sysexFinal/DX7Extra/     OK
    testing: sysexFinal/DX7Extra/DX7EXTRA05.syx   OK
    testing: sysexFinal/DX7Extra/DX7EXTRA04.syx   OK
    testing: sysexFinal/DX7Extra/DX7EXTRA06.syx   OK
    testing: sysexFinal/DX7Extra/DX7EXTRA07.syx   OK
    testing: sysexFinal/DX7Extra/DX7EXTRA03.syx   OK
    testing: sysexFinal/DX7Extra/DX7EXTRA02.syx   OK
    testing: sysexFinal/DX7Extra/DX7EXTRA01.syx   OK
    testing: __MACOSX/sysexFinal/._DX7Extra   OK
    testing: sysexFinal/Jeff_Saxe/    OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE009.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE008.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE005.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE011.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE010.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE004.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE012.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE006.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE007.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE013.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE003.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE002.syx   OK
    testing: sysexFinal/Jeff_Saxe/JEFFSAXE001.syx   OK
    testing: __MACOSX/sysexFinal/._Jeff_Saxe   OK
    testing: sysexFinal/SoundSations/   OK
    testing: sysexFinal/SoundSations/SOUNDSATION04.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION10.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION11.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION05.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION13.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION07.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION06.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION12.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION16.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION02.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION03.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION17.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION01.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION15.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION14.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION19.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION18.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION20.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION08.syx   OK
    testing: sysexFinal/SoundSations/SOUNDSATION09.syx   OK
    testing: __MACOSX/sysexFinal/._SoundSations   OK
    testing: sysexFinal/Ajay/         OK
    testing: sysexFinal/Ajay/AJAY02.syx   OK
    testing: sysexFinal/Ajay/AJAY01.syx   OK
    testing: __MACOSX/sysexFinal/._Ajay   OK
    testing: sysexFinal/Giorgio_Robino/   OK
    testing: sysexFinal/Giorgio_Robino/GROBINO.syx   OK
    testing: __MACOSX/sysexFinal/._Giorgio_Robino   OK
    testing: sysexFinal/Frank_Carvalho/   OK
    testing: sysexFinal/Frank_Carvalho/FCARVALHO01.syx   OK
    testing: sysexFinal/Frank_Carvalho/FCARVALHO02.syx   OK
    testing: __MACOSX/sysexFinal/._Frank_Carvalho   OK
    testing: sysexFinal/ShoFuKu/      OK
    testing: sysexFinal/ShoFuKu/SHOFUKU01.syx   OK
    testing: sysexFinal/ShoFuKu/SHOFUKU02.syx   OK
    testing: __MACOSX/sysexFinal/._ShoFuKu   OK
    testing: __MACOSX/._sysexFinal    OK
No errors detected in compressed data of public/catalog/sysexFinal.zip.

```

## typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

tsconfig.node.json(7,35): error TS5096: Option 'allowImportingTsExtensions' can only be used when either 'noEmit' or 'emitDeclarationOnly' is set.

```

## test output

```text

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [31m❯[39m src/sysex/dx7.test.ts [2m([22m[2m5 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 20[2mms[22m[39m
     [32m✓[39m returns the masked two-complement checksum[32m 2[2mms[22m[39m
[31m     [31m×[31m round-trips the editable voice model[39m[32m 7[2mms[22m[39m
     [32m✓[39m rejects a modified payload with a stale checksum[32m 1[2mms[22m[39m
     [32m✓[39m encodes and decodes 32 packed voices[32m 5[2mms[22m[39m
     [32m✓[39m extracts multiple messages and classifies known DX7 formats[32m 3[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 98[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 308[2mms[22m[39m
     [33m[2m✓[22m[39m is the exact audited ZIP and indexes all supported banks [33m 306[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/sysex/dx7.test.ts[2m > [22mDX7 single voice[2m > [22mround-trips the editable voice model
[31m[1mAssertionError[22m: expected 'TEST VOICE' to be 'TEST VOIC' // Object.is equality[39m

Expected: [32m"TEST VOIC"[39m
Received: [31m"TEST VOIC[7mE[27m"[39m

[36m [2m❯[22m src/sysex/dx7.test.ts:[2m27:32[22m[39m
    [90m 25|[39m     [34mexpect[39m(message)[33m.[39m[34mtoHaveLength[39m([34m163[39m)
    [90m 26|[39m     [34mexpect[39m(decoded[33m.[39mchannel)[33m.[39m[34mtoBe[39m([34m3[39m)
    [90m 27|[39m     [34mexpect[39m(decoded[33m.[39mvoice[33m.[39mname)[33m.[39m[34mtoBe[39m([32m'TEST VOIC'[39m)
    [90m   |[39m                                [31m^[39m
    [90m 28|[39m     [34mexpect[39m(decoded[33m.[39mvoice[33m.[39malgorithm)[33m.[39m[34mtoBe[39m([34m1[39m)
    [90m 29|[39m     [34mexpect[39m(decoded[33m.[39mvoice[33m.[39moperators[[34m0[39m][33m.[39moutputLevel)[33m.[39m[34mtoBe[39m([34m99[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m10 passed[39m[22m[90m (11)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m29 passed[39m[22m[90m (30)[39m
[2m   Start at [22m 09:14:22
[2m   Duration [22m 1.04s[2m (transform 290ms, setup 0ms, import 563ms, tests 540ms, environment 2ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/sysex/dx7.test.ts,title=src/sysex/dx7.test.ts > DX7 single voice > round-trips the editable voice model,line=27,column=32::AssertionError: expected 'TEST VOICE' to be 'TEST VOIC' // Object.is equality%0A%0AExpected: "TEST VOIC"%0AReceived: "TEST VOICE"%0A%0A ❯ src/sysex/dx7.test.ts:27:32%0A%0A

```

## build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build

tsconfig.node.json(7,35): error TS5096: Option 'allowImportingTsExtensions' can only be used when either 'noEmit' or 'emitDeclarationOnly' is set.

```
