# Seeded MSFA lifecycle validation

Validated source commit: `9ac678c6daf3c61ec74b022fcc50176acfffb148`

Overall gate: **SUCCESS**

| Check | Result |
| --- | --- |
| source | **SUCCESS** |
| native | **SUCCESS** |
| wasm | **SUCCESS** |
| fixed | **SUCCESS** |
| seed | **SUCCESS** |
| package | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| tests | **SUCCESS** |
| build | **SUCCESS** |

## Evidence

- WASM build SHA-256: `d45658932e6cf8c9c1f670e152ee476f90c4d5e8a63ac08ee0f20acf53f0d442`
- Native/fixed PCM SHA-256: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`
- Emscripten: `emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`
- Fixed seed 42: 72000 frames; repeated render byte-identical; peak 0.125518799; RMS 0.00961926.
- Sample-and-hold seed 42 PCM: `f10de7a842efd41e11833b268cabf090a011cf23c56d5b2ab6a42c181a387124`
- Sample-and-hold seed 43 PCM: `ffe5dd6824407e0072128691dcf20bafa162c8266cff25910a66471ba6b5a573`
- Each seed was byte-identical on its internal repeat, while different seeds produced different PCM.
- Five-second render: 11.016 ms; real-time ratio 0.002203.
- Published engine version: `msfa-2e182b3-fm1-v2-seeded`
- Published WASM: `d45658932e6cf8c9c1f670e152ee476f90c4d5e8a63ac08ee0f20acf53f0d442`
- Published source manifest: `e1ee6348bfadd41de6415a9fde80598deb978179055b75bf782d70d55473033c`

This closes the offline random-state lifecycle gap: free-running LFO phase begins from a documented zero phase and sample-and-hold state is derived from the semantic render-plan seed. No AudioWorklet or physical-device validation is claimed.

All distributed third-party files remain under the audited Apache-2.0 boundary with prominent notices on modified files. The temporary workflow removes itself; normal CI remains read-only.
