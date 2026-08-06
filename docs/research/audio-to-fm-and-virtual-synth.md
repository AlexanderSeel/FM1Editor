# Audio-to-FM reconstruction and virtual FM-1 research

Last reviewed: 2026-08-06

## Goals

This research covers two proposed FM1 Editor capabilities:

1. upload a WAV or MP3 reference and estimate a Yamaha DX7-compatible/FM-1-usable voice that approximates the sound;
2. provide an in-browser virtual instrument that can audition the current voice without physical hardware and can approximate the documented FM-1 effects chain.

These goals are related: reliable audio-to-patch matching needs a deterministic renderer that can generate candidate audio from semantic voice parameters. The renderer must remain separate from physical-device claims. A virtual DX7-compatible result is not proof that the FM-1 hardware will sound identical.

## Executive decision

Use a staged implementation:

1. **Virtual DX7 renderer first.** Build a local renderer with an offline-render API and real-time AudioWorklet output.
2. **Nearest-preset matching second.** Compare the uploaded reference against rendered voices from the existing catalog and return ranked, immediately usable `.syx` candidates.
3. **Parameter optimization third.** Starting from the best catalog candidates, optimize semantic DX7 parameters with evolutionary search and optional learned initialization.
4. **FM-1 effect matching last.** Optimize the documented CC `0–23` virtual effect chain separately from the dry DX7 voice. Until recordings prove equivalence, call this an **FM-1-inspired virtual effect model**, not an FM-1 emulator.

Do not promise exact reconstruction. Six-operator sine-wave FM plus the documented effect chain cannot reproduce every sampled, acoustic, granular, wavetable, distorted, layered or time-varying source.

---

## 1. Uploaded-audio ingestion

### Supported input

Initial scope should accept:

- WAV and MP3 through browser `decodeAudioData`;
- one short, mostly isolated sound or note;
- a user-selected analysis region;
- optional known MIDI note and velocity;
- mono conversion for analysis while retaining the original upload for A/B playback.

The app should reject or warn about:

- full songs and polyphonic mixtures;
- heavy ambience or mastering effects;
- clipped audio;
- unstable pitch when the selected matching mode assumes one note;
- files above configured duration and size limits.

Processing should remain local by default. A later optional server worker may be offered for heavier Python/ML optimization, but uploading audio to a server must require explicit consent and a documented retention policy.

### Pre-analysis

Create a reproducible analysis record containing:

- decoded sample rate and channel count;
- selected start/end time;
- silence trimming and peak/RMS normalization choices;
- estimated onset, fundamental frequency and MIDI note;
- amplitude envelope;
- multi-resolution STFT and mel spectrum;
- MFCCs;
- spectral centroid, rolloff, flatness and temporal change;
- a content hash of the selected audio region and analysis settings.

Allow the user to override pitch detection. A wrong reference note makes FM frequency-ratio estimation and preset comparison unreliable.

---

## 2. Phase A — nearest-preset retrieval

This is the lowest-risk and most useful first version.

### Method

1. Render every eligible catalog voice at one or more standardized notes, velocities and durations.
2. Cache compact audio descriptors, not necessarily full audio files.
3. Analyze the uploaded reference with the same descriptor pipeline.
4. Rank catalog voices using a weighted distance over:
   - mel/STFT magnitude;
   - MFCCs;
   - spectral centroid/rolloff/flatness;
   - attack and decay envelope;
   - optional learned audio embeddings after model/license review.
5. Re-render the best candidates at the detected or user-selected note.
6. Present A/B playback, scores and the exact source voice.

### Benefits

- produces valid existing DX7 voices immediately;
- avoids searching all 155 parameters from random state;
- works without a trained AI model;
- provides strong initialization for later optimization;
- preserves provenance because results point to existing catalog entries.

### Required safeguards

- Scores are similarity estimates, not proof of identity.
- Do not overwrite the current voice automatically.
- Loading a candidate into the editor must be explicit.
- Hardware send remains behind the existing target-specific safety gates.

---

## 3. Phase B — semantic DX7 parameter optimization

### Search space

Do not optimize raw bytes without semantics. Search the existing `Dx7Voice` model with legal ranges and explicit parameter groups:

- algorithm and feedback;
- operator enable mask;
- operator frequency mode, coarse, fine and detune;
- output levels;
- operator envelopes;
- pitch envelope;
- keyboard scaling and velocity sensitivity;
- LFO parameters;
- transpose and other relevant common voice fields.

Voice name should be excluded from the audio objective.

Start with coarse subsets before attempting the complete space. Searching all parameters simultaneously is highly non-convex and contains many perceptually equivalent or near-equivalent solutions.

### Recommended optimizer

Use a hybrid pipeline:

1. nearest-preset candidates as initial populations;
2. structured mutations grouped by algorithm, ratios, levels and envelopes;
3. CMA-ES or another evolutionary/derivative-free optimizer for continuous/discrete mixed parameters;
4. optional local hill-climbing around the best candidates;
5. perceptual loss combining multi-resolution STFT/mel distance, MFCC distance, envelope error and spectral descriptors;
6. diversity preservation so the UI can return several perceptually different candidates rather than one opaque result.

