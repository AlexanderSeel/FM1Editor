# Compact preset index diagnostic

Source commit: `d1874dbff518364430addf1113cc39364ce3c4f2`

Overall gate: **FAILED**

| Stage | Exit |
| --- | ---: |
| typecheck | 1 |
| lint | 0 |
| focused | 1 |
| full tests | 1 |
| build | 1 |

```text
=== typecheck ===

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/audio/compactPresetIndex.ts(139,69): error TS18047: 'target' is possibly 'null'.
src/audio/compactPresetIndex.ts(139,105): error TS18047: 'target' is possibly 'null'.
=== lint ===

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts

=== focused ===

> fm1-editor@0.1.0 test
> vitest run src/audio/compactPresetIndex.test.ts src/audio/nearestPreset.test.ts src/audio/audioDescriptors.test.ts


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/audioDescriptors.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 107[2mms[22m[39m
 [32m✓[39m src/audio/nearestPreset.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 75[2mms[22m[39m
 [31m❯[39m src/audio/compactPresetIndex.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 96[2mms[22m[39m
     [32m✓[39m is deterministic and substantially smaller than the bounded analysis profile[32m 55[2mms[22m[39m
     [32m✓[39m gives zero distance to itself and separates a different tone[32m 11[2mms[22m[39m
[31m     [31m×[31m reuses persistent fingerprints and ranks the matching timbre first[39m[32m 28[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/audio/compactPresetIndex.test.ts[2m > [22mcompact preset index[2m > [22mreuses persistent fingerprints and ranks the matching timbre first
[31m[1mAssertionError[22m: expected [ 'b', 'a' ] to deeply equal [ 'a', 'b' ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[32m-   "a",[39m
[2m    "b",[22m
[31m+   "a",[39m
[2m  ][22m

[36m [2m❯[22m src/audio/compactPresetIndex.test.ts:[2m65:102[22m[39m
    [90m 63|[39m     [34mexpect[39m(cacheHit)[33m.[39m[34mtoHaveBeenCalledTimes[39m([34m2[39m)
    [90m 64|[39m     const reference = createAudioDescriptorFingerprint(createAudioDesc…
    [90m 65|[39m     expect(rankCompactPresetDescriptorIndex(reference, second, { limit…
    [90m   |[39m                                                                                                      [31m^[39m
    [90m 66|[39m     [34mexpect[39m(first[33m.[39mentries)[33m.[39m[34mtoHaveLength[39m([34m2[39m)
    [90m 67|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m2 passed[39m[22m[90m (3)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m11 passed[39m[22m[90m (12)[39m
[2m   Start at [22m 15:08:39
[2m   Duration [22m 513ms[2m (transform 363ms, setup 0ms, import 519ms, tests 278ms, environment 0ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/compactPresetIndex.test.ts,title=src/audio/compactPresetIndex.test.ts > compact preset index > reuses persistent fingerprints and ranks the matching timbre first,line=65,column=102::AssertionError: expected [ 'b', 'a' ] to deeply equal [ 'a', 'b' ]%0A%0A- Expected%0A+ Received%0A%0A  [%0A-   "a",%0A    "b",%0A+   "a",%0A  ]%0A%0A ❯ src/audio/compactPresetIndex.test.ts:65:102%0A%0A
=== test ===

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/msfaAudioWorklet.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/audio/audioDescriptors.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 104[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m src/audio/nearestPreset.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 49[2mms[22m[39m
 [32m✓[39m src/audio/externalLocalSequenceScheduler.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/audio/localVoiceAudition.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.property.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 666[2mms[22m[39m
     [33m[2m✓[22m[39m round-trips generated 32-voice banks on every MIDI channel [33m 359[2mms[22m[39m
 [32m✓[39m src/audio/msfaOfflineEngine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/domain/sequenceOperations.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/sysex/syntheticFixtureCorpus.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 164[2mms[22m[39m
 [32m✓[39m src/sysex/normalizeLegacyVoice.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m src/audio/localSequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m scripts/catalog-release-audit.test.mjs [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/audio/referenceAudio.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 194[2mms[22m[39m
 [31m❯[39m src/audio/compactPresetIndex.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 88[2mms[22m[39m
     [32m✓[39m is deterministic and substantially smaller than the bounded analysis profile[32m 46[2mms[22m[39m
     [32m✓[39m gives zero distance to itself and separates a different tone[32m 9[2mms[22m[39m
[31m     [31m×[31m reuses persistent fingerprints and ranks the matching timbre first[39m[32m 31[2mms[22m[39m
 [32m✓[39m src/audio/presetDescriptorCache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m src/audio/recorder.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7Engine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/audio/msfaVoiceBridge.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7ReferenceFixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/sysex/dx7VoiceParameterChange.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxGraph.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/domain/dx7FunctionState.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 30[2mms[22m[39m
[90mstdout[2m | src/audio/libraryVoiceRender.integration.test.ts[2m > [22m[2mreal catalog voice rendering[2m > [22m[2mrenders audible PCM from decoded packed-bank voices through the packaged engine
[22m[39mreal-bank-render {"filename":"sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx","results":[{"slot":1,"name":"BRASS   1","peak":0.480194091796875},{"slot":2,"name":"BRASS   2","peak":0.495941162109375},{"slot":3,"name":"BRASS   3","peak":0.130462646484375},{"slot":4,"name":"STRINGS 1","peak":0.1793212890625},{"slot":5,"name":"STRINGS 2","peak":0.135833740234375},{"slot":6,"name":"STRINGS 3","peak":0.253753662109375},{"slot":7,"name":"ORCHESTRA","peak":0.21185302734375},{"slot":8,"name":"PIANO   1","peak":0.29669189453125}]}

 [32m✓[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 212[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/dx7Transfer.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/dx7EditSession.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/layoutRefinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/components/LocalSequenceAudioPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/sysex/dx7ParameterChange.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/components/VirtualDx7PreviewPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m src/dx7LiveParameterRouting.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m scripts/catalog-output-path.test.mjs [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/domain/pianoRollView.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 44[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/components/PersistentWorkspace.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/sysex/originalImport.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 237[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[33m 325[2mms[22m[39m
     [33m[2m✓[22m[39m rejects oversized responses before parsing [33m 320[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/audio/compactPresetIndex.test.ts[2m > [22mcompact preset index[2m > [22mreuses persistent fingerprints and ranks the matching timbre first
[31m[1mAssertionError[22m: expected [ 'b', 'a' ] to deeply equal [ 'a', 'b' ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[32m-   "a",[39m
[2m    "b",[22m
[31m+   "a",[39m
[2m  ][22m

[36m [2m❯[22m src/audio/compactPresetIndex.test.ts:[2m65:102[22m[39m
    [90m 63|[39m     [34mexpect[39m(cacheHit)[33m.[39m[34mtoHaveBeenCalledTimes[39m([34m2[39m)
    [90m 64|[39m     const reference = createAudioDescriptorFingerprint(createAudioDesc…
    [90m 65|[39m     expect(rankCompactPresetDescriptorIndex(reference, second, { limit…
    [90m   |[39m                                                                                                      [31m^[39m
    [90m 66|[39m     [34mexpect[39m(first[33m.[39mentries)[33m.[39m[34mtoHaveLength[39m([34m2[39m)
    [90m 67|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m60 passed[39m[22m[90m (61)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m252 passed[39m[22m[90m (253)[39m
[2m   Start at [22m 15:08:40
[2m   Duration [22m 4.85s[2m (transform 1.35s, setup 0ms, import 2.66s, tests 2.87s, environment 8ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/compactPresetIndex.test.ts,title=src/audio/compactPresetIndex.test.ts > compact preset index > reuses persistent fingerprints and ranks the matching timbre first,line=65,column=102::AssertionError: expected [ 'b', 'a' ] to deeply equal [ 'a', 'b' ]%0A%0A- Expected%0A+ Received%0A%0A  [%0A-   "a",%0A    "b",%0A+   "a",%0A  ]%0A%0A ❯ src/audio/compactPresetIndex.test.ts:65:102%0A%0A
=== build ===

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/audio/compactPresetIndex.ts(139,69): error TS18047: 'target' is possibly 'null'.
src/audio/compactPresetIndex.ts(139,105): error TS18047: 'target' is possibly 'null'.

```
