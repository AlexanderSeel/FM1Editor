# FM1-inspired Web Audio effect graph validation

Overall software gate: **FAILED**

| Stage | Exit code |
| --- | ---: |
| typecheck | 1 |
| lint | 1 |
| test | 1 |
| build | 1 |

## Boundary

- The graph is an FM1 Editor software approximation and does not claim physical FM-1 DSP equivalence.
- It reuses the existing 24 documented `Fm1FxState` values/ranges and does not change MIDI semantics.
- Repository-owned routing is `filter → distortion → chorus → phaser → delay → reverb`.
- Graph-level dry bypass is explicit and defaults to bypassed.
- No third-party DSP dependency or impulse-response asset is added.

## typecheck output
```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/App.tsx(369,22): error TS2741: Property 'onAuditionVoice' is missing in type '{ onImportToLibrary: (voices: readonly Dx7Voice[], origin: Omit<PatchOrigin, "bankSlot">) => Promise<PatchLibraryImportSummary>; onLoadBank: (voices: readonly Dx7Voice[]) => void; onLoadVoice: (nextVoice: Dx7Voice) => void; }' but required in type 'PatchCatalogBrowserProps'.
src/App.tsx(380,22): error TS2741: Property 'onAuditionVoice' is missing in type '{ currentVoice: Dx7Voice; error: string | null; loading: boolean; onDelete: (id: string) => Promise<void>; onExportBackup: () => Promise<string>; onLoad: (nextVoice: Dx7Voice) => void; ... 4 more ...; records: readonly PatchRecord[]; }' but required in type 'PatchLibraryProps'.
src/audio/fm1InspiredFxGraph.ts(72,39): error TS18048: 'candidate' is possibly 'undefined'.
src/audio/fm1InspiredFxGraph.ts(72,73): error TS18048: 'candidate' is possibly 'undefined'.
src/audio/fm1InspiredFxGraph.ts(75,3): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.

```

## lint output
```text

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts


/home/runner/work/FM1Editor/FM1Editor/src/audio/fm1InspiredFxGraph.ts
  320:38  error  Empty block statement  no-empty
  321:38  error  Empty block statement  no-empty

✖ 2 problems (2 errors, 0 warnings)


```

## test output
```text

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/audio/externalLocalSequenceScheduler.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/audio/msfaAudioWorklet.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m src/audio/msfaOfflineEngine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m src/domain/sequenceOperations.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/sysex/syntheticFixtureCorpus.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 223[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.property.test.ts [2m([22m[2m5 tests[22m[2m)[22m[33m 752[2mms[22m[39m
     [33m[2m✓[22m[39m round-trips generated 32-voice banks on every MIDI channel [33m 388[2mms[22m[39m
 [32m✓[39m src/audio/localVoiceAudition.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/audio/localSequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m src/sysex/normalizeLegacyVoice.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m scripts/catalog-release-audit.test.mjs [2m([22m[2m5 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/audio/recorder.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7Engine.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/audio/msfaVoiceBridge.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/audio/virtualDx7ReferenceFixture.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/sysex/dx7VoiceParameterChange.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/domain/deviceTarget.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/audio/fm1InspiredFxGraph.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/dx7FunctionState.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/voiceVariations.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/domain/keyboardScalingGeometry.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/midi/dx7Transfer.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/domain/envelopeGeometry.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/domain/dx7Algorithms.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/domain/dx7EditSession.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/layoutRefinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/components/VirtualDx7PreviewPanel.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [31m❯[39m src/components/LocalSequenceAudioPanel.test.tsx [2m([22m[2m2 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 44[2mms[22m[39m
     [32m✓[39m keeps local audio explicit and separate from hardware MIDI[32m 18[2mms[22m[39m
[31m     [31m×[31m shows external clock as hardware-only instead of substituting browser timing[39m[32m 24[2mms[22m[39m
 [32m✓[39m src/dx7LiveParameterRouting.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/sysex/dx7ParameterChange.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/domain/operatorLevels.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/history/history.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/midi/portPreferences.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/domain/pianoRollView.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m scripts/catalog-output-path.test.mjs [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/components/AlgorithmGraph.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 50[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/catalog/catalogSysexValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 62[2mms[22m[39m
 [32m✓[39m src/components/PersistentWorkspace.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 263[2mms[22m[39m
 [32m✓[39m src/sysex/originalImport.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/domain/dx7Note.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

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

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m54 passed[39m[22m[90m (55)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m227 passed[39m[22m[90m (228)[39m
[2m   Start at [22m 12:31:49
[2m   Duration [22m 4.93s[2m (transform 1.20s, setup 0ms, import 2.60s, tests 2.26s, environment 9ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/components/LocalSequenceAudioPanel.test.tsx,title=src/components/LocalSequenceAudioPanel.test.tsx > LocalSequenceAudioPanel > shows external clock as hardware-only instead of substituting browser timing,line=42,column=20::AssertionError: expected '<section class="rounded-2xl border bo…' to contain 'External clock · hardware route only'%0A%0AExpected: "External clock · hardware route only"%0AReceived: "<section class="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p><h3 class="mt-1 text-lg font-bold text-white">EXT CLOCK</h3><p class="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.</p></div><div class="text-right text-xs text-slate-500"><p class="text-amber-200">LOCAL AUDIO OFF</p><p class="mt-1">16 voices · dry</p><p class="mt-1 text-slate-500">External MIDI input clock</p></div></div><div class="mt-4 flex flex-wrap items-center gap-2"><button class="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" type="button">Enable local audio</button><button class="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">◎ Arm external local</button><button class="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">■ Stop local</button></div><p class="mt-3 text-[11px] leading-5 text-slate-500">Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. In external mode only MIDI Start/Continue/Clock/Stop from the selected input drive the local scheduler; no sequence or transport data is sent to the hardware output.</p></section>"%0A%0A ❯ src/components/LocalSequenceAudioPanel.test.tsx:42:20%0A%0A

```

## build output
```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/App.tsx(369,22): error TS2741: Property 'onAuditionVoice' is missing in type '{ onImportToLibrary: (voices: readonly Dx7Voice[], origin: Omit<PatchOrigin, "bankSlot">) => Promise<PatchLibraryImportSummary>; onLoadBank: (voices: readonly Dx7Voice[]) => void; onLoadVoice: (nextVoice: Dx7Voice) => void; }' but required in type 'PatchCatalogBrowserProps'.
src/App.tsx(380,22): error TS2741: Property 'onAuditionVoice' is missing in type '{ currentVoice: Dx7Voice; error: string | null; loading: boolean; onDelete: (id: string) => Promise<void>; onExportBackup: () => Promise<string>; onLoad: (nextVoice: Dx7Voice) => void; ... 4 more ...; records: readonly PatchRecord[]; }' but required in type 'PatchLibraryProps'.
src/audio/fm1InspiredFxGraph.ts(72,39): error TS18048: 'candidate' is possibly 'undefined'.
src/audio/fm1InspiredFxGraph.ts(72,73): error TS18048: 'candidate' is possibly 'undefined'.
src/audio/fm1InspiredFxGraph.ts(75,3): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.

```
