# Imported-bank virtual audio repair validation

Source commit: `41e3fe32068b524dff9169a3ac1ca21670fd6ce1`

Overall software gate: **FAILED**

| Stage | Exit code |
| --- | ---: |
| typecheck | 0 |
| lint | 0 |
| focused regressions | 1 |
| full test suite | 1 |
| production build | 0 |

Focused validation includes canonical Yamaha packed bytes, compatibility normalization, real tracked ROM1A PCM through packaged MSFA WASM, schema-v4 library repair, local audition activation, reference-audio preparation and external local-clock UI.

```text
l border bo…' to contain 'selected MIDI input'%0A%0AExpected: "selected MIDI input"%0AReceived: "<section class="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p><h3 class="mt-1 text-lg font-bold text-white">EXT CLOCK</h3><p class="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.</p></div><div class="text-right text-xs text-slate-500"><p class="text-amber-200">LOCAL AUDIO OFF</p><p class="mt-1">16 voices · dry</p><p class="mt-1 text-slate-500">External MIDI input clock</p></div></div><div class="mt-4 flex flex-wrap items-center gap-2"><button class="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" type="button">Enable local audio</button><button class="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">◎ Arm external local</button><button class="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">■ Stop local</button></div><p class="mt-3 text-[11px] leading-5 text-slate-500">Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. In external mode only MIDI Start/Continue/Clock/Stop from the selected input drive the local scheduler; no sequence or transport data is sent to the hardware output.</p></section>"%0A%0A ❯ src/components/LocalSequenceAudioPanel.test.tsx:44:20%0A%0A
=== test ===

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/msfaAudioWorklet.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/audio/nearestPreset.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/audio/audioDescriptors.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 121[2mms[22m[39m
 [32m✓[39m src/audio/externalLocalSequenceScheduler.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m src/audio/localVoiceAudition.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.property.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 707[2mms[22m[39m
     [33m[2m✓[22m[39m round-trips generated 32-voice banks on every MIDI channel [33m 390[2mms[22m[39m
 [32m✓[39m src/audio/msfaOfflineEngine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m src/domain/sequenceOperations.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/sysex/normalizeLegacyVoice.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m src/sysex/syntheticFixtureCorpus.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 191[2mms[22m[39m
 [32m✓[39m src/audio/localSequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/audio/recorder.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m scripts/catalog-release-audit.test.mjs [2m([22m[2m5 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [31m❯[39m src/audio/referenceAudio.test.ts [2m([22m[2m6 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 80[2mms[22m[39m
     [32m✓[39m accepts WAV and MP3 metadata and rejects other formats or oversized files[32m 4[2mms[22m[39m
     [32m✓[39m mixes equal-length channels to deterministic mono[32m 1[2mms[22m[39m
     [32m✓[39m finds leading and trailing silence at the configured threshold[32m 1[2mms[22m[39m
     [32m✓[39m detects a stable synthetic pitch near A4[32m 48[2mms[22m[39m
     [32m✓[39m trims, normalizes and allows an explicit manual pitch override[32m 7[2mms[22m[39m
[31m     [31m×[31m rejects an unusably short region and invalid manual pitch[39m[32m 17[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7Engine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/audio/msfaVoiceBridge.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7ReferenceFixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/sysex/dx7VoiceParameterChange.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/domain/dx7FunctionState.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxGraph.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 18[2mms[22m[39m
[90mstdout[2m | src/audio/libraryVoiceRender.integration.test.ts[2m > [22m[2mreal catalog voice rendering[2m > [22m[2mrenders audible PCM from decoded packed-bank voices through the packaged engine
[22m[39mreal-bank-render {"filename":"sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx","results":[{"slot":1,"name":"BRASS   1","peak":0.480194091796875},{"slot":2,"name":"BRASS   2","peak":0.495941162109375},{"slot":3,"name":"BRASS   3","peak":0.130462646484375},{"slot":4,"name":"STRINGS 1","peak":0.1793212890625},{"slot":5,"name":"STRINGS 2","peak":0.135833740234375},{"slot":6,"name":"STRINGS 3","peak":0.253753662109375},{"slot":7,"name":"ORCHESTRA","peak":0.21185302734375},{"slot":8,"name":"PIANO   1","peak":0.29669189453125}]}

 [32m✓[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 227[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m src/midi/dx7Transfer.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m src/domain/dx7EditSession.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/layoutRefinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/components/VirtualDx7PreviewPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m src/sysex/dx7ParameterChange.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [31m❯[39m src/components/LocalSequenceAudioPanel.test.tsx [2m([22m[2m2 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 44[2mms[22m[39m
     [32m✓[39m keeps local audio explicit and separate from hardware MIDI[32m 18[2mms[22m[39m
[31m     [31m×[31m exposes external MIDI input clock as an explicit local-audio route[39m[32m 23[2mms[22m[39m
 [32m✓[39m src/dx7LiveParameterRouting.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m scripts/catalog-output-path.test.mjs [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/domain/pianoRollView.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 50[2mms[22m[39m
 [32m✓[39m src/components/PersistentWorkspace.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 62[2mms[22m[39m
 [32m✓[39m src/sysex/originalImport.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 328[2mms[22m[39m
     [33m[2m✓[22m[39m is the exact audited ZIP and indexes all supported banks [33m 326[2mms[22m[39m
 [32m✓[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 2 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/audio/referenceAudio.test.ts[2m > [22mreference audio preparation[2m > [22mrejects an unusably short region and invalid manual pitch
[31m[1mAssertionError[22m: expected [Function] to throw error matching /at least 0.05 seconds/ but got 'Reference audio selection is shorter …'[39m

[32m- Expected:[39m
/at least 0.05 seconds/

[31m+ Received:[39m
"Reference audio selection is shorter than 0.05 seconds."

[36m [2m❯[22m src/audio/referenceAudio.test.ts:[2m78:9[22m[39m
    [90m 76|[39m     [34mexpect[39m(() [33m=>[39m [34mprepareReferenceAudio[39m(decoded[33m,[39m {
    [90m 77|[39m       region: { startSeconds: 0, endSeconds: 0.01 }, trimSilence: fals…
    [90m 78|[39m     }))[33m.[39m[34mtoThrow[39m([36m/at least 0.05 seconds/[39m)
    [90m   |[39m         [31m^[39m
    [90m 79|[39m     [34mexpect[39m(() [33m=>[39m [34mprepareReferenceAudio[39m(decoded[33m,[39m {
    [90m 80|[39m       region: { startSeconds: 0, endSeconds: 1 }, trimSilence: false, …

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯[22m[39m

[41m[1m FAIL [22m[49m src/components/LocalSequenceAudioPanel.test.tsx[2m > [22mLocalSequenceAudioPanel[2m > [22mexposes external MIDI input clock as an explicit local-audio route
[31m[1mAssertionError[22m: expected '<section class="rounded-2xl border bo…' to contain 'selected MIDI input'[39m

Expected: [32m"selected MIDI input"[39m
Received: [31m"<section class="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p><h3 class="mt-1 text-lg font-bold text-white">EXT CLOCK</h3><p class="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.</p></div><div class="text-right text-xs text-slate-500"><p class="text-amber-200">LOCAL AUDIO OFF</p><p class="mt-1">16 voices · dry</p><p class="mt-1 text-slate-500">External MIDI input clock</p></div></div><div class="mt-4 flex flex-wrap items-center gap-2"><button class="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" type="button">Enable local audio</button><button class="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">◎ Arm external local</button><button class="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">■ Stop local</button></div><p class="mt-3 text-[11px] leading-5 text-slate-500">Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. In external mode only MIDI Start/Continue/Clock/Stop from the selected input drive the local scheduler; no sequence or transport data is sent to the hardware output.</p></section>"[39m

[36m [2m❯[22m src/components/LocalSequenceAudioPanel.test.tsx:[2m44:20[22m[39m
    [90m 42|[39m     [34mexpect[39m(markup)[33m.[39m[34mtoContain[39m([32m'External MIDI input clock'[39m)
    [90m 43|[39m     [34mexpect[39m(markup)[33m.[39m[34mtoContain[39m([32m'Arm external local'[39m)
    [90m 44|[39m     [34mexpect[39m(markup)[33m.[39m[34mtoContain[39m([32m'selected MIDI input'[39m)
    [90m   |[39m                    [31m^[39m
    [90m 45|[39m     expect(markup).toContain('never sends sequence notes or transport …
    [90m 46|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯[22m[39m


[2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m57 passed[39m[22m[90m (59)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m244 passed[39m[22m[90m (246)[39m
[2m   Start at [22m 13:56:54
[2m   Duration [22m 5.13s[2m (transform 1.36s, setup 0ms, import 2.74s, tests 2.72s, environment 9ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/referenceAudio.test.ts,title=src/audio/referenceAudio.test.ts > reference audio preparation > rejects an unusably short region and invalid manual pitch,line=78,column=9::AssertionError: expected [Function] to throw error matching /at least 0.05 seconds/ but got 'Reference audio selection is shorter …'%0A%0A- Expected:%0A/at least 0.05 seconds/%0A%0A+ Received:%0A"Reference audio selection is shorter than 0.05 seconds."%0A%0A ❯ src/audio/referenceAudio.test.ts:78:9%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/components/LocalSequenceAudioPanel.test.tsx,title=src/components/LocalSequenceAudioPanel.test.tsx > LocalSequenceAudioPanel > exposes external MIDI input clock as an explicit local-audio route,line=44,column=20::AssertionError: expected '<section class="rounded-2xl border bo…' to contain 'selected MIDI input'%0A%0AExpected: "selected MIDI input"%0AReceived: "<section class="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p><h3 class="mt-1 text-lg font-bold text-white">EXT CLOCK</h3><p class="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.</p></div><div class="text-right text-xs text-slate-500"><p class="text-amber-200">LOCAL AUDIO OFF</p><p class="mt-1">16 voices · dry</p><p class="mt-1 text-slate-500">External MIDI input clock</p></div></div><div class="mt-4 flex flex-wrap items-center gap-2"><button class="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" type="button">Enable local audio</button><button class="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">◎ Arm external local</button><button class="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">■ Stop local</button></div><p class="mt-3 text-[11px] leading-5 text-slate-500">Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. In external mode only MIDI Start/Continue/Clock/Stop from the selected input drive the local scheduler; no sequence or transport data is sent to the hardware output.</p></section>"%0A%0A ❯ src/components/LocalSequenceAudioPanel.test.tsx:44:20%0A%0A
=== build ===

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

[36mvite v8.2.0 [32mbuilding client environment for production...[36m[39m
[2K
transforming...✓ 107 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.96 kB │ gzip:   0.47 kB
dist/assets/index-C0DtPLcZ.css   67.67 kB │ gzip:  12.99 kB
dist/assets/index-C3qlHPdE.js   483.51 kB │ gzip: 139.79 kB

[32m✓ built in 317ms[39m
Service worker generated with 7 precached URLs (40767a17b9e741bc).

```
