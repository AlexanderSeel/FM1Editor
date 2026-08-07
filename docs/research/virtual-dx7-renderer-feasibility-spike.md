# Virtual DX7 renderer feasibility spike

Last reviewed: 2026-08-07

Status: **audited, deterministic dry offline engine packaged and integrated; stateful AudioWorklet remains unresolved**.

This document records a technical/license boundary, not legal advice. The complete Dexed application remains outside the FM1 Editor dependency boundary.

## Decision

Proceed with the narrowly audited MSFA-compatible core. The selected source set is packaged under Apache-2.0 with explicit provenance and modification records, the generated browser artifact is reproducible, and the application now exposes it only through the semantic `VirtualDx7OfflineEngine` boundary.

The virtual result remains **DX7-compatible / FM-1-inspired**, not a physical-device emulator claim.

## Repository-owned semantic boundary

The application-facing path is:

```text
Dx7Voice
  -> createVirtualDx7RenderPlan()
     - legal semantic ranges only
     - 64-frame MSFA block alignment
     - deterministic render identity
     - explicit random seed
  -> createMsfaCompatibleVoiceBridge()
     - canonical Yamaha-compatible 155-byte voice data
     - separate parameter-155 operator mask
     - private 156-byte engine buffer only
  -> createMsfaOfflineEngine()
     - packaged local WASM only
     - cancellation checks around synchronous render
     - normalized dry mono Float32 PCM
     - allocation cleanup and PCM validation
```

Display names and imported `source.packed` / `source.unpacked` bytes are excluded from audio identity. The 156-byte compatibility buffer is never exposed as SysEx and has no hardware-send path.

## Pinned upstream and license boundary

Audit target:

- repository: `https://github.com/asb2m10/dexed`
- commit: `2e182b3db85c09083ab13c8b9b00565ce7d9ff85`
- complete Dexed application license: GPL-3.0
- admitted engine boundary: 23 file-level Apache-2.0 MSFA sources/headers

The candidate files are pinned by Git blob identity and SHA-256 in `docs/research/msfa-source-audit.json`. The source-root audit verifies the local include closure and rejects undeclared dependencies.

The distributed package excludes:

- `Source/Dexed.h` and all Dexed application/plugin/UI code;
- `Source/msfa/tuning.h` and `tuning.cc`;
- JUCE;
- MTS-ESP;
- `surge-synthesizer/tuning-library`;
- Dexed effects, artwork, cartridges and patch banks;
- third-party reference audio.

Distribution material is stored under `third_party/msfa/` and browser runtime artifacts under `public/virtual-dx7/`. The package retains original Apache headers, a complete Apache-2.0 license, FM1 Editor provenance/modification notices, exact upstream/derived hashes and pinned Emscripten/musl/LLVM toolchain license material.

## Derived-source changes

The admitted source remains recognizable MSFA code, with narrow documented changes:

1. remove GPL application-header dependencies from Apache-marked `env.cc` and `controllers.h`;
2. remove an unnecessary controller include from `fm_core.h`;
3. remove MTS-ESP/tuning-library state and includes from `dx7note.h/.cc`;
4. retain only the pinned standard-12-TET integer log-frequency path;
5. reset `Dx7Note` feedback history at construction so repeated render sessions start from defined state;
6. initialize free-running LFO phase and delay state deterministically;
7. seed sample-and-hold LFO state from the semantic render-plan seed.

Every modified distributed Apache file is marked prominently and listed in `third_party/msfa/manifest.json` with upstream and derived hashes. Microtuning remains out of scope.

## Accepted packaged engine

Published identity from `public/virtual-dx7/manifest.json`:

- engine id: `fm1-editor-msfa-compatible`
- engine version: `msfa-2e182b3-fm1-v2-seeded`
- WASM SHA-256: `d45658932e6cf8c9c1f670e152ee476f90c4d5e8a63ac08ee0f20acf53f0d442`
- source-manifest SHA-256: `e1ee6348bfadd41de6415a9fde80598deb978179055b75bf782d70d55473033c`
- Emscripten image: `emscripten/emsdk:4.0.7`
- image digest: `sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`

