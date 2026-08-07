# Virtual DX7 renderer feasibility spike

Last reviewed: 2026-08-07

Status: **semantic boundary, source-admission manifest and private MSFA voice bridge implemented; upstream engine not yet vendored, compiled or approved for distribution**.

This document is a technical feasibility and license-boundary record, not legal advice. It deliberately stops before copying, compiling or distributing an upstream synthesis engine.

## Decision

Proceed only with a narrowly isolated, MSFA-compatible engine core after file-by-file admission. Do not copy the complete Dexed application, plugin wrapper, JUCE integration, UI, assets, cartridges or patch banks into the MIT FM1 Editor.

The dependency-free TypeScript boundary now consists of:

- `src/audio/virtualDx7Engine.ts` — deterministic semantic render plan, range validation, cache identity, cancellation contract and dry PCM validation;
- `src/audio/msfaVoiceBridge.ts` — private semantic-to-engine mapping through the repository's existing Yamaha-compatible voice encoder;
- `docs/research/msfa-source-audit.json` — pinned source-admission policy and candidate/exclusion manifest;
- `scripts/verify-msfa-source-audit.mjs` — manifest and optional pinned-source verifier.

The public render contract provides:

- a deterministic render-plan schema;
- strict Yamaha-compatible semantic range checks;
- a deep semantic snapshot of `Dx7Voice`;
- exclusion of display name and imported packed/unpacked source bytes from render identity;
- fixed 44.1 kHz and 48 kHz feasibility sample rates;
- explicit note, velocity, note-on duration, release duration and random seed;
- deterministic render keys;
- a cancellable offline-engine interface;
- validation of dry mono normalized PCM returned by a future engine.

The private MSFA bridge:

- starts from the validated semantic render-plan snapshot, not user-supplied raw bytes;
- uses `encodeSingleVoiceData()` to produce the canonical Yamaha 155-byte voice representation;
- canonicalizes the ten-byte voice name so display metadata cannot affect engine input;
- keeps Yamaha parameter `155` separate from the 155-byte voice payload and derives its initial all-operators-enabled value from the existing `Dx7EditSession` model;
- creates a 156-byte buffer only as a private compatibility boundary for the future audited C/C++ adapter;
- must also map the operator mask into the renderer's controller/operator state rather than assuming the pinned `Dx7Note::init()` consumes byte 155;
- must never expose that buffer as SysEx, accept arbitrary raw byte writes, or transmit it to hardware.

None of this code renders audio, loads WebAssembly, creates an `AudioWorklet`, accesses Web MIDI or transmits anything to hardware.

## Pinned upstream review target

The source audit is pinned to:

- repository: `https://github.com/asb2m10/dexed`
- commit: `2e182b3db85c09083ab13c8b9b00565ce7d9ff85`
- reviewed on: 2026-08-07

The pinned Dexed repository is GPL-3.0 at the complete-application level. The low-level candidate MSFA files admitted by `msfa-source-audit.json` carry Apache-2.0 headers. Directory membership or the project-level statement that MSFA remains Apache-2.0 is not treated as sufficient by itself; every candidate file is pinned separately.

The pinned Dexed `Source/CMakeLists.txt` currently builds MSFA code together with tuning/MTS-ESP integration. Deeper review found additional license/dependency edges:

- `Source/msfa/tuning.cc` directly includes JUCE GUI code and uses the external tuning library;
- `Source/msfa/tuning.h` requires `Tunings.h` and has no file-level Apache header in the reviewed content;
- `Source/msfa/dx7note.h/.cc` reach tuning and MTS-ESP APIs;
- Apache-marked `Source/msfa/controllers.h` and `Source/msfa/env.cc` include GPL-licensed `Source/Dexed.h`.

The feasibility spike therefore does **not** compile these dependencies through unchanged. The machine-readable audit excludes `Source/Dexed.h`, `tuning.h`, `tuning.cc`, JUCE, MTS-ESP and the tuning library from the initial browser renderer. FM1 Editor will own a small standard-12-TET adapter. Microtuning remains outside the feasibility gate.

## Approved candidate boundary before vendoring

A future source integration may contain only:

1. the candidate MSFA implementation/header set admitted by `docs/research/msfa-source-audit.json` after exact content hashes are recorded;
2. derived Apache-2.0 files only where the manifest explicitly records the required removal of GPL/JUCE/MTS/tuning edges, with original copyright/license headers retained and modifications documented;
3. a small FM1 Editor-owned standard-12-TET adapter and C/C++ bridge;
4. build scripts, an Emscripten toolchain pin and generated WebAssembly/glue artifacts;
5. required Apache-2.0 license and NOTICE/attribution material.

The boundary must exclude:

- Dexed `Plugin*`, editor, UI, cartridge manager, SysEx UI and JUCE wrapper code;
- GPL-3.0 application code unless the project makes an explicit compatible licensing/distribution decision;
- VST3, CLAP, AU and standalone plugin plumbing;
- upstream artwork, factory cartridges, third-party patch banks and reference audio without verified redistribution rights;
- microtuning/MTS dependencies for the initial feasibility renderer.

## Expected architecture

