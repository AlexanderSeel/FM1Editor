# Isolated MSFA WebAssembly feasibility execution

Validated FM1 Editor source commit: `e90c1b8827e8de6570e8eff4320e274b4d1f7331`

Pinned MSFA upstream: `asb2m10/dexed@2e182b3db85c09083ab13c8b9b00565ce7d9ff85`
Requested Emscripten SDK image: `emscripten/emsdk:4.0.7`
Resolved Emscripten image digest: `emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`

Overall offline feasibility gate: **FAILED**

| Check | Result |
| --- | --- |
| dependency install | **SUCCESS** |
| source closure/materialization | **SUCCESS** |
| native build | **SUCCESS** |
| native reference render | **SUCCESS** |
| Emscripten image | **SUCCESS** |
| two WASM builds | **SUCCESS** |
| deterministic WASM render | **FAILURE** |
| native/WASM reference comparison | **SKIPPED** |
| five-second performance | **SUCCESS** |
| bundle-size gate | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| full Vitest suite | **SUCCESS** |
| production build | **SUCCESS** |

## Measurements

- WASM build 1 SHA-256: `8af9c642526a5dd9b56a1cedbc95ea44d834983bf32e7ab8e608dfa12407a683`
- WASM build 2 SHA-256: `8af9c642526a5dd9b56a1cedbc95ea44d834983bf32e7ab8e608dfa12407a683`
- Native reference PCM SHA-256: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`
- Five-second WASM render: 8.289 ms first pass, real-time ratio 0.001658, hash `79f58798fcd9b2752e5c653586a1cc18e8d086cf4578857f0ee2a9b00e647d2e`
- WASM bytes: 27549; JS glue bytes: 8783; combined gzip bytes: 20069

The source materialization and all engine binaries existed only under the GitHub Actions runner temporary directory. No MSFA source, native executable, WASM binary or generated glue was committed by this workflow.

This validates only the dry offline DX7-compatible feasibility path. It does not run an AudioWorklet and does not validate a physical Yamaha DX7 or M-VAVE FM-1.

The normal `.github/workflows/ci.yml` remains read-only. This temporary workflow removes itself in the result commit.

## Failure log tails

### `materialize.log`

```text
hint: Using 'master' as the name for the initial branch. This default branch name
hint: will change to "main" in Git 3.0. To configure the initial branch name
hint: to use in all of your new repositories, which will suppress this warning,
hint: call:
hint:
hint: 	git config --global init.defaultBranch <name>
hint:
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint:
hint: 	git branch -m <name>
hint:
hint: Disable this message with "git config set advice.defaultBranchName false"
Initialized empty Git repository in /home/runner/work/_temp/dexed/.git/
From https://github.com/asb2m10/dexed
 * branch            2e182b3db85c09083ab13c8b9b00565ce7d9ff85 -> FETCH_HEAD
HEAD is now at 2e182b3 Change runner version from ubuntu-24.04 to ubuntu-22.04

> fm1-editor@0.1.0 audit:virtual-dx7
> node scripts/verify-msfa-source-audit.mjs --source-root /home/runner/work/_temp/dexed --require-hashes

MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
Materialized 23 audited MSFA candidate files into temporary directory /home/runner/work/_temp/materialized.
Applied only the documented GPL/JUCE/MTS/tuning-boundary removals; no source was written into the FM1 Editor repository.
```

### `native-build.log`

```text
/home/runner/work/_temp/materialized/msfa/dx7note.cc: In member function ‘int32_t Dx7Note::osc_freq(int, int, int, int, int, int)’:
/home/runner/work/_temp/materialized/msfa/dx7note.cc:47:89: warning: unused parameter ‘channel’ [-Wunused-parameter]
   47 | int32_t Dx7Note::osc_freq(int midinote, int mode, int coarse, int fine, int detune, int channel) {
      |                                                                                     ~~~~^~~~~~~
/home/runner/work/_temp/materialized/msfa/dx7note.cc: In member function ‘void Dx7Note::init(const uint8_t*, int, int, int, const Controllers*)’:
/home/runner/work/_temp/materialized/msfa/dx7note.cc:158:106: warning: unused parameter ‘ctrls’ [-Wunused-parameter]
  158 | void Dx7Note::init(const uint8_t patch[156], int midinote, int velocity, int channel, const Controllers *ctrls) {
      |                                                                                       ~~~~~~~~~~~~~~~~~~~^~~~~
```

### `native-render.log`

```text
rendered 72000 dry mono Float32 frames
```

### `emsdk.log`

```text
4.0.7: Pulling from emscripten/emsdk
30a9c22ae099: Pulling fs layer
0d1f76ed51cd: Pulling fs layer
54aa9d04435b: Pulling fs layer
aa83562ad891: Pulling fs layer
86a4a0209194: Pulling fs layer
aa83562ad891: Waiting
86a4a0209194: Waiting
54aa9d04435b: Verifying Checksum
54aa9d04435b: Download complete
30a9c22ae099: Download complete
86a4a0209194: Verifying Checksum
86a4a0209194: Download complete
aa83562ad891: Verifying Checksum
aa83562ad891: Download complete
30a9c22ae099: Pull complete
0d1f76ed51cd: Verifying Checksum
0d1f76ed51cd: Download complete
0d1f76ed51cd: Pull complete
54aa9d04435b: Pull complete
aa83562ad891: Pull complete
86a4a0209194: Pull complete
Digest: sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7
Status: Downloaded newer image for emscripten/emsdk:4.0.7
docker.io/emscripten/emsdk:4.0.7
```

### `wasm-build.log`

```text
/home/runner/work/_temp/materialized/msfa/dx7note.cc:47:89: warning: unused parameter 'channel' [-Wunused-parameter]
   47 | int32_t Dx7Note::osc_freq(int midinote, int mode, int coarse, int fine, int detune, int channel) {
      |                                                                                         ^
/home/runner/work/_temp/materialized/msfa/dx7note.cc:158:106: warning: unused parameter 'ctrls' [-Wunused-parameter]
  158 | void Dx7Note::init(const uint8_t patch[156], int midinote, int velocity, int channel, const Controllers *ctrls) {
      |                                                                                                          ^
2 warnings generated.
/home/runner/work/_temp/materialized/msfa/dx7note.cc:47:89: warning: unused parameter 'channel' [-Wunused-parameter]
   47 | int32_t Dx7Note::osc_freq(int midinote, int mode, int coarse, int fine, int detune, int channel) {
      |                                                                                         ^
/home/runner/work/_temp/materialized/msfa/dx7note.cc:158:106: warning: unused parameter 'ctrls' [-Wunused-parameter]
  158 | void Dx7Note::init(const uint8_t patch[156], int midinote, int velocity, int channel, const Controllers *ctrls) {
      |                                                                                                          ^
2 warnings generated.
```

### `wasm-reference.json`

```text
file:///home/runner/work/FM1Editor/FM1Editor/scripts/run-msfa-wasm-spike.mjs:97
    throw new Error(`Repeated WASM renders are not byte-identical: ${first.sha256} != ${second.sha256}`)
          ^

Error: Repeated WASM renders are not byte-identical: 313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2 != 7b165a48fc5d96262b9a94c86b55faf053ae9b2a2f638a8facbba5a2c1cac9eb
    at file:///home/runner/work/FM1Editor/FM1Editor/scripts/run-msfa-wasm-spike.mjs:97:11

Node.js v22.23.1
```

### `wasm-performance.json`

```text
{"frames":240000,"sampleRate":48000,"noteOnFrames":192000,"releaseFrames":48000,"sha256":"79f58798fcd9b2752e5c653586a1cc18e8d086cf4578857f0ee2a9b00e647d2e","peak":0.125518799,"rms":0.00892095,"firstRenderMs":8.289,"secondRenderMs":4.157,"realtimeRatio":0.001658}
```

