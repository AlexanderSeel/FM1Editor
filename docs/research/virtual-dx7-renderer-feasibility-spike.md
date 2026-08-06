# Virtual DX7 renderer feasibility spike

Last reviewed: 2026-08-06

Status: **semantic boundary implemented; upstream engine not yet integrated or approved**.

This document is a technical feasibility and license-boundary record, not legal advice. It deliberately stops before copying, compiling or distributing an upstream synthesis engine.

## Decision

Proceed only with a narrowly isolated, MSFA-compatible engine core after a file-by-file and transitive-dependency audit. Do not copy the complete Dexed application, plugin wrapper, JUCE integration, UI, assets, cartridges or patch banks into the MIT FM1 Editor.

The first repository change is the dependency-free contract in `src/audio/virtualDx7Engine.ts`. It provides:

- a deterministic render-plan schema;
- strict Yamaha-compatible semantic range checks;
- a deep semantic snapshot of `Dx7Voice`;
- exclusion of display name and imported packed/unpacked source bytes from render identity;
- fixed 44.1 kHz and 48 kHz feasibility sample rates;
- explicit note, velocity, note-on duration, release duration and random seed;
- deterministic render keys;
- a cancellable offline-engine interface;
- validation of dry mono normalized PCM returned by a future engine.

It does not render audio, load WebAssembly, create an `AudioWorklet`, access Web MIDI or transmit anything to hardware.

## Pinned upstream review target

Preliminary inspection used Dexed commit:

- repository: `https://github.com/asb2m10/dexed`
- commit: `2e182b3db85c09083ab13c8b9b00565ce7d9ff85`
- reviewed on: 2026-08-06

The pinned Dexed repository root contains GPL-3.0 licensing for the complete application. Individual files inspected under `Source/msfa`, including `dx7note.cc`, carry Apache-2.0 headers. That is a promising boundary but is not sufficient by itself to approve copying the directory.

The pinned `Source/CMakeLists.txt` compiles these MSFA-path sources into Dexed:

- `dx7note.cc`
- `env.cc`
- `exp2.cc`
- `fm_core.cc`
- `fm_op_kernel.cc`
- `freqlut.cc`
- `lfo.cc`
- `pitchenv.cc`
- `sin.cc`
- `tuning.cc`
- `porta.cpp`

The same target also compiles `libs/MTS-ESP/Client/libMTSClient.cpp`, and `dx7note.h` includes tuning, portamento and MTS-ESP client types. The exact minimal browser engine therefore has a transitive boundary that must be resolved explicitly. A directory-level statement that “MSFA is Apache-2.0” is not enough to approve the current build graph.

The current MTS-ESP repository exposes a permissive license, but the exact submodule revision used by the pinned Dexed commit and every source/header included in the proposed browser build still require recording. The tuning-library path must be audited in the same way.

## Proposed approved source boundary

A future integration may contain only:

1. the minimum required MSFA implementation and headers after every file has an SPDX/license record;
2. a small FM1 Editor-owned C/C++ bridge that accepts validated semantic voice data and render controls;
3. explicitly approved tuning support, or a documented standard-12-TET-only adapter that removes unused optional tuning dependencies without changing the upstream license terms;
4. build scripts, an Emscripten toolchain pin and generated WebAssembly/glue artifacts;
5. required Apache-2.0 license and NOTICE material plus notices for every retained transitive component.

The boundary must exclude:

- Dexed `Plugin*`, editor, UI, cartridge manager, SysEx UI and JUCE wrapper code;
- GPL-3.0 application code unless the project makes an explicit compatible relicensing/distribution decision;
- VST3, CLAP, AU and standalone plugin plumbing;
- upstream artwork, factory cartridges, third-party patch banks and reference audio without verified redistribution rights;
- optional tuning or MTS code that is not required and has not been audited.

## Expected architecture

```text
Dx7Voice
  -> createVirtualDx7RenderPlan()
     - semantic range validation
     - immutable semantic snapshot
     - deterministic identity
  -> FM1 Editor-owned engine bridge
     - semantic-to-engine mapping
     - no public arbitrary-byte API
  -> audited MSFA-compatible WebAssembly core
     -> offline dry mono Float32 PCM
     -> AudioWorklet render blocks
  -> separate master gain / limiter
  -> later, separate FM-1-inspired effects graph with dry bypass
```

Raw packed or unpacked DX7 bytes may be produced internally by a reviewed codec/bridge when required by the engine, but optimization, UI and public render APIs must continue to operate on legal semantic fields. The bridge must not expose arbitrary memory writes or an unvalidated raw-byte render entry point.

The offline renderer and real-time renderer must use the same voice mapping, controller defaults, sample-rate configuration, random seed policy and synthesis core. Effects remain outside the dry renderer.

## Feasibility acceptance criteria

The MSFA/WASM spike is accepted only when all criteria below have permanent evidence.

### License and provenance

- Pin the exact upstream commit and every submodule/transitive revision.
- Record every copied or compiled source/header path, SHA-256, copyright header and SPDX conclusion in a machine-readable manifest.
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

1. The exact file-by-file and transitive license manifest is incomplete.
2. The current Dexed engine path reaches tuning and MTS-ESP code; the minimal default-tuning boundary has not been built or compared.
3. No Emscripten toolchain, generated WebAssembly artifact or AudioWorklet code is present in FM1 Editor.
4. No trusted reference PCM and comparison receipt exists for the selected synthetic voice.
5. No Chrome/Edge audio execution receipt exists for the renderer.
6. No physical FM-1 or stock Yamaha DX7 recording is part of this spike, and virtual results must not be described as physical-device validation.

## Next implementation step

Create a separate audited source manifest and reproducible Emscripten build spike outside the application UI. Integrate no large dependency until the manifest resolves the tuning/MTS boundary and the build can produce deterministic offline PCM for the fixed request above. Only then connect the same core to an `AudioWorklet` and compare it with the trusted reference.
