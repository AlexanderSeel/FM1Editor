# Virtual DX7 renderer feasibility and implementation record

Last reviewed: 2026-08-07

Status: **audited deterministic dry engine packaged and integrated; minimum stateful one-voice AudioWorklet accepted in branded Chrome and Edge; application preview integration and expanded performance controls remain unresolved**.

This document records the technical/license boundary. It is not legal advice. The complete Dexed application remains outside the FM1 Editor dependency boundary, and virtual results remain described as **DX7-compatible / FM-1-inspired**, not as measured physical Yamaha DX7 or M-VAVE FM-1 equivalence.

## Accepted architecture

```text
Dx7Voice
  -> createVirtualDx7RenderPlan()
     - legal semantic ranges only
     - deterministic identity + seed
     - 64-frame MSFA alignment
  -> createMsfaCompatibleVoiceBridge()
     - canonical Yamaha-compatible 155-byte voice representation
     - separate parameter-155 operator mask
     - private 156-byte engine buffer only
  -> packaged audited MSFA-compatible WASM
     -> createMsfaOfflineEngine()        deterministic whole-buffer dry PCM
     -> stateful session ABI             persistent one-voice note lifecycle
        -> fm1-msfa-worklet.js           2 x 64-frame blocks per 128-frame callback
```

Display names and imported raw source bytes are excluded from audio identity. The private 156-byte buffer is not a public raw-byte API, is never exposed as SysEx, and has no hardware-send path.

## Pinned source/license boundary

- audited upstream: `asb2m10/dexed@2e182b3db85c09083ab13c8b9b00565ce7d9ff85`
- complete Dexed application: GPL-3.0
- admitted synthesis closure: 23 file-level Apache-2.0 MSFA sources/headers
- distributed source: `third_party/msfa/`
- browser runtime: `public/virtual-dx7/`

The source manifest pins Git blob identities, upstream SHA-256 and derived SHA-256 values. The package excludes Dexed application/plugin/UI code, JUCE, `Source/Dexed.h`, MSFA tuning files, MTS-ESP, the external tuning library, effects, artwork, cartridges, patch banks and third-party reference audio.

Modified Apache files retain their original headers and carry prominent FM1 Editor modification notices. Distribution includes Apache-2.0 material, provenance/modification records and pinned Emscripten/musl/LLVM license material.

## Documented derived-source changes

1. Remove GPL application-header dependencies from Apache-marked `env.cc` and `controllers.h`.
2. Remove an unnecessary controller include from `fm_core.h`.
3. Remove MTS-ESP/tuning-library state from `dx7note.h/.cc`; retain standard 12-TET only.
4. Reset `Dx7Note` feedback history at construction for defined repeated-session state.
5. Initialize free-running LFO phase/delay deterministically and seed sample-and-hold from the semantic render seed.

Microtuning remains out of scope.

## Current packaged engine

`public/virtual-dx7/manifest.json` identifies:

- engine id: `fm1-editor-msfa-compatible`
- engine version: `msfa-2e182b3-fm1-v3-stateful`
- WASM SHA-256: `623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a`
- stateful session ABI: `1`
- engine render quantum: `64` frames
- Emscripten image digest: `emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`

The stateful ABI supports session create/destroy, semantic patch load, note on, note off, all-notes-off and one 64-frame dry render call. The AudioWorklet preserves persistent note/LFO/envelope state and combines two engine blocks for the browser's standard 128-frame callback.

## Deterministic offline evidence

Repository-owned fixed request:

- MIDI note 60
- velocity 100
- 48,000 Hz
- 1.0 s note-on + 0.5 s release
- 72,000 dry mono Float32 frames
- seed 42

Accepted PCM SHA-256:

`313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`

Native and WASM output for that fixture are byte-identical. Repeated WASM renders are byte-identical. The native/WASM comparison therefore has waveform correlation `1.0`, zero-frame alignment and `0 dB` log-magnitude difference for this fixture.