The 2026 **INSTRUMENTAL** work supports the use of CMA-ES and perceptual losses for automatic synthesizer parameter recovery, although its reported synthesizer is a smaller subtractive model rather than a DX7. It is an optimization reference, not directly reusable DX7 code:

- https://arxiv.org/abs/2603.15905

### AI/research references

#### Sound2Synth

Sound2Synth specifically targets FM synthesizer parameter estimation and reports real-world results with Dexed:

- https://www.ijcai.org/proceedings/2022/682
- https://arxiv.org/abs/2205.03043

Use it as evidence that learned Dexed parameter inference is feasible. Do not make it a production dependency until public code, trained weights, parameter coverage, license, preprocessing and reproducibility are independently verified.

#### SpiegeLib and Dexed sound matching

The MIT-licensed SpiegeLib experiment includes Dexed-oriented notebooks, pre-trained experiment models, deep-learning estimators and genetic algorithms:

- https://github.com/spiegelib/vst-fm-sound-match
- https://spiegelib.github.io/spiegelib/examples/fm_sound_match.html

It is useful for a desktop/server research prototype. Its documented workflow controls a VST through Python and RenderMan, so it is not a drop-in browser implementation. It can inform dataset generation, parameter freezing, MFCC comparison and search experiments.

#### DDX7

DDX7 is an Apache-2.0 differentiable FM resynthesis project:

- https://github.com/fcaspe/ddx7
- https://arxiv.org/abs/2208.06169
- https://fcaspe.github.io/ddx7/

DDX7 estimates continuous controls for a constrained differentiable FM architecture. It is valuable for pitch/loudness conditioning, differentiable loss design and learned initialization, but it does not directly emit a complete standard Yamaha 155-byte voice with all 32 algorithms and hardware semantics.

#### Magenta DDSP

Magenta DDSP provides differentiable synthesizers, filters and waveshapers:

- https://github.com/magenta/ddsp

It is useful for experimentation and feature extraction, but a generic DDSP resynthesis result is not automatically a DX7/FM-1 patch.

### Execution architecture

Two implementation modes are reasonable:

#### Browser-local mode

- Web Worker coordinates search.
- WebAssembly renderer produces deterministic offline audio.
- `OfflineAudioContext` or a direct PCM render API evaluates candidates.
- Cached descriptors reduce repeated rendering.
- Search supports pause, resume and cancellation.
- No uploaded audio leaves the browser.

This is preferred for privacy, but large searches may be slow on mobile devices.

#### Optional compute-worker mode

- Python service hosts experimental models and optimizers.
- Uploaded analysis region is sent only after explicit consent.
- Job returns semantic parameter candidates and metrics, not an opaque audio file only.
- The server documents model versions, licenses, retention and deletion.

Do not make server processing mandatory for normal file editing or virtual audition.

### Result UX

Return multiple candidates with:

- similarity score and metric breakdown;
- dry virtual render;
- render with the estimated FM-1-inspired effects;
- difference/overlay visualization;
- source initialization voice when one was used;
- complete semantic parameter diff;
- load into editor, save to library and export `.syx` actions;
- explicit hardware-send controls using the existing safety boundaries.

---

## 4. Virtual DX7/FM-1 architecture

### Primary engine candidate — MSFA core from Dexed

Dexed is closely modeled on the Yamaha DX7 and uses the `music-synthesizer-for-android` (MSFA) sound engine:

- https://github.com/asb2m10/dexed

The complete Dexed application/plugin is GPL-3.0, while its `msfa` engine remains Apache-2.0 according to the project documentation. FM1 Editor is MIT licensed, so the recommended route is to isolate and audit only the Apache-2.0 MSFA portion, retain notices, and compile that core to WebAssembly. Do not copy the complete GPL Dexed wrapper into the MIT application without an explicit licensing decision.

Recommended browser integration:

- C/C++ MSFA core compiled with Emscripten;
- AudioWorklet processor for real-time polyphonic output;
- SharedArrayBuffer only when deployment headers permit it, with a non-shared fallback;
- separate offline PCM-render API for search and tests;
- direct loading from the existing semantic voice or encoded 155-byte data;
- note on/off, velocity, pitch bend, modulation, sustain and aftertouch;
- deterministic sample-rate and engine-mode settings;
- all-notes-off and lifecycle cleanup.

### Alternative/reference engines

#### Synth_Dexed

Synth_Dexed packages the Dexed/MSFA engine as a library and is used by MicroDexed and MiniDexed:

- https://github.com/probonopd/Synth_Dexed
- https://github.com/probonopd/MiniDexed

It is a useful native-library and embedded-architecture reference. The reviewed mirror focuses on Teensy/native targets rather than a browser build, so branch-level license and dependency auditing is required before reuse.

MiniDexed demonstrates multi-instance mixing plus reverb/compressor concepts, but it is a bare-metal Raspberry Pi application, not a browser library.

