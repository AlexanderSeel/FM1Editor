# Virtual DX7 renderer feasibility spike

Last reviewed: 2026-08-07

Status: **offline MSFA-compatible WebAssembly feasibility accepted; distribution and AudioWorklet integration remain unresolved**.

This document records a technical/license boundary, not legal advice. The complete Dexed application remains outside the FM1 Editor dependency boundary.

## Decision

Proceed with the narrow audited MSFA-compatible core. The offline spike now proves that the selected Apache-2.0 source boundary can be transformed outside the repository into a deterministic native and WebAssembly renderer without compiling Dexed's GPL-3.0 application/plugin wrapper, JUCE, MTS-ESP or the external tuning library.

Do not distribute the temporary engine source or generated binaries until the repository contains the required Apache-2.0 license/attribution package and a derived-source modification manifest.

## Repository-owned boundary

The application-side contract remains semantic:

- `src/audio/virtualDx7Engine.ts` validates and snapshots legal `Dx7Voice` fields and defines deterministic render plans;
- `src/audio/msfaVoiceBridge.ts` maps that semantic snapshot through the existing Yamaha encoder into a private 155-byte voice representation plus separate parameter-155 operator state;
- names and imported `source.packed` / `source.unpacked` bytes are excluded from render identity;
- no public arbitrary-byte render API or hardware-send path exists;
- `src/audio/virtualDx7ReferenceFixture.ts` defines the repository-owned synthetic reference voice and fixed 48 kHz render request.

The private 156-byte bridge buffer is an engine implementation detail only. It must never be exposed as SysEx or sent to hardware.

## Pinned upstream boundary

Audit target:

- repository: `https://github.com/asb2m10/dexed`
- commit: `2e182b3db85c09083ab13c8b9b00565ce7d9ff85`
- complete application license: GPL-3.0
- admitted low-level candidate files: 23 file-level Apache-2.0 MSFA sources/headers recorded in `msfa-source-audit.json`

The machine-readable audit records exact upstream Git blob identities and SHA-256 values. A networked execution verified all 23 files, their Apache headers and the local include closure. See `docs/validation/msfa-source-hash-execution.md`.

The feasibility boundary excludes:

- `Source/Dexed.h` and all Dexed plugin/UI/application code;
- `Source/msfa/tuning.h` and `tuning.cc`;
- JUCE;
- MTS-ESP;
- `surge-synthesizer/tuning-library`;
- plugin formats, effects, artwork, cartridges, patch banks and third-party reference audio.

## Derived-source changes used by the spike

`scripts/materialize-msfa-spike.mjs` works only against an exact pinned checkout and refuses to write the derived source inside the FM1 Editor repository. It verifies source hashes before applying these narrow changes in a temporary directory:

1. remove `../Dexed.h` dependencies from Apache-marked `env.cc` and `controllers.h` and use standard-library `min/max` support;
2. remove the unused controller include from `fm_core.h`;
3. remove tuning/MTS-ESP state and includes from `dx7note.h/.cc`;
4. replace optional tuning with the same standard-12-TET integer log-frequency relation used by the pinned standard-tuning path;
5. reset the two-sample `Dx7Note` feedback history to zero on construction.

The feedback reset is required for an offline renderer lifecycle: the pinned constructor leaves `fb_buf_` uninitialized. A fresh native process and the first fresh WASM render happened to start with zero memory, but a second render in the same module retained old feedback state. The explicit reset makes repeated renders deterministic without changing the voice semantics.

Microtuning remains outside this feasibility scope.

## Offline architecture proved

```text
Dx7Voice
  -> createVirtualDx7RenderPlan()
  -> createMsfaCompatibleVoiceBridge()
  -> FM1 Editor-owned C++ dry-render bridge
  -> temporary audited/derived MSFA source closure
  -> Emscripten WebAssembly
  -> dry mono normalized Float32 PCM
```

The C++ spike uses the pinned MSFA 64-sample synthesis block, explicit controller defaults, standard 12-TET, note on/release, oscillator key sync and the dry integer-to-float conversion observed at the Dexed/MSFA boundary. Effects are not part of the dry engine.

