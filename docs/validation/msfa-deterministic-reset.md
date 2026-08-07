# Deterministic MSFA reset validation

Validated source commit: `b32f8363bcac03a87ee483c0e880a0e28900a1e8`

Overall gate: **SUCCESS**

| Check | Result |
| --- | --- |
| prepare | **SUCCESS** |
| native | **SUCCESS** |
| wasm | **SUCCESS** |
| render | **SUCCESS** |
| perf | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| tests | **SUCCESS** |
| build | **SUCCESS** |

## Evidence

- Emscripten image: `emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`
- Native PCM SHA-256: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`
- WASM build A SHA-256: `2f39f43d45fc4be075e0bc7ca4be76fb662372da1690c5db067cb565bb65b331`
- WASM build B SHA-256: `2f39f43d45fc4be075e0bc7ca4be76fb662372da1690c5db067cb565bb65b331`
- WASM PCM SHA-256: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`
- Fixed render: 72000 frames, peak 0.125518799, RMS 0.00961926, 4.187 ms; repeated render was byte-identical.
- Five-second render: 8.111 ms, real-time ratio 0.001622.
- Bundle: 27557 WASM bytes + 8783 glue bytes; combined gzip 20032 bytes.
- Native and WASM fixed PCM are byte-identical: waveform correlation 1.0, zero-frame alignment, log-magnitude error 0 dB.

The feedback-history reset is an FM1 Editor derived-source lifecycle patch because the pinned `Dx7Note` constructor leaves `fb_buf_` uninitialized. All audited MSFA source and generated binaries remained runner-temporary and were not committed.

No AudioWorklet or physical-device validation is claimed. The normal CI workflow remains read-only.
