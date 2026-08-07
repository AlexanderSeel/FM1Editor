# Stateful MSFA session validation

Validated source commit: `84840fcc2e06fe6f184cfaabf3517318468ee634`

Overall gate: **FAILED**

| Check | Result |
| --- | --- |
| source | **SUCCESS** |
| wasm | **SUCCESS** |
| offline | **SUCCESS** |
| stateful | **SUCCESS** |
| package | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| tests | **FAILURE** |
| build | **SUCCESS** |

## Evidence

- WASM build A: `623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a`
- WASM build B: `623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a`
- Emscripten: `emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`
- Offline fixed render remained `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2` (72000 frames).
- Stateful block reconstruction: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2` across 72000 frames.
- Engine block: 64 frames; target worklet callback: 128 frames.
- Note-off release matches offline reference: True.
- All-notes-off immediate silence: True.
- Artifact: 29893 WASM bytes + 9473 glue bytes; gzip combined 21112 bytes.
- Published engine: `msfa-2e182b3-fm1-v3-stateful`
- Published WASM: `623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a`

The stateful API owns one persistent patch/controller/LFO/note session. `noteOff` enters normal envelope release; `allNotesOff` immediately silences and reconstructs note state. LFO state advances on silent render blocks so key-sync-off remains free-running.

No AudioWorklet/browser or physical-device validation is claimed. The temporary workflow removes itself; normal CI remains read-only.

## Failure logs

### `source.log`
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
Applied only the documented GPL/JUCE/MTS/tuning-boundary removals and deterministic feedback reset; no source was written into the FM1 Editor repository.
Applied deterministic LFO phase/sample-and-hold seed lifecycle to the temporary MSFA source set.
Prepared 23 distributed MSFA files; 7 carry explicit FM1 Editor modification notices.
```

### `wasm-build.log`
```text
/home/runner/work/_temp/materialized/msfa/dx7note.cc:51:89: warning: unused parameter 'channel' [-Wunused-parameter]
   51 | int32_t Dx7Note::osc_freq(int midinote, int mode, int coarse, int fine, int detune, int channel) {
      |                                                                                         ^
/home/runner/work/_temp/materialized/msfa/dx7note.cc:166:106: warning: unused parameter 'ctrls' [-Wunused-parameter]
  166 | void Dx7Note::init(const uint8_t patch[156], int midinote, int velocity, int channel, const Controllers *ctrls) {
      |                                                                                                          ^
2 warnings generated.
/home/runner/work/_temp/materialized/msfa/dx7note.cc:51:89: warning: unused parameter 'channel' [-Wunused-parameter]
   51 | int32_t Dx7Note::osc_freq(int midinote, int mode, int coarse, int fine, int detune, int channel) {
      |                                                                                         ^
/home/runner/work/_temp/materialized/msfa/dx7note.cc:166:106: warning: unused parameter 'ctrls' [-Wunused-parameter]
  166 | void Dx7Note::init(const uint8_t patch[156], int midinote, int velocity, int channel, const Controllers *ctrls) {
      |                                                                                                          ^
2 warnings generated.
```

### `offline.json`
```text
{"frames":72000,"sampleRate":48000,"noteOnFrames":48000,"releaseFrames":24000,"randomSeed":42,"sha256":"313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2","peak":0.125518799,"rms":0.00961926,"firstRenderMs":3.853,"secondRenderMs":1.846,"realtimeRatio":0.002569}
```

### `stateful.json`
```text
{"blockFrames":64,"callbackFrames":128,"fixedFrames":72000,"fixedSha256":"313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2","allNotesOffImmediateSilence":true,"noteOffReleaseMatchesOfflineReference":true}
```
