# Renderer-backed CMA-ES retrieval UI software gate

Source commit: `bd07ab95ba1186ccf54f1884230bd946cca726c3`

Overall software gate: **FAILED**

| Stage | Exit |
| --- | ---: |
| audit | 0 |
| typecheck | 1 |
| lint | 1 |
| focused | 1 |
| full tests | 1 |
| build | 1 |

On a successful gate the mounted nearest-preset panel exposes an explicit second-stage CMA-ES refinement over the top three retrieval candidates. The default search mutates only six operator output levels plus feedback, uses seed 2026, persistent local fingerprint caching, progress/cancel, and separate refined Audition/Load actions. No candidate is auto-loaded or transmitted.

The PLAN item remains open until Chrome/Edge prove the mounted refinement path and zero Web MIDI requests.

```text
=== audit ===

> fm1-editor@0.1.0 audit:virtual-dx7
> node scripts/verify-msfa-source-audit.mjs

MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
=== typecheck ===

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/components/NearestPresetPanel.tsx(492,7): error TS1005: ')' expected.
src/components/NearestPresetPanel.tsx(519,8): error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
=== lint ===

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts


/home/runner/work/FM1Editor/FM1Editor/src/components/NearestPresetPanel.tsx
  492:6  error  Parsing error: ')' expected

✖ 1 problem (1 error, 0 warnings)

=== focused ===

> fm1-editor@0.1.0 test
> vitest run src/audio/dx7CmaEs.test.ts src/audio/dx7CmaEsRefinement.test.ts src/components/NearestPresetPanel.test.tsx src/audio/compactPresetIndex.test.ts


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/dx7CmaEs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEsRefinement.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 100[2mms[22m[39m
 [32m✓[39m src/audio/compactPresetIndex.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 110[2mms[22m[39m
 [31m❯[39m src/components/NearestPresetPanel.test.tsx [2m([22m[2m0 test[22m[2m)[22m

[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Suites 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/components/NearestPresetPanel.test.tsx[2m [ src/components/NearestPresetPanel.test.tsx ][22m
[31m[1mError[22m: Transform failed with 1 error:

[31m[PARSE_ERROR] [0mExpected `,` or `)` but found `{`
     [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m src/components/NearestPresetPanel.tsx:492:7 [38;5;246m][0m
     [38;5;246m│[0m
 [38;5;246m457 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m{[0m[38;5;249mr[0m[38;5;249me[0m[38;5;249ms[0m[38;5;249mu[0m[38;5;249ml[0m[38;5;249mt[0m[38;5;249ms[0m[38;5;249m.[0m[38;5;249ml[0m[38;5;249me[0m[38;5;249mn[0m[38;5;249mg[0m[38;5;249mt[0m[38;5;249mh[0m[38;5;249m [0m[38;5;249m>[0m[38;5;249m [0m[38;5;249m0[0m[38;5;249m [0m[38;5;249m&[0m[38;5;249m&[0m[38;5;249m [0m(
 [38;5;240m    │[0m                              ┬  
 [38;5;240m    │[0m                              ╰── Opened here
 [38;5;240m    │[0m 
 [38;5;246m492 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m{[38;5;249mr[0m[38;5;249me[0m[38;5;249mf[0m[38;5;249mi[0m[38;5;249mn[0m[38;5;249me[0m[38;5;249mm[0m[38;5;249me[0m[38;5;249mn[0m[38;5;249mt[0m[38;5;249mR[0m[38;5;249me[0m[38;5;249ms[0m[38;5;249mu[0m[38;5;249ml[0m[38;5;249mt[0m[38;5;249ms[0m[38;5;249m.[0m[38;5;249ml[0m[38;5;249me[0m[38;5;249mn[0m[38;5;249mg[0m[38;5;249mt[0m[38;5;249mh[0m[38;5;249m [0m[38;5;249m>[0m[38;5;249m [0m[38;5;249m0[0m[38;5;249m [0m[38;5;249m&[0m[38;5;249m&[0m[38;5;249m [0m[38;5;249m([0m
 [38;5;240m    │[0m       ┬  
 [38;5;240m    │[0m       ╰── `,` or `)` expected
[38;5;246m─────╯[0m
[39m
  Plugin: [35mvite:oxc[39m
  File: [36m/home/runner/work/FM1Editor/FM1Editor/src/components/NearestPresetPanel.tsx[39m
[90m [2m❯[22m transformWithOxc node_modules/vite/dist/node/chunks/node.js:[2m4090:19[22m[39m
[90m [2m❯[22m TransformPluginContext.transform node_modules/vite/dist/node/chunks/node.js:[2m4161:26[22m[39m
[90m [2m❯[22m EnvironmentPluginContainer.transform node_modules/vite/dist/node/chunks/node.js:[2m30796:51[22m[39m
[90m [2m❯[22m loadAndTransform node_modules/vite/dist/node/chunks/node.js:[2m20594:26[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m3 passed[39m[22m[90m (4)[39m
[2m      Tests [22m [1m[32m11 passed[39m[22m[90m (11)[39m
[2m   Start at [22m 16:20:01
[2m   Duration [22m 579ms[2m (transform 372ms, setup 0ms, import 528ms, tests 244ms, environment 0ms)[22m

=== test ===

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/msfaAudioWorklet.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m src/audio/nearestPreset.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 70[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m src/audio/audioDescriptors.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 112[2mms[22m[39m
 [32m✓[39m src/audio/externalLocalSequenceScheduler.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.property.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 642[2mms[22m[39m
     [33m[2m✓[22m[39m round-trips generated 32-voice banks on every MIDI channel [33m 360[2mms[22m[39m
 [32m✓[39m src/audio/localSequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/audio/localVoiceAudition.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m src/audio/compactPresetIndex.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 96[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEsRefinement.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 139[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m src/audio/msfaOfflineEngine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/domain/sequenceOperations.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/sysex/syntheticFixtureCorpus.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 190[2mms[22m[39m
 [32m✓[39m src/sysex/normalizeLegacyVoice.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m scripts/catalog-release-audit.test.mjs [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/audio/referenceAudio.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 167[2mms[22m[39m
 [32m✓[39m src/audio/presetDescriptorCache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/audio/recorder.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7Engine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1WavRenderer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/audio/msfaVoiceBridge.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7ReferenceFixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/sysex/dx7VoiceParameterChange.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxGraph.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/domain/dx7FunctionState.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 30[2mms[22m[39m
[90mstdout[2m | src/audio/libraryVoiceRender.integration.test.ts[2m > [22m[2mreal catalog voice rendering[2m > [22m[2mrenders audible PCM from decoded packed-bank voices through the packaged engine
[22m[39mreal-bank-render {"filename":"sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx","results":[{"slot":1,"name":"BRASS   1","peak":0.480194091796875},{"slot":2,"name":"BRASS   2","peak":0.495941162109375},{"slot":3,"name":"BRASS   3","peak":0.130462646484375},{"slot":4,"name":"STRINGS 1","peak":0.1793212890625},{"slot":5,"name":"STRINGS 2","peak":0.135833740234375},{"slot":6,"name":"STRINGS 3","peak":0.253753662109375},{"slot":7,"name":"ORCHESTRA","peak":0.21185302734375},{"slot":8,"name":"PIANO   1","peak":0.29669189453125}]}

 [32m✓[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 201[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/dx7Transfer.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/components/VirtualDx7PreviewPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/domain/dx7EditSession.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [31m❯[39m src/components/NearestPresetPanel.test.tsx [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m src/layoutRefinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/components/LocalSequenceAudioPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/sysex/dx7ParameterChange.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/audio/catalogPresetCandidates.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/dx7LiveParameterRouting.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/components/VirtualFm1PreviewExtras.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1OutputRoute.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m scripts/catalog-output-path.test.mjs [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/domain/pianoRollView.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 40[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/components/PersistentWorkspace.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 63[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 257[2mms[22m[39m
 [32m✓[39m src/sysex/originalImport.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Suites 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/components/NearestPresetPanel.test.tsx[2m [ src/components/NearestPresetPanel.test.tsx ][22m
[31m[1mError[22m: Transform failed with 1 error:

[31m[PARSE_ERROR] [0mExpected `,` or `)` but found `{`
     [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m src/components/NearestPresetPanel.tsx:492:7 [38;5;246m][0m
     [38;5;246m│[0m
 [38;5;246m457 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m{[0m[38;5;249mr[0m[38;5;249me[0m[38;5;249ms[0m[38;5;249mu[0m[38;5;249ml[0m[38;5;249mt[0m[38;5;249ms[0m[38;5;249m.[0m[38;5;249ml[0m[38;5;249me[0m[38;5;249mn[0m[38;5;249mg[0m[38;5;249mt[0m[38;5;249mh[0m[38;5;249m [0m[38;5;249m>[0m[38;5;249m [0m[38;5;249m0[0m[38;5;249m [0m[38;5;249m&[0m[38;5;249m&[0m[38;5;249m [0m(
 [38;5;240m    │[0m                              ┬  
 [38;5;240m    │[0m                              ╰── Opened here
 [38;5;240m    │[0m 
 [38;5;246m492 │[0m [38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m[38;5;249m [0m{[38;5;249mr[0m[38;5;249me[0m[38;5;249mf[0m[38;5;249mi[0m[38;5;249mn[0m[38;5;249me[0m[38;5;249mm[0m[38;5;249me[0m[38;5;249mn[0m[38;5;249mt[0m[38;5;249mR[0m[38;5;249me[0m[38;5;249ms[0m[38;5;249mu[0m[38;5;249ml[0m[38;5;249mt[0m[38;5;249ms[0m[38;5;249m.[0m[38;5;249ml[0m[38;5;249me[0m[38;5;249mn[0m[38;5;249mg[0m[38;5;249mt[0m[38;5;249mh[0m[38;5;249m [0m[38;5;249m>[0m[38;5;249m [0m[38;5;249m0[0m[38;5;249m [0m[38;5;249m&[0m[38;5;249m&[0m[38;5;249m [0m[38;5;249m([0m
 [38;5;240m    │[0m       ┬  
 [38;5;240m    │[0m       ╰── `,` or `)` expected
[38;5;246m─────╯[0m
[39m
  Plugin: [35mvite:oxc[39m
  File: [36m/home/runner/work/FM1Editor/FM1Editor/src/components/NearestPresetPanel.tsx[39m
[90m [2m❯[22m transformWithOxc node_modules/vite/dist/node/chunks/node.js:[2m4090:19[22m[39m
[90m [2m❯[22m TransformPluginContext.transform node_modules/vite/dist/node/chunks/node.js:[2m4161:26[22m[39m
[90m [2m❯[22m EnvironmentPluginContainer.transform node_modules/vite/dist/node/chunks/node.js:[2m30796:51[22m[39m
[90m [2m❯[22m loadAndTransform node_modules/vite/dist/node/chunks/node.js:[2m20594:26[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m67 passed[39m[22m[90m (68)[39m
[2m      Tests [22m [1m[32m274 passed[39m[22m[90m (274)[39m
[2m   Start at [22m 16:20:02
[2m   Duration [22m 5.98s[2m (transform 1.46s, setup 0ms, import 3.13s, tests 2.95s, environment 11ms)[22m

=== build ===

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/components/NearestPresetPanel.tsx(492,7): error TS1005: ')' expected.
src/components/NearestPresetPanel.tsx(519,8): error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?

```
