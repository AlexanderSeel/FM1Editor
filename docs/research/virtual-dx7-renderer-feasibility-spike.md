# Virtual DX7 renderer feasibility and implementation record

Last reviewed: 2026-08-07

Status: **audited deterministic dry engine packaged and integrated; explicit 16-voice local AudioWorklet preview with DX7-style performance controls accepted in branded Chrome and Edge**.

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
     -> stateful session ABI             persistent note/LFO/envelope lifecycle
        -> fm1-msfa-worklet.js
           - 16 independent stateful sessions
           - deterministic allocation/stealing
           - 2 x 64-frame blocks per 128-frame callback
           - local pitch/mod/aftertouch performance state
           - worklet-owned sustain lifecycle
        -> createMsfaAudioWorkletController()
           - explicit browser-audio enable
           - verified package/ready contract
           - semantic voice load only
           - local performance API
        -> VirtualDx7PreviewPanel
           - browser-local piano and performance controls
           - no MIDI hardware required
```

Display names and imported raw source bytes are excluded from audio identity. The private 156-byte buffer is not a public raw-byte API, is never exposed as SysEx, and has no hardware-send path. Local performance state is intentionally separate from `Dx7Voice` and from hardware DX7/FM-1 function writes.

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

The later performance-control work did **not** modify the admitted MSFA source package. It changed only the repository-owned C++ bridge/export ABI, generated Emscripten package, worklet orchestration and application code.

## Current packaged engine

`public/virtual-dx7/manifest.json` identifies:

- engine id: `fm1-editor-msfa-compatible`
- engine version: `msfa-2e182b3-fm1-v3-stateful`
- WASM SHA-256: `5aa3d9ee7aae93ae6b8f95accd95c72339aa8c495147161659c5fa98a4b8b624`
- Emscripten glue SHA-256: `e695050a852735923a2387e0cb37f270795f8b3baf448602dc11d4d0751d14ef`
- stateful session ABI: `1`
- performance-control ABI: `1`
- engine render quantum: `64` frames
- worklet polyphony: `16`
- Emscripten image digest: `emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`

The FM1-owned stateful bridge exposes session create/destroy, semantic patch load, note on/off, all-notes-off, 64-frame rendering, documented-range performance configuration, 14-bit pitch bend and 7-bit modulation/aftertouch setters. Sustain is implemented in the worklet note lifecycle rather than added to Yamaha-compatible voice semantics.

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

The performance-ABI rebuild preserved this hash exactly. Native and WASM output for the fixture remain byte-identical, repeated WASM renders remain byte-identical, and the recorded native/WASM comparison therefore retains waveform correlation `1.0`, zero-frame alignment and `0 dB` log-magnitude difference for the fixture.

Sample-and-hold regression remains deterministic per seed and differs across seeds. These facts establish deterministic virtual behavior only, not physical-device equivalence.

## Accepted real-time browser boundary

### Minimum one-voice gate

Permanent acceptance evidence is in `docs/validation/msfa-audioworklet-ten-minute-soak.md`:

- same-source software suite: success;
- Chrome `150.0.7871.187`: 600,612 ms, 798 note/release cycles, 48 kHz, zero processor errors/suspensions/window errors/unhandled rejections;
- Edge `150.0.4078.99`: 600,630 ms, 798 cycles with the same error/suspension result;
- finite non-silent PCM while active and exact analyser silence after all-notes-off.

This remains the long-duration baseline for the stateful core.

### Polyphony

Permanent evidence: `docs/validation/msfa-audioworklet-polyphony.md`.

Accepted behavior:

- 16 sessions allocated deterministically as voice indices `0` through `15` when all are initially idle;
- a 17th simultaneously held note deterministically steals the oldest held voice, index `0`, in the recorded fixture;
- repeated triads receive distinct voices;
- per-note release leaves the remaining chord active;
- all-notes-off returns the graph to silence;
- zero processor errors and unresolved AudioContext suspensions in both branded browser runs.

Voice-stealing order is an FM1 Editor software policy. It is not claimed to match a physical Yamaha DX7 or M-VAVE FM-1.

### Performance controls

Permanent package/rebuild evidence: `docs/validation/msfa-performance-package.md`.

The rebuild was performed twice with the pinned Emscripten image and produced byte-identical artifacts. The fixed offline PCM hash did not change. Chrome and Edge accepted:

- pitch-bend range/step configuration;
- live 14-bit pitch bend;
- modulation range/assignment and live 7-bit value;
- aftertouch range/assignment and live 7-bit value;
- sustain retaining a released note until pedal release;
- the existing 16-voice allocation/stealing behavior after performance commands.

The range/assignment model reuses the existing documented DX7 function-state domain. It is not stored in the 155-byte voice and is not automatically sent to hardware.

### Application preview

Permanent combined evidence: `docs/validation/local-virtual-preview-combined-acceptance.md`.

Accepted application behavior:

- no `AudioContext` is created during initial render;
- the user explicitly enables local audio;
- only the current semantic voice is synchronized into the local engine;
- local piano playback works without a MIDI output;
- voice changes perform local all-notes-off before semantic reload;
- blur/visibility/unmount safety still releases notes/tears down local audio;
- local pitch bend, modulation, sustain and aftertouch are visible but remain browser-local;
- same-commit source audit, typecheck, lint, full tests and production build pass;
- the same commit passes branded Chrome and Edge runtime checks with zero processor errors/suspensions.

A later accessibility-only correction flattened the pitch-bend range/step label text so the recommended `jsx-a11y` rules recognize it. `docs/validation/local-performance-label-fix.md` records the green software gate after that markup-only change.

## Browser limitations and claim boundary

The CI browser graph is headless/muted. Browser APIs used here expose no hardware underrun counter, so the browser receipts validate processor/graph continuity, error/suspension observations and analyser PCM behavior—not audible physical sound-device dropout quality, DAC/headphone output, FM-1 headroom or hardware voice stealing.

The product continues to call the renderer **DX7-compatible / FM-1-inspired** until controlled physical comparison exists.

## Remaining scope

The dry real-time preview, polyphony and core performance-control work are closed. Remaining product work is:

1. route preset audition and browser sequencer playback to the local engine as explicit alternatives to hardware MIDI;
2. keep local and hardware playback as separate user actions and avoid presenting local audio as a `MidiOutputTarget`;
3. implement the FM-1-inspired effect graph separately from the dry synthesis engine;
4. add master gain/limiter and useful polyphony/CPU diagnostics at the Virtual FM-1 product layer;
5. add note/chord WAV rendering and uploaded-reference A/B comparison;
6. expand integrated performance/underrun/error regression gates as effects and additional routing are added;
7. perform controlled Yamaha DX7 / M-VAVE FM-1 comparisons only after physical capture evidence exists.

## Permanent evidence index

- `docs/validation/msfa-source-hash-execution.md`
- `docs/validation/msfa-deterministic-reset.md`
- `docs/validation/msfa-distribution-package.md`
- `docs/validation/msfa-seeded-lfo.md`
- `docs/validation/msfa-offline-engine-integration.md`
- `docs/validation/msfa-audioworklet-software.md`
- `docs/validation/msfa-audioworklet-browser-smoke.md`
- `docs/validation/msfa-audioworklet-ten-minute-soak.md`
- `docs/validation/msfa-audioworklet-polyphony.md`
- `docs/validation/msfa-performance-package.md`
- `docs/validation/local-virtual-preview-combined-acceptance.md`
- `docs/validation/local-performance-label-fix.md`