```text
Dx7Voice
  -> createVirtualDx7RenderPlan()
     - semantic range validation
     - immutable semantic snapshot
     - deterministic identity
  -> createMsfaCompatibleVoiceBridge()
     - existing Yamaha semantic encoder
     - canonical 155-byte voice data
     - separate parameter-155 all-operators-on edit state
     - private 156-byte compatibility buffer only
  -> FM1 Editor-owned C/C++ bridge
     - standard 12-TET adapter
     - explicit controller/operator defaults
     - no public arbitrary-byte API
  -> audited MSFA-compatible WebAssembly core
     -> offline dry mono Float32 PCM
     -> AudioWorklet render blocks
  -> separate master gain / limiter
  -> later, separate FM-1-inspired effects graph with dry bypass
```

Raw packed or unpacked DX7 bytes may exist only inside reviewed codec/bridge internals required by the engine. Optimization, UI and public render APIs continue to operate on legal semantic fields. The bridge must not expose arbitrary memory writes or an unvalidated raw-byte render entry point.

The offline renderer and real-time renderer must use the same voice mapping, standard-tuning adapter, controller defaults, sample-rate configuration, random-seed policy and synthesis core. Effects remain outside the dry renderer.

## Feasibility acceptance criteria

The MSFA/WASM spike is accepted only when all criteria below have permanent evidence.

### License and provenance

- Pin the exact upstream commit and every copied/derived source revision.
- Record every copied or compiled source/header path, SHA-256, copyright header and license conclusion in the machine-readable manifest.
- Run `npm run audit:virtual-dx7 -- --source-root <exact-pinned-checkout> --require-hashes` before vendoring.
- Confirm that no complete Dexed GPL wrapper source is compiled into or copied into the MIT application.
- Add the exact Apache-2.0 license text and all required NOTICE/attribution material before distributing source or binaries.
- Record licenses and redistribution rights for the known voice fixture and reference PCM.

### Reproducible build

- Pin Emscripten and the container/toolchain image by immutable version or digest.
- Build from a clean checkout with one documented command.
- Produce the same WebAssembly SHA-256 in two clean builds on the recorded build image, or document and remove the source of nondeterminism before acceptance.
- Keep the minimal compressed engine plus glue at or below 1 MiB for the feasibility target; record uncompressed and compressed sizes.

### Deterministic offline render

Use a repository-owned synthetic DX7 voice fixture with this fixed request:

- MIDI note: 60;
- velocity: 100;
- sample rate: 48,000 Hz;
- note on: 1.0 second;
- release render window: 0.5 second;
- random seed: 42;
- dry mono output: exactly 72,000 normalized Float32 frames.

Two renders from the same WebAssembly artifact must be byte-identical and produce the same SHA-256. No sample may be NaN, infinite or outside `[-1, 1]`.

A five-second dry render must complete faster than real time on the recorded CI baseline. The receipt must include CPU, operating system, browser or Node runtime, elapsed time and peak memory rather than general performance claims.

### Trusted reference comparison

Generate a dry reference from the same pinned and audited MSFA source using a documented trusted native/Dexed path, with no effects, resampling, limiter or undocumented controller state.

After at most one documented constant gain alignment and no time shift:

- peak cross-correlation must occur at zero-frame lag;
- normalized waveform correlation must be at least `0.999`;
- mean absolute multi-resolution log-magnitude error must be at most `0.25 dB`.

A failed threshold is a failed feasibility result, not permission to silently alter the reference or claim approximate equivalence. Store the comparison script, metric output and reference provenance.

### Real-time minimum

- Load one known semantic voice.
- Start and release one note through an `AudioWorklet`.
- Implement all-notes-off and lifecycle cleanup.
- Render standard 128-frame worklet blocks without NaN/Infinity output or uncaught processor errors.
- Run a ten-minute Chrome and Edge soak at the recorded sample rate with zero uncaught worklet errors; record underrun/dropout observations and browser versions.

Polyphony, pitch bend, modulation, sustain, aftertouch and FM-1-inspired effects are explicitly outside this minimum acceptance gate.

## Current blockers

1. Candidate upstream files have Git blob identities recorded, but their SHA-256 values have not yet been materialized into the manifest and no third-party source is vendored.
2. The Apache-2.0 license/NOTICE package and derived-file modification record have not yet been added because distribution has not begun.
3. The standard-12-TET C/C++ adapter and patched MSFA candidate source set have not been compiled together.
4. No Emscripten toolchain, generated WebAssembly artifact or AudioWorklet code is present in FM1 Editor.
5. No trusted reference PCM and comparison receipt exists for the selected synthetic voice.
6. No Chrome/Edge audio execution receipt exists for the renderer.
7. No physical FM-1 or stock Yamaha DX7 recording is part of this spike, and virtual results must not be described as physical-device validation.

## Next implementation step

Materialize the exact pinned candidate source set outside the application UI, fill the SHA-256 fields, add Apache-2.0/NOTICE material and prove the source-root audit. Then add only the documented derived files plus the FM1 Editor-owned standard-tuning/C++ bridge and a pinned Emscripten build for deterministic offline PCM. Do not connect an `AudioWorklet` or the application UI until that offline build passes the deterministic and trusted-reference gates.
