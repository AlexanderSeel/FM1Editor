# Imported-bank virtual audio repair validation

Source commit: `c938ea97e5d2b4fa351b032e53f693f36e76f7d7`

Overall software gate: **FAILED**

| Stage | Exit code |
| --- | ---: |
| typecheck | 1 |
| lint | 0 |
| focused regressions | 0 |
| full test suite | 1 |
| production build | 1 |

The focused gate validates canonical Yamaha 128-byte packing, compatibility normalization, generated codec properties, schema-v4 cached-library repair, user-activation-safe audition and real tracked ROM-bank PCM through packaged MSFA WASM.

```text
8[2mms[22m[39m
[31m     [31m×[31m trims, normalizes and allows an explicit manual pitch override[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m rejects an unusably short region and invalid manual pitch[39m[32m 2[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7Engine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/audio/msfaVoiceBridge.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/sysex/dx7VoiceParameterChange.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7ReferenceFixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/domain/dx7FunctionState.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxGraph.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
[90mstdout[2m | src/audio/libraryVoiceRender.integration.test.ts[2m > [22m[2mreal catalog voice rendering[2m > [22m[2mrenders audible PCM from decoded packed-bank voices through the packaged engine
[22m[39mreal-bank-render {"filename":"sysexFinal/0_Original_Yamaha/0_DX7/ROM1A.syx","results":[{"slot":1,"name":"BRASS   1","peak":0.480194091796875},{"slot":2,"name":"BRASS   2","peak":0.495941162109375},{"slot":3,"name":"BRASS   3","peak":0.130462646484375},{"slot":4,"name":"STRINGS 1","peak":0.1793212890625},{"slot":5,"name":"STRINGS 2","peak":0.135833740234375},{"slot":6,"name":"STRINGS 3","peak":0.253753662109375},{"slot":7,"name":"ORCHESTRA","peak":0.21185302734375},{"slot":8,"name":"PIANO   1","peak":0.29669189453125}]}

 [32m✓[39m src/audio/libraryVoiceRender.integration.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 200[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/midi/dx7Transfer.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/domain/dx7EditSession.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/layoutRefinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/components/VirtualDx7PreviewPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [31m❯[39m src/components/LocalSequenceAudioPanel.test.tsx [2m([22m[2m2 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 40[2mms[22m[39m
     [32m✓[39m keeps local audio explicit and separate from hardware MIDI[32m 17[2mms[22m[39m
[31m     [31m×[31m shows external clock as hardware-only instead of substituting browser timing[39m[32m 21[2mms[22m[39m
 [32m✓[39m src/sysex/dx7ParameterChange.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/dx7LiveParameterRouting.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m scripts/catalog-output-path.test.mjs [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/domain/pianoRollView.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 53[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m src/components/PersistentWorkspace.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 273[2mms[22m[39m
 [32m✓[39m src/sysex/originalImport.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 4 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/audio/referenceAudio.test.ts[2m > [22mreference audio file boundary[2m > [22maccepts WAV and MP3 metadata and rejects other formats or oversized files
[31m[1mAssertionError[22m: expected [Function] to throw an error[39m

[32m- Expected:[39m
null

[31m+ Received:[39m
undefined

[36m [2m❯[22m src/audio/referenceAudio.test.ts:[2m24:111[22m[39m
    [90m 22|[39m     expect(() => validateReferenceAudioFile({ name: 'tone.mp3', size: …
    [90m 23|[39m     expect(() => validateReferenceAudioFile({ name: 'tone.flac', size:…
    [90m 24|[39m     expect(() => validateReferenceAudioFile({ name: 'tone.wav', size: …
    [90m   |[39m                                                                                                               [31m^[39m
    [90m 25|[39m   })
    [90m 26|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯[22m[39m

[41m[1m FAIL [22m[49m src/audio/referenceAudio.test.ts[2m > [22mreference audio preparation[2m > [22mtrims, normalizes and allows an explicit manual pitch override
[31m[1mTypeError[22m: prepareReferenceAudio is not a function[39m
[36m [2m❯[22m src/audio/referenceAudio.test.ts:[2m60:22[22m[39m
    [90m 58|[39m       channels[33m:[39m [channel][33m,[39m
    [90m 59|[39m     }
    [90m 60|[39m     [35mconst[39m prepared [33m=[39m [34mprepareReferenceAudio[39m(decoded[33m,[39m {
    [90m   |[39m                      [31m^[39m
    [90m 61|[39m       region[33m:[39m { startSeconds[33m:[39m [34m0[39m[33m,[39m endSeconds[33m:[39m decoded[33m.[39mdurationSeconds }[33m,[39m
    [90m 62|[39m       trimSilence[33m:[39m [35mtrue[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯[22m[39m

[41m[1m FAIL [22m[49m src/audio/referenceAudio.test.ts[2m > [22mreference audio preparation[2m > [22mrejects an unusably short region and invalid manual pitch
[31m[1mAssertionError[22m: expected [Function] to throw error matching /at least 0.05 seconds/ but got '(0 , __vite_ssr_import_1__.prepareRef…'[39m

[32m- Expected:[39m
/at least 0.05 seconds/

[31m+ Received:[39m
"(0 , __vite_ssr_import_1__.prepareReferenceAudio) is not a function"

[36m [2m❯[22m src/audio/referenceAudio.test.ts:[2m78:9[22m[39m
    [90m 76|[39m     [34mexpect[39m(() [33m=>[39m [34mprepareReferenceAudio[39m(decoded[33m,[39m {
    [90m 77|[39m       region: { startSeconds: 0, endSeconds: 0.01 }, trimSilence: fals…
    [90m 78|[39m     }))[33m.[39m[34mtoThrow[39m([36m/at least 0.05 seconds/[39m)
    [90m   |[39m         [31m^[39m
    [90m 79|[39m     [34mexpect[39m(() [33m=>[39m [34mprepareReferenceAudio[39m(decoded[33m,[39m {
    [90m 80|[39m       region: { startSeconds: 0, endSeconds: 1 }, trimSilence: false, …

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯[22m[39m

[41m[1m FAIL [22m[49m src/components/LocalSequenceAudioPanel.test.tsx[2m > [22mLocalSequenceAudioPanel[2m > [22mshows external clock as hardware-only instead of substituting browser timing
[31m[1mAssertionError[22m: expected '<section class="rounded-2xl border bo…' to contain 'External clock · hardware route only'[39m

Expected: [32m"External clock · hardware route only"[39m
Received: [31m"<section class="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p><h3 class="mt-1 text-lg font-bold text-white">EXT CLOCK</h3><p class="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.</p></div><div class="text-right text-xs text-slate-500"><p class="text-amber-200">LOCAL AUDIO OFF</p><p class="mt-1">16 voices · dry</p><p class="mt-1 text-slate-500">External MIDI input clock</p></div></div><div class="mt-4 flex flex-wrap items-center gap-2"><button class="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" type="button">Enable local audio</button><button class="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">◎ Arm external local</button><button class="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">■ Stop local</button></div><p class="mt-3 text-[11px] leading-5 text-slate-500">Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. In external mode only MIDI Start/Continue/Clock/Stop from the selected input drive the local scheduler; no sequence or transport data is sent to the hardware output.</p></section>"[39m

[36m [2m❯[22m src/components/LocalSequenceAudioPanel.test.tsx:[2m42:20[22m[39m
    [90m 40|[39m     )
    [90m 41|[39m
    [90m 42|[39m     [34mexpect[39m(markup)[33m.[39m[34mtoContain[39m([32m'External clock · hardware route only'[39m)
    [90m   |[39m                    [31m^[39m
    [90m 43|[39m     expect(markup).toContain('External MIDI clock remains on the hardw…
    [90m 44|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯[22m[39m


[2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m57 passed[39m[22m[90m (59)[39m
[2m      Tests [22m [1m[31m4 failed[39m[22m[2m | [22m[1m[32m242 passed[39m[22m[90m (246)[39m
[2m   Start at [22m 13:40:15
[2m   Duration [22m 5.28s[2m (transform 1.44s, setup 0ms, import 2.89s, tests 2.62s, environment 8ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/referenceAudio.test.ts,title=src/audio/referenceAudio.test.ts > reference audio file boundary > accepts WAV and MP3 metadata and rejects other formats or oversized files,line=24,column=111::AssertionError: expected [Function] to throw an error%0A%0A- Expected:%0Anull%0A%0A+ Received:%0Aundefined%0A%0A ❯ src/audio/referenceAudio.test.ts:24:111%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/referenceAudio.test.ts,title=src/audio/referenceAudio.test.ts > reference audio preparation > trims%2C normalizes and allows an explicit manual pitch override,line=60,column=22::TypeError: prepareReferenceAudio is not a function%0A ❯ src/audio/referenceAudio.test.ts:60:22%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/referenceAudio.test.ts,title=src/audio/referenceAudio.test.ts > reference audio preparation > rejects an unusably short region and invalid manual pitch,line=78,column=9::AssertionError: expected [Function] to throw error matching /at least 0.05 seconds/ but got '(0 , __vite_ssr_import_1__.prepareRef…'%0A%0A- Expected:%0A/at least 0.05 seconds/%0A%0A+ Received:%0A"(0 , __vite_ssr_import_1__.prepareReferenceAudio) is not a function"%0A%0A ❯ src/audio/referenceAudio.test.ts:78:9%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/components/LocalSequenceAudioPanel.test.tsx,title=src/components/LocalSequenceAudioPanel.test.tsx > LocalSequenceAudioPanel > shows external clock as hardware-only instead of substituting browser timing,line=42,column=20::AssertionError: expected '<section class="rounded-2xl border bo…' to contain 'External clock · hardware route only'%0A%0AExpected: "External clock · hardware route only"%0AReceived: "<section class="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p><h3 class="mt-1 text-lg font-bold text-white">EXT CLOCK</h3><p class="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.</p></div><div class="text-right text-xs text-slate-500"><p class="text-amber-200">LOCAL AUDIO OFF</p><p class="mt-1">16 voices · dry</p><p class="mt-1 text-slate-500">External MIDI input clock</p></div></div><div class="mt-4 flex flex-wrap items-center gap-2"><button class="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" type="button">Enable local audio</button><button class="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">◎ Arm external local</button><button class="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">■ Stop local</button></div><p class="mt-3 text-[11px] leading-5 text-slate-500">Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. In external mode only MIDI Start/Continue/Clock/Stop from the selected input drive the local scheduler; no sequence or transport data is sent to the hardware output.</p></section>"%0A%0A ❯ src/components/LocalSequenceAudioPanel.test.tsx:42:20%0A%0A
test_EXIT=1
=== build ===

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/audio/referenceAudio.test.ts(6,3): error TS2724: '"./referenceAudio"' has no exported member named 'prepareReferenceAudio'. Did you mean 'PreparedReferenceAudio'?
src/audio/referenceAudio.test.ts(7,3): error TS2724: '"./referenceAudio"' has no exported member named 'REFERENCE_AUDIO_NORMALIZED_PEAK'. Did you mean 'REFERENCE_AUDIO_NORMALIZATION_PEAK'?
src/audio/referenceAudio.test.ts(71,46): error TS7006: Parameter 'sample' implicitly has an 'any' type.
src/components/ReferenceAudioInputPanel.tsx(3,3): error TS2724: '"../audio/referenceAudio"' has no exported member named 'decodeReferenceAudioFile'. Did you mean 'DecodedReferenceAudio'?
src/components/ReferenceAudioInputPanel.tsx(4,3): error TS2724: '"../audio/referenceAudio"' has no exported member named 'prepareReferenceAudio'. Did you mean 'PreparedReferenceAudio'?
src/components/ReferenceAudioInputPanel.tsx(6,3): error TS2724: '"../audio/referenceAudio"' has no exported member named 'REFERENCE_AUDIO_MIN_REGION_SECONDS'. Did you mean 'REFERENCE_AUDIO_MIN_DURATION_SECONDS'?
src/components/ReferenceAudioInputPanel.tsx(123,151): error TS2339: Property 'filename' does not exist on type 'DecodedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(124,137): error TS2339: Property 'sizeBytes' does not exist on type 'DecodedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(125,136): error TS2339: Property 'durationSeconds' does not exist on type 'DecodedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(127,111): error TS2339: Property 'contentSha256' does not exist on type 'DecodedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(127,188): error TS2339: Property 'contentSha256' does not exist on type 'DecodedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(145,30): error TS2339: Property 'durationSeconds' does not exist on type 'DecodedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(146,39): error TS2339: Property 'durationSeconds' does not exist on type 'DecodedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(183,161): error TS2339: Property 'analysisPitchHz' does not exist on type 'PreparedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(183,191): error TS2339: Property 'analysisPitchHz' does not exist on type 'PreparedReferenceAudio'.
src/components/ReferenceAudioInputPanel.tsx(184,161): error TS2339: Property 'normalizationGain' does not exist on type 'PreparedReferenceAudio'.
build_EXIT=1

```