## Accepted offline evidence

Permanent receipt: `docs/validation/msfa-deterministic-reset.md`.

Validated source commit: `b32f8363bcac03a87ee483c0e880a0e28900a1e8`.

Pinned toolchain:

- Emscripten image: `emscripten/emsdk:4.0.7`
- resolved image digest: `sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`

Reproducibility and output:

- two clean WASM builds: identical SHA-256 `2f39f43d45fc4be075e0bc7ca4be76fb662372da1690c5db067cb565bb65b331`;
- native fixed PCM SHA-256: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`;
- WASM fixed PCM SHA-256: the same `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`;
- repeated 72,000-frame WASM render: byte-identical;
- fixed output: peak `0.125518799`, RMS `0.00961926`, first render `4.187 ms` on the recorded runner;
- five-second render: `8.111 ms`, real-time ratio `0.001622`;
- generated size: 27,557-byte WASM + 8,783-byte glue; combined gzip 20,032 bytes;
- native/WASM fixed PCM byte-identical, therefore waveform correlation `1.0`, zero-frame alignment and log-magnitude error `0 dB` for this fixture.

The same execution also passed typecheck, lint, the full Vitest suite and production build. The generated engine source/binaries remained runner-temporary and were not committed.

These measurements establish **DX7-compatible dry-render feasibility only**. They are not physical Yamaha DX7 or M-VAVE FM-1 validation.

## Fixed synthetic fixture

The repository-owned reference uses:

- MIDI note 60;
- velocity 100;
- 48,000 Hz;
- 1.0 s note-on;
- 0.5 s release window;
- 72,000 mono frames;
- render-plan seed 42;
- dry output only.

The seed is part of the public deterministic plan identity. The current triangle-LFO fixture does not exercise MSFA sample-and-hold randomness; explicit seeded S&H behavior remains required before claiming deterministic coverage for every legal LFO waveform.

## Remaining distribution gate

Before checking an engine source tree or WASM artifact into FM1 Editor:

- add the Apache-2.0 license text;
- add required attribution/NOTICE material and state the pinned upstream revision;
- mark every modified Apache source file prominently as modified;
- record upstream and derived SHA-256 values in a machine-readable derived-source manifest;
- verify that the committed set contains no GPL/JUCE/MTS/tuning-library source;
- verify the committed/generated WASM against the accepted build hash or intentionally re-baseline it with a new receipt.

## Remaining real-time gate

The next minimum is deliberately smaller than the later full virtual instrument:

- load one known semantic voice through the same mapping/core;
- render through an `AudioWorklet` using standard 128-frame worklet callbacks while internally respecting the 64-frame MSFA block;
- note on, note off and all-notes-off;
- explicit audio enable/resume and lifecycle cleanup;
- no NaN/Infinity output or uncaught processor errors;
- ten-minute Chrome and Edge soak with recorded versions and dropout/underrun observations.

Only after that gate should the app add polyphony, velocity variation, pitch bend, modulation, sustain, aftertouch, piano/sequencer routing and FM-1-inspired effects.

## Current blockers

1. Apache-2.0 license/NOTICE and derived-source distribution metadata have not yet been committed.
2. The accepted WASM artifact is not yet distributed or wired to the TypeScript `VirtualDx7Engine` interface.
3. Sample-and-hold LFO needs an explicit seed/reset policy before all-voice deterministic coverage is claimed.
4. No `AudioWorklet` implementation or Chrome/Edge audio soak receipt exists.
5. No physical FM-1 or stock Yamaha DX7 recording is part of this work.

## Next implementation step

Create the distributable audited engine package: generate only the accepted derived source set, add Apache-2.0 license/attribution and a derived-source manifest, build the pinned WASM artifact reproducibly, and make the dry offline renderer available through the existing semantic `VirtualDx7Engine` interface. Then implement the one-voice AudioWorklet gate. Do not add FM-1-inspired effects or AI reconstruction until the dry real-time renderer is stable.
