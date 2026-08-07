# MSFA performance rebuild diagnostic v2

Diagnostic source commit: `be58f7ee663ec56e79d04ad2e4841724684260b1`

```text

## BUILD_A
Unable to find image 'emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7' locally
docker.io/emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7: Pulling from emscripten/emsdk
30a9c22ae099: Pulling fs layer
0d1f76ed51cd: Pulling fs layer
54aa9d04435b: Pulling fs layer
aa83562ad891: Pulling fs layer
86a4a0209194: Pulling fs layer
aa83562ad891: Waiting
86a4a0209194: Waiting
54aa9d04435b: Verifying Checksum
54aa9d04435b: Download complete
30a9c22ae099: Verifying Checksum
30a9c22ae099: Download complete
86a4a0209194: Verifying Checksum
86a4a0209194: Download complete
aa83562ad891: Download complete
0d1f76ed51cd: Verifying Checksum
0d1f76ed51cd: Download complete
30a9c22ae099: Pull complete
0d1f76ed51cd: Pull complete
54aa9d04435b: Pull complete
aa83562ad891: Pull complete
86a4a0209194: Pull complete
Digest: sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7
Status: Downloaded newer image for emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7
/repo/.tmp/source/msfa/dx7note.cc:51:89: warning: unused parameter 'channel' [-Wunused-parameter]
   51 | int32_t Dx7Note::osc_freq(int midinote, int mode, int coarse, int fine, int detune, int channel) {
      |                                                                                         ^
/repo/.tmp/source/msfa/dx7note.cc:166:106: warning: unused parameter 'ctrls' [-Wunused-parameter]
  166 | void Dx7Note::init(const uint8_t patch[156], int midinote, int velocity, int channel, const Controllers *ctrls) {
      |                                                                                                          ^
2 warnings generated.
RC=0

## BUILD_B
/repo/.tmp/source/msfa/dx7note.cc:51:89: warning: unused parameter 'channel' [-Wunused-parameter]
   51 | int32_t Dx7Note::osc_freq(int midinote, int mode, int coarse, int fine, int detune, int channel) {
      |                                                                                         ^
/repo/.tmp/source/msfa/dx7note.cc:166:106: warning: unused parameter 'ctrls' [-Wunused-parameter]
  166 | void Dx7Note::init(const uint8_t patch[156], int midinote, int velocity, int channel, const Controllers *ctrls) {
      |                                                                                                          ^
2 warnings generated.
RC=0

## HASHES
5aa3d9ee7aae93ae6b8f95accd95c72339aa8c495147161659c5fa98a4b8b624  .tmp/out-a/fm1-msfa.wasm
5aa3d9ee7aae93ae6b8f95accd95c72339aa8c495147161659c5fa98a4b8b624  .tmp/out-b/fm1-msfa.wasm
e695050a852735923a2387e0cb37f270795f8b3baf448602dc11d4d0751d14ef  .tmp/out-a/fm1-msfa.mjs
e695050a852735923a2387e0cb37f270795f8b3baf448602dc11d4d0751d14ef  .tmp/out-b/fm1-msfa.mjs
RC=0

## PROBE
exports {
  _fm1_msfa_session_configure_performance: 'function',
  _fm1_msfa_session_set_pitch_bend: 'function',
  _fm1_msfa_session_set_modulation: 'function',
  _fm1_msfa_session_set_aftertouch: 'function'
}
renderStatus 0
pcmHash 313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2
session 386064
load 0
configure 0
bend 0
mod 0
aftertouch 0
invalid 9
RC=0

## NODE_CHECK
RC=0

## INSTALL

added 321 packages in 6s
RC=0

## SOURCE_AUDIT

> fm1-editor@0.1.0 audit:virtual-dx7
> node scripts/verify-msfa-source-audit.mjs

MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
RC=0

```

This diagnostic does not publish generated artifacts or establish browser/runtime acceptance.
