# Packaged-engine synthetic reconstruction comparison

Source commit: `428118c0b8eccc7715412d33179f19045f6e3aed`

Overall benchmark gate: **FAILED**

| Stage | Exit |
| --- | ---: |
| audit | 0 |
| upstream audit | 0 |
| typecheck | 1 |
| lint | 0 |
| focused benchmark | 0 |
| full tests | 0 |
| build | 1 |

| Approach | Candidates | Best distance | Runtime ms | Source / failure |
| --- | ---: | ---: | ---: | --- |
| Retrieval only | 3 | 0.04095621 | 0.668 | Repository-owned synthetic start 1 |
| Seeded constrained CMA-ES | 2 | 0.00751358 | 1081.271 | CMA from Repository-owned synthetic start 1 |
| Learned initialization | 0 | — | 0.095 | No license-admitted learned initializer/checkpoint is available yet. |

Retrieval minus evolutionary best-distance delta: `0.03344264`.

Scope remains one repository-owned synthetic ground-truth case through the packaged DX7-compatible MSFA engine. It is not a real isolated-sound benchmark and does not establish learned initialization.

```text
=== audit ===

> fm1-editor@0.1.0 audit:virtual-dx7
> node scripts/verify-msfa-source-audit.mjs

MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
=== upstream ===

> fm1-editor@0.1.0 audit:reconstruction-upstreams
> node scripts/verify-audio-reconstruction-upstreams.mjs

Reconstruction upstream manifest verified: 5 pinned research entries, 0 production admissions.
=== typecheck ===

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/audio/reconstructionComparison.integration.test.ts(121,13): error TS2322: Type '(_case: ReconstructionComparisonCase<{ fingerprintId: string; }>, candidate: ReconstructionCandidate, signal: AbortSignal | undefined) => Promise<...>' is not assignable to type '(testCase: ReconstructionComparisonCase<{ fingerprintId: string; }>, candidate: ReconstructionCandidate, signal?: AbortSignal | undefined) => Promise<...>'.
  Type 'Promise<{ distance: number; metrics: FingerprintMetricBreakdown; }>' is not assignable to type 'Promise<ReconstructionCandidateEvaluation>'.
    Type '{ distance: number; metrics: FingerprintMetricBreakdown; }' is not assignable to type 'ReconstructionCandidateEvaluation'.
      Types of property 'metrics' are incompatible.
        Type 'FingerprintMetricBreakdown' is not assignable to type 'Readonly<Record<string, number>>'.
          Index signature for type 'string' is missing in type 'FingerprintMetricBreakdown'.
=== lint ===

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts

=== focused ===

> fm1-editor@0.1.0 test
> vitest run src/audio/reconstructionComparison.integration.test.ts


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

[90mstdout[2m | src/audio/reconstructionComparison.integration.test.ts[2m > [22m[2mpackaged-engine reconstruction comparison[2m > [22m[2mrecords retrieval, evolutionary and unavailable learned-initialization outcomes on repository-owned synthetic ground truth
[22m[39msynthetic-reconstruction-comparison {"retrievalDistance":0.04095621432849238,"evolutionaryDistance":0.007513576893987815,"retrievalRuntimeMs":0.46350899999998774,"evolutionaryRuntimeMs":768.446396,"learnedFailure":"No license-admitted learned initializer/checkpoint is available yet."}

 [32m✓[39m src/audio/reconstructionComparison.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 867[2mms[22m[39m
     [33m[2m✓[22m[39m records retrieval, evolutionary and unavailable learned-initialization outcomes on repository-owned synthetic ground truth [33m 866[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 06:57:03
[2m   Duration [22m 1.19s[2m (transform 173ms, setup 0ms, import 199ms, tests 867ms, environment 0ms)[22m

=== test ===

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/msfaAudioWorklet.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/audio/nearestPreset.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 54[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.property.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 718[2mms[22m[39m
     [33m[2m✓[22m[39m round-trips generated 32-voice banks on every MIDI channel [33m 388[2mms[22m[39m
 [32m✓[39m src/audio/audioDescriptors.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 80[2mms[22m[39m
 [32m✓[39m src/audio/externalLocalSequenceScheduler.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/audio/localVoiceAudition.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEsRefinement.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 109[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 21[2mms[22m[39m
[90mstdout[2m | src/audio/reconstructionComparison.integration.test.ts[2m > [22m[2mpackaged-engine reconstruction comparison[2m > [22m[2mrecords retrieval, evolutionary and unavailable learned-initialization outcomes on repository-owned synthetic ground truth
[22m[39msynthetic-reconstruction-comparison {"retrievalDistance":0.04095621432849238,"evolutionaryDistance":0.007513576893987815,"retrievalRuntimeMs":0.6675430000000233,"evolutionaryRuntimeMs":1081.270994,"learnedFailure":"No license-admitted learned initializer/checkpoint is available yet."}

 [32m✓[39m src/audio/reconstructionComparison.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 1227[2mms[22m[39m
     [33m[2m✓[22m[39m records retrieval, evolutionary and unavailable learned-initialization outcomes on repository-owned synthetic ground truth [33m 1225[2mms[22m[39m
 [32m✓[39m src/audio/msfaOfflineEngine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/domain/sequenceOperations.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/sysex/normalizeLegacyVoice.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/sysex/syntheticFixtureCorpus.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 199[2mms[22m[39m
 [32m✓[39m src/audio/localSequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/audio/referenceAudio.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 153[2mms[22m[39m
 [32m✓[39m src/audio/dx7CmaEs.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/audio/compactPresetIndex.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 93[2mms[22m[39m
 [32m✓[39m scripts/catalog-release-audit.test.mjs [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/audio/presetDescriptorCache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/audio/recorder.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/audio/reconstructionComparison.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1WavRenderer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7Engine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/audio/msfaVoiceBridge.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7ReferenceFixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/sysex/dx7VoiceParameterChange.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/domain/dx7FunctionState.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxGraph.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
[90mstdout[2m | src/audio/libraryVoiceRender.integration.test.ts[2m > [22m[2mreal catalog voice rendering[2m > [22m[2mrenders audible PCM from decoded packed-bank voices through the packaged engine
[22m[39mreal-bank-render {"filename":"sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx","results":[{"slot":1,"name":"BRASS   1","peak":0.480194091796875},{"slot":2,"name":"BRASS   2","peak":0.495941162109375},{"slot":3,"name":"BRASS   3","peak":0.130462646484375},{"slot":4,"name":"STRINGS 1","peak":0.1793212890625},{"slot":5,"name":"STRINGS 2","peak":0.135833740234375},{"slot":6,"name":"STRINGS 3","peak":0.253753662109375},{"slot":7,"name":"ORCHESTRA","peak":0.21185302734375},{"slot":8,"name":"PIANO   1","peak":0.29669189453125}]}

 [32m✓[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 169[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxIsolation.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/dx7Transfer.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/audio/dx7CandidateArtifacts.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/components/VirtualDx7PreviewPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 40[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/domain/dx7EditSession.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/layoutRefinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/components/NearestPresetPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/components/LocalSequenceAudioPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/sysex/dx7ParameterChange.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/audio/catalogPresetCandidates.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/dx7LiveParameterRouting.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/components/VirtualFm1PreviewExtras.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1OutputRoute.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m scripts/catalog-output-path.test.mjs [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/domain/pianoRollView.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 50[2mms[22m[39m
 [32m✓[39m src/audio/virtualFm1PerformanceLimits.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/audio/dx7CandidateFxState.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 51[2mms[22m[39m
 [32m✓[39m src/components/PersistentWorkspace.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/sysex/originalImport.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 314[2mms[22m[39m
     [33m[2m✓[22m[39m is the exact audited ZIP and indexes all supported banks [33m 312[2mms[22m[39m
 [32m✓[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m74 passed[39m[22m[90m (74)[39m
[2m      Tests [22m [1m[32m296 passed[39m[22m[90m (296)[39m
[2m   Start at [22m 06:57:05
[2m   Duration [22m 6.33s[2m (transform 1.53s, setup 0ms, import 3.21s, tests 4.14s, environment 9ms)[22m

=== build ===

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/audio/reconstructionComparison.integration.test.ts(121,13): error TS2322: Type '(_case: ReconstructionComparisonCase<{ fingerprintId: string; }>, candidate: ReconstructionCandidate, signal: AbortSignal | undefined) => Promise<...>' is not assignable to type '(testCase: ReconstructionComparisonCase<{ fingerprintId: string; }>, candidate: ReconstructionCandidate, signal?: AbortSignal | undefined) => Promise<...>'.
  Type 'Promise<{ distance: number; metrics: FingerprintMetricBreakdown; }>' is not assignable to type 'Promise<ReconstructionCandidateEvaluation>'.
    Type '{ distance: number; metrics: FingerprintMetricBreakdown; }' is not assignable to type 'ReconstructionCandidateEvaluation'.
      Types of property 'metrics' are incompatible.
        Type 'FingerprintMetricBreakdown' is not assignable to type 'Readonly<Record<string, number>>'.
          Index signature for type 'string' is missing in type 'FingerprintMetricBreakdown'.

```
