# Audio → FM optional candidate FX-state software validation

Source commit: `94006d85ba3bbd1800008780372d2b05ea26cea5`

Overall software gate: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| audit | 0 |
| typecheck | 0 |
| lint | 0 |
| focused | 0 |
| full tests | 0 |
| build | 0 |

Refined candidates may explicitly capture a detached FM-1-inspired software FX snapshot. Voice-only audition/export/load remain separate; combined load is explicit and has no hardware send behavior.

```text
=== audit ===

> fm1-editor@0.1.0 audit:virtual-dx7
> node scripts/verify-msfa-source-audit.mjs

MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
=== typecheck ===

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

=== lint ===

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts

=== focused ===

> fm1-editor@0.1.0 test
> vitest run src/audio/dx7CandidateFxState.test.ts src/audio/dx7CandidateArtifacts.test.ts src/audio/dx7CmaEsRefinement.test.ts src/components/NearestPresetPanel.test.tsx


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/dx7CandidateArtifacts.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/audio/dx7CandidateFxState.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEsRefinement.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 105[2mms[22m[39m
 [32m✓[39m src/components/NearestPresetPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m

[2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m      Tests [22m [1m[32m10 passed[39m[22m[90m (10)[39m
[2m   Start at [22m 06:44:24
[2m   Duration [22m 633ms[2m (transform 589ms, setup 0ms, import 897ms, tests 137ms, environment 1ms)[22m

=== test ===

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/msfaAudioWorklet.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m src/audio/nearestPreset.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m src/audio/audioDescriptors.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 119[2mms[22m[39m
 [32m✓[39m src/audio/externalLocalSequenceScheduler.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.property.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 707[2mms[22m[39m
     [33m[2m✓[22m[39m round-trips generated 32-voice banks on every MIDI channel [33m 389[2mms[22m[39m
 [32m✓[39m src/audio/localVoiceAudition.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEsRefinement.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 132[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m src/audio/msfaOfflineEngine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m src/domain/sequenceOperations.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/sysex/normalizeLegacyVoice.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m src/sysex/syntheticFixtureCorpus.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 217[2mms[22m[39m
 [32m✓[39m src/audio/localSequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m src/audio/compactPresetIndex.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 90[2mms[22m[39m
 [32m✓[39m src/audio/referenceAudio.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 175[2mms[22m[39m
 [32m✓[39m scripts/catalog-release-audit.test.mjs [2m([22m[2m5 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/audio/presetDescriptorCache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m src/audio/recorder.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/audio/reconstructionComparison.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1WavRenderer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7Engine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/audio/msfaVoiceBridge.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7ReferenceFixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/sysex/dx7VoiceParameterChange.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxGraph.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/domain/dx7FunctionState.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 37[2mms[22m[39m
[90mstdout[2m | src/audio/libraryVoiceRender.integration.test.ts[2m > [22m[2mreal catalog voice rendering[2m > [22m[2mrenders audible PCM from decoded packed-bank voices through the packaged engine
[22m[39mreal-bank-render {"filename":"sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx","results":[{"slot":1,"name":"BRASS   1","peak":0.480194091796875},{"slot":2,"name":"BRASS   2","peak":0.495941162109375},{"slot":3,"name":"BRASS   3","peak":0.130462646484375},{"slot":4,"name":"STRINGS 1","peak":0.1793212890625},{"slot":5,"name":"STRINGS 2","peak":0.135833740234375},{"slot":6,"name":"STRINGS 3","peak":0.253753662109375},{"slot":7,"name":"ORCHESTRA","peak":0.21185302734375},{"slot":8,"name":"PIANO   1","peak":0.29669189453125}]}

 [32m✓[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 202[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxIsolation.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/dx7Transfer.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/audio/dx7CandidateArtifacts.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m src/components/VirtualDx7PreviewPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 44[2mms[22m[39m
 [32m✓[39m src/layoutRefinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/domain/dx7EditSession.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/sysex/dx7ParameterChange.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/components/NearestPresetPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/components/LocalSequenceAudioPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m src/audio/catalogPresetCandidates.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/dx7LiveParameterRouting.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/components/VirtualFm1PreviewExtras.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1OutputRoute.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m scripts/catalog-output-path.test.mjs [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/domain/pianoRollView.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1PerformanceLimits.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/audio/dx7CandidateFxState.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/components/PersistentWorkspace.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 66[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 268[2mms[22m[39m
 [32m✓[39m src/sysex/originalImport.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m73 passed[39m[22m[90m (73)[39m
[2m      Tests [22m [1m[32m295 passed[39m[22m[90m (295)[39m
[2m   Start at [22m 06:44:25
[2m   Duration [22m 6.60s[2m (transform 1.66s, setup 0ms, import 3.65s, tests 3.15s, environment 12ms)[22m

=== build ===

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

[36mvite v8.2.0 [32mbuilding client environment for production...[36m[39m
[2K
transforming...✓ 127 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.96 kB │ gzip:   0.47 kB
dist/assets/index-Bjp53H8g.css   69.50 kB │ gzip:  13.26 kB
dist/assets/index-DJmooV8I.js   561.59 kB │ gzip: 163.16 kB

[32m✓ built in 395ms[39m
[33m[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
Service worker generated with 7 precached URLs (283792da9151333c).

```
