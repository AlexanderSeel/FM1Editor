# One-voice AudioWorklet software-boundary validation

Validated source commit: `1938e2fb17c5b1b9a93b8265b16109bf9960c6ba`

Overall software gate: **SUCCESS**

| Check | Result |
| --- | --- |
| install | **SUCCESS** |
| artifact | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| tests | **SUCCESS** |
| build | **SUCCESS** |

## Scope

- Validates the TypeScript AudioWorklet controller, mocked browser lifecycle, local package verification, semantic voice routing and actual packaged stateful WASM ABI.
- Worklet remains dry and one-voice only with two 64-frame engine blocks per standard 128-frame callback.
- Package identity is `msfa-2e182b3-fm1-v3-stateful`; activation has a bounded ready timeout and Promise-consistent parameter validation.

Chrome/Edge AudioWorklet execution and soak remain separate gates.

The temporary workflow removes itself; normal CI remains read-only.

## Artifact regression
```text
{"blockFrames":64,"callbackFrames":128,"fixedFrames":72000,"fixedSha256":"313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2","allNotesOffImmediateSilence":true,"noteOffReleaseMatchesOfflineReference":true}
```
