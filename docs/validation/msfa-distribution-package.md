# MSFA browser distribution package

Packaging source commit: `69307b87062985abfadadd39e96fb065cdc5f68f`

Overall package gate: **SUCCESS**

| Check | Result |
| --- | --- |
| source | **SUCCESS** |
| wasm | **SUCCESS** |
| assemble | **SUCCESS** |
| manifest | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| tests | **SUCCESS** |
| build | **SUCCESS** |

## Published identity

- Engine: `fm1-editor-msfa-compatible` / `msfa-2e182b3-fm1-v1`
- WASM SHA-256: `2f39f43d45fc4be075e0bc7ca4be76fb662372da1690c5db067cb565bb65b331`
- Glue SHA-256: `1133b1edd73d5af0655e9520239221f32c0499c93b70fb5a7faa037900927497`
- Source manifest SHA-256: `f130a6e781330a07a14940deb895e5a0427e46f5e324b1de84079baa106c0828`
- Apache license SHA-256: `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`
- Emscripten image: `emscripten/emsdk@sha256:8acec700a48dbff5250afc1e3ee545b7c002b689043ee82c277de6481a237fd7`

The package contains only the audited Apache-2.0 MSFA-compatible source closure plus FM1 Editor-owned bridge/build files. Modified source files are marked, the complete source/provenance manifest is retained, and the hosted browser artifact carries MSFA and toolchain license material.

No AudioWorklet or physical-device validation is claimed. The normal CI workflow remains read-only; this temporary packaging workflow removes itself in the result commit.