#### `dx7-synth-js`

Matt Montag's Web Audio DX7 experiment proves that a six-operator DX-style synthesizer can run directly in a browser:

- https://github.com/mmontag/dx7-synth-js
- https://mmontag.github.io/dx7-synth-js/

The public demo exposes MIDI, pitch bend, modulation, aftertouch, operator panning and reverb. It also labels keyboard scaling as not implemented. Treat it as a prototype/reference only until its license, numerical compatibility, missing parameter behavior, performance and maintenance status are audited.

### Effects layer

The FM-1 document exposes filter, reverb, delay, distortion, chorus and phaser through CC `0–23`. Implement these as a separate effect graph after the DX7-compatible dry engine.

Good browser building blocks are:

- native Web Audio `BiquadFilterNode`, `DelayNode`, `WaveShaperNode`, `ConvolverNode`, `DynamicsCompressorNode`, gain and modulation nodes;
- Tone.js, an MIT-licensed Web Audio framework with synthesis, scheduling and effect components: https://github.com/Tonejs/Tone.js

Recommended effect modules:

- filter: bypass, LPF/BPF/HPF, cutoff and Q;
- reverb: room/hall/plate approximations with decay and wet mix;
- delay: feedback/decay, time/rate and wet mix;
- distortion: gain/drive, tone filtering and output level;
- chorus: modulated delay with frequency, depth and wet mix;
- phaser: cascaded all-pass filters with frequency, depth and wet mix.

The virtual values should use the documented FM-1 ranges and the same `Fm1FxState` model. Exact transfer functions, internal scaling, effect algorithms, routing order, stereo behavior and headroom are not published. Until measured against physical hardware, label the result **FM-1-inspired** and expose an effect bypass for dry DX7 comparison.

### Virtual-instrument UX

Add a **Virtual FM-1** output target or preview mode with:

- local audio enable/resume control required by browser autoplay policy;
- dry/FX toggle;
- master gain and limiter;
- polyphony and CPU meter;
- current voice and effects state synchronization;
- virtual piano and sequencer routing without Web MIDI hardware;
- render current note/chord to WAV;
- A/B comparison between virtual output, uploaded reference and physical recording;
- explicit label that virtual output is not a physical FM-1 validation result.

### Validation requirements

- deterministic render snapshots/hashes or tolerant spectral tests for known patches;
- comparison against trusted MSFA/Dexed renders at fixed sample rates;
- envelope, algorithm, velocity and controller regression tests;
- effect bypass equivalence and independent effect parameter tests;
- AudioWorklet underrun and polyphony tests on Chrome and Edge;
- mobile performance limits;
- license/NOTICE inventory for all native, WASM, model and effect dependencies;
- physical FM-1 recordings later used only to characterize differences, never to silently redefine Yamaha-compatible voice semantics.

---

## 5. Proposed milestones

### Milestone 1 — renderer feasibility spike

- audit MSFA source boundaries and licenses;
- compile a minimal one-voice renderer to WASM;
- render a known `.syx` voice offline and in an AudioWorklet;
- compare output against Dexed/MSFA reference audio;
- document CPU, latency, sample-rate and bundle-size results.

### Milestone 2 — virtual instrument

- integrate semantic voice updates;
- add polyphonic MIDI/controller support;
- route virtual piano and sequencer to local audio;
- add documented FM-1-inspired effect graph;
- add WAV rendering and A/B playback.

### Milestone 3 — nearest-preset match

- implement WAV/MP3 upload and region selection;
- build descriptor extraction and render cache;
- rank existing catalog voices;
- show top candidates with A/B playback and explicit load action.

### Milestone 4 — optimization prototype

- select a constrained parameter subset;
- implement evolutionary search from top catalog candidates;
- add cancellation, progress, repeatable seeds and metric reporting;
- benchmark browser-local versus optional Python worker.

### Milestone 5 — learned initialization

- reproduce and license-audit Sound2Synth/SpiegeLib/DDX7-inspired experiments;
- train only on legally usable synthetic renders generated from repository-defined semantic patches;
- version model, dataset generator and preprocessing;
- compare learned initialization against retrieval-only and random/evolutionary baselines.

### Milestone 6 — physical comparison

- record dry and effected FM-1 output for controlled voices after USB/audio behavior is verified;
- compare virtual and physical spectra, envelopes, levels and stereo behavior;
- document firmware-specific differences;
- never call the virtual engine an exact FM-1 emulator unless repeatable evidence supports that claim.

## Final recommendation

Proceed with the virtual renderer before AI inference. A deterministic local forward model unlocks virtual audition, offline render tests, nearest-preset search and parameter optimization. The most credible technical base is an audited Apache-2.0 MSFA core compiled to WebAssembly, with a separate Web Audio/Tone.js effect graph. For audio-to-patch reconstruction, begin with catalog retrieval and evolutionary refinement; treat Sound2Synth, SpiegeLib, DDX7 and newer CMA-ES research as design references or optional initialization layers rather than assuming a ready-made production API exists.
