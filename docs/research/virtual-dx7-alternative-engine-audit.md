# Virtual DX7 alternative-engine audit

Last reviewed: 2026-08-07

Status: **complete — neither candidate is admitted as an FM1 Editor runtime dependency**.

This is a technical and license-boundary review, not legal advice. The existing audited Apache-2.0 MSFA-compatible renderer remains the production implementation. The candidates below may be used as implementation references only where their licenses and provenance permit it.

## Decision summary

| Candidate | Reviewed branch / identity | License finding | Compatibility / fidelity | Maintenance finding | Decision |
| --- | --- | --- | --- | --- | --- |
| `probonopd/Synth_Dexed` | GitHub mirror `sync`; source review on `master`; README mirror commit `17249e56bd2fe1aa82097bd105ee7123c0c57de1`; `library.properties` blob `2352ae8e84653e9bbba78c3a137658784ff846bc`; `src/synth_dexed.cpp` blob `31a3710505bb262f3566ee3da2ed8886395deaa8` | Mixed package metadata (`APACHE2,GPL3`), but the library wrapper source reviewed is GPL-3-or-later | DX7/SysEx-oriented Dexed-derived engine for Teensy/embedded use; native desktop ports are described as WIP/partly untested | GitHub mirror activity reviewed through 2025-05-25; canonical development is mirrored from Codeberg | **Reference only. Do not import the GPL wrapper into the current Apache-only browser synthesis boundary.** |
| `mmontag/dx7-synth-js` | `master@f269f0e02fc67b2f824b01a8416339cd5c4829e0`; README blob `34b94338177f129d94e4a5d27d5a0d0eb7908a73`; package blob `4e811ab1d5de7d9b4a3294e4e717e67a51b5e5c4`; license blob `2b1f69a8f1da441eaa094da1ec0dffaa0fdd8b71` | Root `LICENSE.txt` is MIT; `package.json` says ISC, so metadata is inconsistent and must not be copied blindly | Project explicitly calls itself a high-level DX7 emulation and states it is “not super accurate”; adds non-DX7 operator stereo panning | Recent maintenance exists in May 2025, but runtime stack remains Angular 1.4 / Webpack 4-era and requires legacy OpenSSL build accommodation | **Reference only. Not a fidelity fallback and not a production runtime dependency.** |

## Synth_Dexed review

### Provenance and branch structure

The reviewed GitHub repository is a mirror of `codeberg.org/dcoredump/Synth_Dexed`. Its default `sync` branch contains mirror/orientation material and points readers to `master` and `dev`; the repository also contains original `native` and `minidexed-native` branches.

The README describes Synth_Dexed as a port/extraction of the Dexed sound engine for Teensy 3.5/3.6/4.x. Native Windows/Linux/macOS executables and Python bindings are listed on the repository-specific `native` branch, with several non-Windows targets explicitly marked untested.

### License boundary

`master/library.properties` declares `license=APACHE2,GPL3`, which is consistent with a project containing Apache-derived engine code plus GPL wrapper/application code. The reviewed `master/src/synth_dexed.cpp` file contains an explicit GNU GPL version 3-or-later notice.

Therefore FM1 Editor must not treat the complete Synth_Dexed library as an Apache-2.0 drop-in. Reusing its GPL wrapper would expand the current distribution boundary in a way that is unnecessary because FM1 Editor already has a smaller audited Apache MSFA closure.

### Compatibility value

Useful reference areas:

- embedded/low-latency Dexed integration patterns;
- SysEx-compatible six-operator FM behavior;
- multi-instance use in downstream MiniDexed/MicroDexed projects;
- performance/underrun instrumentation ideas.

Not admitted:

- complete Synth_Dexed wrapper/library source;
- Teensy Audio framework integration;
- native/Python wrapper branches;
- downstream patch/performance assets.

## dx7-synth-js review

### Fidelity and parameter model

The project README explicitly describes the engine as a **high-level emulation** and says it is **not super accurate**, while being good enough for many DX7 presets. It also adds operator stereo panning, which is intentionally outside stock DX7 semantics.

That makes it unsuitable as a reference renderer for FM1 Editor's deterministic audio-matching metrics or as a fallback whose PCM could be compared interchangeably with the accepted MSFA-compatible renderer.

### Browser/runtime architecture

The project is useful historically because it demonstrates a browser-native DX7-style synthesizer using Web Audio and Web MIDI. However its package currently retains an Angular 1.4 / Webpack 4-era application stack and a legacy OpenSSL-provider workaround for newer Node versions. FM1 Editor already has a modern AudioWorklet/WASM architecture and should not inherit this application/runtime stack.

### License metadata inconsistency

The root `LICENSE.txt` grants the project under the MIT License and identifies additional bundled MIT material. `package.json`, however, declares `"license": "ISC"`.

For this audit the root license text is treated as the stronger repository-level evidence, while the package metadata mismatch is recorded as a reason not to automate dependency admission from `package.json` alone. Any future source-level reuse would require checking the exact file and bundled dependency attribution at the pinned revision.

### Maintenance

The reviewed `master` head is `f269f0e02fc67b2f824b01a8416339cd5c4829e0` from 2025-05-18. The same maintenance window includes dependency/build updates and algorithm fixes, so the project is not treated as abandoned. That does not change the fidelity/runtime decision above.

## Production decision

FM1 Editor keeps the current architecture:

```text
Dx7Voice
  -> repository-owned semantic bridge
  -> audited Apache-2.0 MSFA-compatible WASM
  -> deterministic offline renderer / 16-voice AudioWorklet
```

Neither reviewed project is added to `package.json`, `third_party/`, the WASM build, or browser runtime.

Future review rule:

1. reference implementation ideas may be compared against FM1-owned code;
2. no source is copied until its exact file-level license/provenance is recorded;
3. GPL wrapper/application code stays outside the current renderer dependency boundary;
4. alternative PCM is never substituted into reconstruction metrics without its own deterministic/fidelity validation suite.

## Sources reviewed

- `https://github.com/probonopd/Synth_Dexed` (`sync`, plus source files on `master`)
- `https://github.com/mmontag/dx7-synth-js` (`master@f269f0e02fc67b2f824b01a8416339cd5c4829e0`)
- `probonopd/Synth_Dexed:README.md`
- `probonopd/Synth_Dexed:library.properties`
- `probonopd/Synth_Dexed:src/synth_dexed.cpp`
- `mmontag/dx7-synth-js:README.md`
- `mmontag/dx7-synth-js:package.json`
- `mmontag/dx7-synth-js:LICENSE.txt`