Sample-and-hold regression is deterministic per seed and differs across seeds. The accepted five-second renderer is far faster than real time on the recorded CI baseline. These facts establish deterministic virtual behavior only, not physical-device equivalence.

## TypeScript/offline integration

`src/audio/msfaOfflineEngine.ts` implements the semantic `VirtualDx7OfflineEngine` boundary and is aligned to v3-stateful package identity. It validates module patch/block contracts, creates the private bridge, forwards semantic render fields and seed, copies PCM before freeing WASM memory, validates normalized output and performs cancellation checks around the synchronous C++ render call.

## Accepted one-voice AudioWorklet gate

Application/browser boundary:

- `src/audio/msfaAudioWorklet.ts` — explicit-enable controller, local package/WASM verification, bounded ready timeout, semantic voice loading, note lifecycle and cleanup;
- `public/virtual-dx7/fm1-msfa-worklet.js` — one persistent local synth session, silence before voice load, two 64-frame renders per 128-frame callback, zero-output failure fallback and disposal;
- `scripts/test-msfa-audioworklet-browser.mjs` — real branded-browser execution harness.

Two real-browser integration bugs were found and fixed by the smoke gate:

1. `AudioWorkletGlobalScope` in tested Chrome/Edge did not expose `URL`; Emscripten's unused WASM URL lookup is bypassed via `locateFile` because verified WASM bytes are supplied directly.
2. Browser `process()` begins before the main thread can load a voice; pre-voice callbacks now remain silent instead of treating MSFA's no-patch status as fatal.

Permanent software-boundary evidence is in `docs/validation/msfa-audioworklet-software.md`.

Permanent 20-second branded-browser smoke evidence is in `docs/validation/msfa-audioworklet-browser-smoke.md`.

Permanent acceptance evidence is in `docs/validation/msfa-audioworklet-ten-minute-soak.md`:

- same-source software suite: success;
- Chrome `150.0.7871.187`: 600,612 ms, 798 note/release cycles, 48 kHz, zero processor errors, zero context suspensions, zero window errors and zero unhandled rejections;
- Edge `150.0.4078.99`: 600,630 ms, 798 cycles, 48 kHz, zero processor errors, zero suspensions, zero window errors and zero unhandled rejections;
- both observed finite non-silent PCM while active and exact analyser silence after all-notes-off.

The CI browser graph is headless/muted. Browser APIs used here expose no hardware underrun counter, so this gate validates processor/graph continuity and error/suspension observations, not audible physical sound-device dropout quality.

## Remaining scope

The minimum real-time feasibility gate is closed. Remaining work is product integration and expansion:

1. expose an explicit local preview in the voice workspace without creating an `AudioContext` before user action and without requiring or impersonating a MIDI output;
2. keep current semantic voice synchronization local-only and preserve all-notes-off cleanup on blur/visibility/unmount;
3. add deterministic polyphony/voice stealing while retaining the accepted one-voice regression path;
4. add pitch bend, modulation, sustain and aftertouch with targeted semantic/controller tests;
5. route preset audition and browser sequencer to local audio as explicit alternatives to hardware MIDI;
6. implement the FM-1-inspired effect graph separately from the dry engine;
7. perform physical Yamaha DX7 / M-VAVE FM-1 audio comparisons only after controlled hardware capture exists.

## Permanent evidence index

- `docs/validation/msfa-source-hash-execution.md`
- `docs/validation/msfa-deterministic-reset.md`
- `docs/validation/msfa-distribution-package.md`
- `docs/validation/msfa-seeded-lfo.md`
- `docs/validation/msfa-offline-engine-integration.md`
- `docs/validation/msfa-audioworklet-software.md`
- `docs/validation/msfa-audioworklet-browser-smoke.md`
- `docs/validation/msfa-audioworklet-ten-minute-soak.md`