Permanent evidence:

- `docs/validation/msfa-source-hash-execution.md`
- `docs/validation/msfa-deterministic-reset.md`
- `docs/validation/msfa-distribution-package.md`
- `docs/validation/msfa-seeded-lfo.md`
- `docs/validation/msfa-offline-engine-integration.md`

## Deterministic reference evidence

The repository-owned synthetic fixture uses:

- MIDI note 60;
- velocity 100;
- 48,000 Hz;
- 1.0 second note-on;
- 0.5 second release;
- 72,000 dry mono frames;
- random seed 42.

Validated output:

- native/fixed PCM SHA-256: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`;
- fixed repeated WASM renders: byte-identical;
- native and WASM fixed PCM: byte-identical;
- fixed peak: `0.125518799`;
- fixed RMS: `0.00961926`;
- native/WASM correlation: `1.0` with zero-frame alignment and `0 dB` log-magnitude difference for the fixture.

Seeded sample-and-hold regression:

- seed 42 PCM: `f10de7a842efd41e11833b268cabf090a011cf23c56d5b2ab6a42c181a387124`;
- seed 43 PCM: `ffe5dd6824407e0072128691dcf20bafa162c8266cff25910a66471ba6b5a573`;
- each seed is stable across repeated renders;
- different seeds produce different PCM.

The recorded five-second v2 render completed in `11.016 ms` on the validation runner, real-time ratio `0.002203`.

These results establish deterministic **virtual dry-render behavior**, not physical Yamaha DX7 or M-VAVE FM-1 equivalence.

## Offline TypeScript integration

`src/audio/msfaOfflineEngine.ts` now loads only the packaged local module and implements `VirtualDx7OfflineEngine`.

It:

- accepts only a validated semantic render plan;
- verifies WASM patch length and 64-frame block size;
- maps through `createMsfaCompatibleVoiceBridge()`;
- forwards note, velocity, sample rate, block-aligned note/release frames and random seed;
- copies PCM before freeing WASM memory;
- validates mono frame count, normalization and render identity;
- caches one Emscripten module instance for sequential renders;
- checks cancellation before module loading, before the synchronous C++ call and immediately after it.

The C++ render call is synchronous, so an in-progress call cannot currently be preempted mid-call. This is acceptable for the measured offline render times but must not be confused with cooperative cancellation inside a long optimizer loop; optimization orchestration must check cancellation between candidate renders.

## Remaining real-time gate

The next minimum is a **stateful one-voice AudioWorklet**, not a UI feature expansion.

Required behavior:

- load one semantic voice through the same bridge/core;
- explicit browser audio enable/resume;
- persistent synthesis state across callbacks;
- note on;
- note off;
- all-notes-off;
- 128-frame AudioWorklet callbacks while preserving the MSFA 64-frame synthesis quantum;
- dry output only;
- explicit lifecycle cleanup;
- no NaN/Infinity output or uncaught processor errors;
- ten-minute Chrome and Edge soak with browser versions and dropout/underrun observations recorded.

The current whole-buffer `fm1_msfa_render()` function is not a real-time API. The worklet therefore needs a separate stateful C++ session interface rather than repeatedly restarting the offline renderer.

Only after the one-voice worklet is stable should the project add polyphony, velocity variation, pitch bend, modulation, sustain, aftertouch, virtual-piano/sequencer routing and the separate FM-1-inspired effect graph.

## Current blockers

1. No stateful WASM session API exists for real-time note lifecycle.
2. No AudioWorklet processor or browser audio controller exists.
3. No Chrome/Edge ten-minute audio soak receipt exists.
4. No physical FM-1 or stock Yamaha DX7 comparison recording exists.

## Next implementation step

Implement a minimal stateful C++/WASM session using the already-audited source package: create/destroy one synth session, load the private semantic patch, note-on, note-off, all-notes-off and render exactly 64 dry frames per engine call. Then wrap two 64-frame calls in each 128-frame `AudioWorkletProcessor.process()` callback and validate lifecycle/error behavior before exposing the worklet in the application UI.
