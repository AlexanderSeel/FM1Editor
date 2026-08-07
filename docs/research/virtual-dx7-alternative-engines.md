# Virtual DX7 fallback-engine audit

Last reviewed: 2026-08-07

Status: **evaluation complete; neither Synth_Dexed nor `dx7-synth-js` is admitted as a production dependency**.

This is a technical/license screening record, not legal advice. The already-packaged FM1 Editor MSFA-compatible engine remains the production renderer because it has a narrower audited Apache-2.0 source closure, deterministic build/render receipts and accepted Chrome/Edge behavior.

## Decision summary

| Candidate | Reviewed identity | License finding | Compatibility finding | Maintenance finding | Decision |
| --- | --- | --- | --- | --- | --- |
| Synth_Dexed | `probonopd/Synth_Dexed`, mirror default `sync@17249e56bd2fe1aa82097bd105ee7123c0c57de1`; reviewed `master` API/README | `master` README says the surrounding MicroDexed project is GPL v3 while the MSFA component stays Apache-2.0. No root `LICENSE`, `LICENSE.txt` or `COPYING` file was found through the reviewed GitHub mirror paths, so the wrapper-level reuse boundary is not explicit enough for admission. | Native/Teensy-oriented C++ library with DX7 SysEx compatibility and a broad controller API. Browser/WASM packaging, deterministic seeded rendering and FM1 Editor's semantic bridge would still need a separate port and audit. | Mirror is active enough to have 2025 metadata changes and a 2026 continuous-build release; MiniDexed continues to consume Synth_Dexed. | **Reference only.** Do not vendor the wrapper. Reuse no source unless a separately pinned file-level license audit proves an Apache-compatible subset beyond the MSFA code already packaged here. |
| `dx7-synth-js` | `mmontag/dx7-synth-js@f269f0e02fc67b2f824b01a8416339cd5c4829e0` | `package.json` declares `ISC`; no root `LICENSE` file was found at the reviewed commit, so file-level provenance would still be required before copying source. | Browser-native Web Audio/Web MIDI implementation, but its README explicitly describes it as a high-level emulation that is “not super accurate” and adds non-DX7 stereo operator panning. It does not provide the accepted MSFA PCM identity or our semantic/WASM contract. | Not archived; latest reviewed commit is 2025-05-18. Build stack still uses Angular 1.x, Webpack 4 and legacy compatibility settings. | **Reference only.** Useful for UI/Web Audio ideas, not as a renderer replacement or fidelity baseline. |

## Synth_Dexed audit

### Branch and architecture

The GitHub mirror exposes `sync`, `master`, `dev`, `native`, `minidexed-native`, `stepseq` and other branches. The mirror README describes Synth_Dexed as a port of the Dexed sound engine for Teensy and native desktop experiments. The `master` README exposes an `AudioSynthDexed` API including:

- configurable maximum notes / polyphony;
- Yamaha-compatible voice encode/decode and voice parameter access;
- note on/off, sustain, sostenuto and panic;
- portamento;
- pitch-bend range/step;
- modulation wheel, foot, breath and aftertouch assignments;
- filter cutoff/resonance and gain;
- operator control.

Those capabilities make it a useful behavior/API reference, especially for controller semantics and embedded polyphony. They do not remove the need for a browser-specific WASM/AudioWorklet bridge or deterministic render contract.

### License boundary

The reviewed `master` README states that the MSFA component remains Apache-2.0, while the surrounding project statement references GPL v3. The mirror does not expose a root license file at the conventional paths checked during this audit. Because the exact wrapper/file-level boundary is therefore not explicit enough for redistribution, FM1 Editor does **not** admit Synth_Dexed source as a dependency.

The potentially reusable Apache MSFA lineage is already represented by FM1 Editor's narrower, file-hashed and provenance-recorded `third_party/msfa/` package. Importing Synth_Dexed merely to reach the same engine family would increase the license and platform surface without a demonstrated renderer benefit.

### Compatibility gaps versus the accepted renderer

Synth_Dexed would still need all of the following before it could replace the current engine:

1. a pinned browser/WASM build path and deterministic toolchain;
2. a semantic `Dx7Voice` adapter with no public arbitrary-byte hardware path;
3. seeded/free-running LFO behavior defined for regression testing;
4. deterministic PCM/reference comparison against the accepted renderer;
5. AudioWorklet lifecycle, failure-silence and Chrome/Edge soak validation;
6. a file-by-file license/provenance manifest for every admitted wrapper source.

There is no current reason to duplicate that work.

## `dx7-synth-js` audit

### License and maintenance

Reviewed commit: `f269f0e02fc67b2f824b01a8416339cd5c4829e0` (2025-05-18).

`package.json` declares the package license as `ISC`. The repository is public and not archived. Its dependency/build surface is nevertheless old: Angular 1.x, Webpack 4, `webpack-dev-server` 3 and an OpenSSL legacy-provider compatibility setting are part of the reviewed project history. Before any source reuse, a file-level provenance audit would still be required because a conventional root `LICENSE` file was not found at the reviewed commit.

### Fidelity and semantic gaps

The project README explicitly describes the synthesizer as a high-level DX7 emulation that is not highly accurate. It also adds stereo panning per operator, which is outside the original DX7 voice semantics used by FM1 Editor.

That makes it inappropriate as:

- the deterministic PCM reference for audio-to-FM matching;
- a drop-in replacement for the audited MSFA-compatible engine;
- evidence of physical Yamaha DX7 or M-VAVE FM-1 equivalence.

It remains useful as a historical browser/Web Audio implementation reference.

## Adoption rule

Neither candidate is added to `package.json`, `third_party/` or `public/` by this evaluation.

Reconsider a candidate only if it offers a concrete capability missing from the current renderer and the proposed source subset first passes:

1. exact commit/branch pinning;
2. file-level SPDX/copyright/provenance review;
3. dependency/transitive-license audit;
4. semantic parameter-gap mapping against `Dx7Voice` and local performance state;
5. deterministic PCM and browser performance comparison against the accepted MSFA engine.

Until then the production choice remains the existing audited MSFA-compatible renderer.
