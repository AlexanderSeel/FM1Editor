# One-voice AudioWorklet software-boundary validation

Validated source commit: `7acf777369816465a901838bbefd85e9db5792b2`

Overall software gate: **FAILED**

| Check | Result |
| --- | --- |
| artifact | **SUCCESS** |
| typecheck | **FAILURE** |
| lint | **SUCCESS** |
| tests | **FAILURE** |
| build | **FAILURE** |

## Scope

- Validates the TypeScript AudioWorklet controller, mocked browser lifecycle, local package verification, semantic voice routing and the actual packaged stateful WASM ABI.
- `public/virtual-dx7/fm1-msfa-worklet.js` remains a dry one-voice processor: queued init, note on/off, all-notes-off, two 64-frame core blocks per standard 128-frame callback, zero-output fallback and explicit disposal.
- No Web MIDI, SysEx, effects or hardware-send path is introduced.
- Packaged stateful regression remained `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2` across 72000 frames; all-notes-off immediate silence=True.

This is not browser AudioWorklet execution evidence. Chrome/Edge execution and soak remain separate required gates.

The temporary workflow removes itself; normal CI remains read-only.

## Artifact log
```text
{"blockFrames":64,"callbackFrames":128,"fixedFrames":72000,"fixedSha256":"313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2","allNotesOffImmediateSilence":true,"noteOffReleaseMatchesOfflineReference":true}
```
