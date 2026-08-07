# Imported-bank virtual audio repair validation

Source commit: `093b0d6254ba9e0944ef63837b75b96faa90053a`

Overall software gate: **FAILED**

| Stage | Exit code |
| --- | ---: |
| typecheck | 1 |
| lint | 0 |
| focused regressions | 1 |
| full test suite | 1 |
| production build | 1 |

Focused regressions cover canonical Yamaha packed bytes, packed-bank properties, real tracked ROM-bank MSFA PCM, schema-v4 stored-voice repair and local audition activation.

```text
       "keyVelocitySensitivity": 1,[22m
[2m        "keyboardScaling": {[22m
[2m          "breakPoint": 22,[22m
[2m          "leftCurve": "negative-exponential",[22m
[2m          "leftDepth": 39,[22m
[2m          "rateScaling": 7,[22m
[2m          "rightCurve": "positive-exponential",[22m
[2m          "rightDepth": 56,[22m
[2m        },[22m
[2m        "oscillatorMode": "fixed",[22m
[32m-       "outputLevel": 58,[39m
[31m+       "outputLevel": 122,[39m
[2m      },[22m
[2m      {[22m
[2m        "amplitudeModulationSensitivity": 1,[22m
[32m-       "detune": 4,[39m
[31m+       "detune": 12,[39m
[2m        "envelope": {[22m
[2m          "levels": [[22m
[2m            47,[22m
[2m            64,[22m
[2m            81,[22m
[33m@@ -121,11 +121,11 @@[39m
[2m            13,[22m
[2m            30,[22m
[2m          ],[22m
[2m        },[22m
[2m        "frequencyCoarse": 25,[22m
[32m-       "frequencyFine": 2,[39m
[31m+       "frequencyFine": 34,[39m
[2m        "keyVelocitySensitivity": 6,[22m
[2m        "keyboardScaling": {[22m
[2m          "breakPoint": 15,[22m
[2m          "leftCurve": "positive-exponential",[22m
[2m          "leftDepth": 32,[22m
[33m@@ -136,11 +136,11 @@[39m
[2m        "oscillatorMode": "ratio",[22m
[2m        "outputLevel": 51,[22m
[2m      },[22m
[2m      {[22m
[2m        "amplitudeModulationSensitivity": 2,[22m
[32m-       "detune": 2,[39m
[31m+       "detune": 6,[39m
[2m        "envelope": {[22m
[2m          "levels": [[22m
[2m            40,[22m
[2m            57,[22m
[2m            74,[22m
[33m@@ -163,11 +163,11 @@[39m
[2m          "rateScaling": 1,[22m
[2m          "rightCurve": "negative-linear",[22m
[2m          "rightDepth": 42,[22m
[2m        },[22m
[2m        "oscillatorMode": "fixed",[22m
[32m-       "outputLevel": 44,[39m
[31m+       "outputLevel": 108,[39m
[2m      },[22m
[2m      {[22m
[2m        "amplitudeModulationSensitivity": 3,[22m
[2m        "detune": 0,[22m
[2m        "envelope": {[22m

[36m [2m❯[22m src/sysex/dx7.property.test.ts:[2m160:23[22m[39m
    [90m158|[39m
    [90m159|[39m       [35mconst[39m decoded [33m=[39m [34mdecodePackedVoice[39m(packed)
    [90m160|[39m       [34mexpect[39m(decoded)[33m.[39m[34mtoMatchObject[39m(voice)
    [90m   |[39m                       [31m^[39m
    [90m161|[39m       [34mexpect[39m([34mencodePackedVoice[39m(decoded))[33m.[39m[34mtoEqual[39m(packed)
    [90m162|[39m     }

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯[22m[39m

[41m[1m FAIL [22m[49m src/sysex/normalizeLegacyVoice.test.ts[2m > [22mlegacy DX7 voice normalization[2m > [22mrecords breakpoint 127 and detune 15 preserved in packed source bytes
[31m[1mAssertionError[22m: expected 7 to be 14 // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 14[39m
[31m+ 7[39m

[36m [2m❯[22m src/sysex/normalizeLegacyVoice.test.ts:[2m76:46[22m[39m
    [90m 74|[39m
    [90m 75|[39m     expect(result.voice.operators[5].keyboardScaling.breakPoint).toBe(…
    [90m 76|[39m     [34mexpect[39m(result[33m.[39mvoice[33m.[39moperators[[34m5[39m][33m.[39mdetune)[33m.[39m[34mtoBe[39m([34m14[39m)
    [90m   |[39m                                              [31m^[39m
    [90m 77|[39m     [34mexpect[39m(result[33m.[39mnormalizations)[33m.[39m[34mtoContainEqual[39m({
    [90m 78|[39m       path[33m:[39m [32m'OP6.keyboardScaling.breakPoint'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯[22m[39m

[41m[1m FAIL [22m[49m src/sysex/syntheticFixtureCorpus.test.ts[2m > [22msynthetic SysEx compatibility fixture corpus[2m > [22mmatches every fixture diagnostic contract without mutating original bytes
[31m[1mAssertionError[22m: valid-bank-channel-9: expected [ Array(12) ] to deeply equal [][39m

[32m- Expected[39m
[31m+ Received[39m

[32m- [][39m
[31m+ [[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+   "compatibility-normalization",[39m
[31m+ ][39m

[36m [2m❯[22m src/sysex/syntheticFixtureCorpus.test.ts:[2m32:10[22m[39m
    [90m 30|[39m       expect(report.supportedMessageCount, entry.id).toBe(entry.expect…
    [90m 31|[39m       expect(report.diagnostics.map((diagnostic) => diagnostic.code), …
    [90m 32|[39m         [33m.[39m[34mtoEqual[39m(entry[33m.[39mexpectation[33m.[39mdiagnosticCodes)
    [90m   |[39m          [31m^[39m
    [90m 33|[39m       [34mexpect[39m(entry[33m.[39mbytes[33m,[39m entry[33m.[39mid)[33m.[39m[34mtoEqual[39m(original)
    [90m 34|[39m     })
[90m [2m❯[22m src/sysex/syntheticFixtureCorpus.test.ts:[2m25:40[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯[22m[39m

[41m[1m FAIL [22m[49m src/sysex/syntheticFixtureCorpus.test.ts[2m > [22msynthetic SysEx compatibility fixture corpus[2m > [22mprefixes reserved bank values with the affected voice index
[31m[1mAssertionError[22m: expected [ …(14) ] to deeply equal [ …(2) ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[2m    "voice[1].OP6.keyboardScaling.breakPoint",[22m
[2m    "voice[1].OP6.detune",[22m
[31m+   "voice[1].OP6.frequencyFine",[39m
[31m+   "voice[4].OP3.detune",[39m
[31m+   "voice[5].OP6.detune",[39m
[31m+   "voice[8].OP3.detune",[39m
[31m+   "voice[14].OP1.detune",[39m
[31m+   "voice[15].OP4.detune",[39m
[31m+   "voice[18].OP1.detune",[39m
[31m+   "voice[19].OP4.detune",[39m
[31m+   "voice[25].OP2.detune",[39m
[31m+   "voice[26].OP5.detune",[39m
[31m+   "voice[29].OP2.detune",[39m
[31m+   "voice[30].OP5.detune",[39m
[2m  ][22m

[36m [2m❯[22m src/sysex/syntheticFixtureCorpus.test.ts:[2m95:77[22m[39m
    [90m 93|[39m     [34mexpect[39m(entry[33m?.[39mkind)[33m.[39m[34mtoBe[39m([32m'voice-bank'[39m)
    [90m 94|[39m     if (entry?.kind !== 'voice-bank') throw new Error('Expected a voic…
    [90m 95|[39m     expect(entry.normalizations.map((normalization) => normalization.p…
    [90m   |[39m                                                                             [31m^[39m
    [90m 96|[39m       [32m'voice[1].OP6.keyboardScaling.breakPoint'[39m[33m,[39m
    [90m 97|[39m       [32m'voice[1].OP6.detune'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯[22m[39m


[2m Test Files [22m [1m[31m4 failed[39m[22m[2m | [22m[1m[32m55 passed[39m[22m[90m (59)[39m
[2m      Tests [22m [1m[31m5 failed[39m[22m[2m | [22m[1m[32m241 passed[39m[22m[90m (246)[39m
[2m   Start at [22m 13:28:24
[2m   Duration [22m 4.89s[2m (transform 1.33s, setup 0ms, import 2.71s, tests 2.47s, environment 7ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/components/LocalSequenceAudioPanel.test.tsx,title=src/components/LocalSequenceAudioPanel.test.tsx > LocalSequenceAudioPanel > shows external clock as hardware-only instead of substituting browser timing,line=42,column=20::AssertionError: expected '<section class="rounded-2xl border bo…' to contain 'External clock · hardware route only'%0A%0AExpected: "External clock · hardware route only"%0AReceived: "<section class="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p><h3 class="mt-1 text-lg font-bold text-white">EXT CLOCK</h3><p class="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.</p></div><div class="text-right text-xs text-slate-500"><p class="text-amber-200">LOCAL AUDIO OFF</p><p class="mt-1">16 voices · dry</p><p class="mt-1 text-slate-500">External MIDI input clock</p></div></div><div class="mt-4 flex flex-wrap items-center gap-2"><button class="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" type="button">Enable local audio</button><button class="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">◎ Arm external local</button><button class="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled="" type="button">■ Stop local</button></div><p class="mt-3 text-[11px] leading-5 text-slate-500">Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. In external mode only MIDI Start/Continue/Clock/Stop from the selected input drive the local scheduler; no sequence or transport data is sent to the hardware output.</p></section>"%0A%0A ❯ src/components/LocalSequenceAudioPanel.test.tsx:42:20%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/sysex/dx7.property.test.ts,title=src/sysex/dx7.property.test.ts > DX7 generated codec properties > preserves every legal seven-bit reserved field in packed voices,line=160,column=23::AssertionError: expected { name: 'P000000000', …(8) } to match object { name: 'P000000000', …(7) }%0A(2 matching properties omitted from actual)%0A%0A- Expected%0A+ Received%0A%0A@@ -12,11 +12,11 @@%0A    },%0A    "name": "P000000000",%0A    "operators": [%0A      {%0A        "amplitudeModulationSensitivity": 2,%0A-       "detune": 10,%0A+       "detune": 14,%0A        "envelope": {%0A          "levels": [%0A            68,%0A            85,%0A            2,%0A@@ -28,11 +28,11 @@%0A            34,%0A            51,%0A          ],%0A        },%0A        "frequencyCoarse": 18,%0A-       "frequencyFine": 23,%0A+       "frequencyFine": 87,%0A        "keyVelocitySensitivity": 7,%0A        "keyboardScaling": {%0A          "breakPoint": 36,%0A          "leftCurve": "positive-linear",%0A          "leftDepth": 53,%0A@@ -59,11 +59,11 @@%0A            27,%0A            44,%0A          ],%0A        },%0A        "frequencyCoarse": 31,%0A-       "frequencyFine": 16,%0A+       "frequencyFine": 80,%0A        "keyVelocitySensitivity": 4,%0A        "keyboardScaling": {%0A          "breakPoint": 29,%0A          "leftCurve": "negative-linear",%0A          "leftDepth": 46,%0A@@ -74,11 +74,11 @@%0A        "oscillatorMode": "ratio",%0A        "outputLevel": 65,%0A      },%0A      {%0A        "amplitudeModulationSensitivity": 0,%0A-       "detune": 6,%0A+       "detune": 14,%0A        "envelope": {%0A          "levels": [%0A            54,%0A            71,%0A            88,%0A@@ -90,26 +90,26 @@%0A            20,%0A            37,%0A          ],%0A        },%0A        "frequencyCoarse": 12,%0A-       "frequencyFine": 9,%0A+       "frequencyFine": 57,%0A        "keyVelocitySensitivity": 1,%0A        "keyboardScaling": {%0A          "breakPoint": 22,%0A          "leftCurve": "negative-exponential",%0A          "leftDepth": 39,%0A          "rateScaling": 7,%0A          "rightCurve": "positive-exponential",%0A          "rightDepth": 56,%0A        },%0A        "oscillatorMode": "fixed",%0A-       "outputLevel": 58,%0A+       "outputLevel": 122,%0A      },%0A      {%0A        "amplitudeModulationSensitivity": 1,%0A-       "detune": 4,%0A+       "detune": 12,%0A        "envelope": {%0A          "levels": [%0A            47,%0A            64,%0A            81,%0A@@ -121,11 +121,11 @@%0A            13,%0A            30,%0A          ],%0A        },%0A        "frequencyCoarse": 25,%0A-       "frequencyFine": 2,%0A+       "frequencyFine": 34,%0A        "keyVelocitySensitivity": 6,%0A        "keyboardScaling": {%0A          "breakPoint": 15,%0A          "leftCurve": "positive-exponential",%0A          "leftDepth": 32,%0A@@ -136,11 +136,11 @@%0A        "oscillatorMode": "ratio",%0A        "outputLevel": 51,%0A      },%0A      {%0A        "amplitudeModulationSensitivity": 2,%0A-       "detune": 2,%0A+       "detune": 6,%0A        "envelope": {%0A          "levels": [%0A            40,%0A            57,%0A            74,%0A@@ -163,11 +163,11 @@%0A          "rateScaling": 1,%0A          "rightCurve": "negative-linear",%0A          "rightDepth": 42,%0A        },%0A        "oscillatorMode": "fixed",%0A-       "outputLevel": 44,%0A+       "outputLevel": 108,%0A      },%0A      {%0A        "amplitudeModulationSensitivity": 3,%0A        "detune": 0,%0A        "envelope": {%0A%0A ❯ src/sysex/dx7.property.test.ts:160:23%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/sysex/normalizeLegacyVoice.test.ts,title=src/sysex/normalizeLegacyVoice.test.ts > legacy DX7 voice normalization > records breakpoint 127 and detune 15 preserved in packed source bytes,line=76,column=46::AssertionError: expected 7 to be 14 // Object.is equality%0A%0A- Expected%0A+ Received%0A%0A- 14%0A+ 7%0A%0A ❯ src/sysex/normalizeLegacyVoice.test.ts:76:46%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/sysex/syntheticFixtureCorpus.test.ts,title=src/sysex/syntheticFixtureCorpus.test.ts > synthetic SysEx compatibility fixture corpus > matches every fixture diagnostic contract without mutating original bytes,line=32,column=10::AssertionError: valid-bank-channel-9: expected [ Array(12) ] to deeply equal []%0A%0A- Expected%0A+ Received%0A%0A- []%0A+ [%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+   "compatibility-normalization",%0A+ ]%0A%0A ❯ src/sysex/syntheticFixtureCorpus.test.ts:32:10%0A ❯ src/sysex/syntheticFixtureCorpus.test.ts:25:40%0A%0A

::error file=/home/runner/work/FM1Editor/FM1Editor/src/sysex/syntheticFixtureCorpus.test.ts,title=src/sysex/syntheticFixtureCorpus.test.ts > synthetic SysEx compatibility fixture corpus > prefixes reserved bank values with the affected voice index,line=95,column=77::AssertionError: expected [ …(14) ] to deeply equal [ …(2) ]%0A%0A- Expected%0A+ Received%0A%0A  [%0A    "voice[1].OP6.keyboardScaling.breakPoint",%0A    "voice[1].OP6.detune",%0A+   "voice[1].OP6.frequencyFine",%0A+   "voice[4].OP3.detune",%0A+   "voice[5].OP6.detune",%0A+   "voice[8].OP3.detune",%0A+   "voice[14].OP1.detune",%0A+   "voice[15].OP4.detune",%0A+   "voice[18].OP1.detune",%0A+   "voice[19].OP4.detune",%0A+   "voice[25].OP2.detune",%0A+   "voice[26].OP5.detune",%0A+   "voice[29].OP2.detune",%0A+   "voice[30].OP5.detune",%0A  ]%0A%0A ❯ src/sysex/syntheticFixtureCorpus.test.ts:95:77%0A%0A
TEST_EXIT=1
=== build ===

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/audio/referenceAudio.ts(81,53): error TS2532: Object is possibly 'undefined'.
src/library/storageMigration.test.ts(69,25): error TS2540: Cannot assign to '1' because it is a read-only property.
src/sysex/dx7.test.ts(59,12): error TS2532: Object is possibly 'undefined'.
src/sysex/dx7.test.ts(61,12): error TS2532: Object is possibly 'undefined'.
src/sysex/dx7.test.ts(63,12): error TS2532: Object is possibly 'undefined'.
BUILD_EXIT=1

```
