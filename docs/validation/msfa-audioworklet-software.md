# One-voice AudioWorklet software-boundary validation

Validated source commit: `ecb60746174833024cb96e9d0f0456036aa9b2bb`

Overall software gate: **FAILED**

| Check | Result |
| --- | --- |
| install | **SUCCESS** |
| artifact | **SUCCESS** |
| typecheck | **FAILURE** |
| lint | **SUCCESS** |
| tests | **SUCCESS** |
| build | **FAILURE** |

## Scope

- Validates the TypeScript AudioWorklet controller, mocked browser lifecycle, local package verification, semantic voice routing and the actual packaged stateful WASM ABI.
- The public worklet remains dry and one-voice only: two 64-frame engine blocks per standard 128-frame callback, note on/off, all-notes-off, zero-output fallback and disposal.
- No Web MIDI, SysEx, effects or hardware-send path is introduced.
- The controller package identity is aligned to `msfa-2e182b3-fm1-v3-stateful`, note validation rejects through the Promise API, and initialization has a bounded ready timeout.

This is not browser AudioWorklet execution evidence. Chrome/Edge execution and soak remain separate required gates.

The temporary workflow removes itself; normal CI remains read-only.

## typecheck failure log
```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/audio/msfaAudioWorklet.ts(154,3): error TS2322: Type 'AudioWorkletNode' is not assignable to type 'AudioWorkletNodeLike'.
  Types of property 'onprocessorerror' are incompatible.
    Type '((this: AudioWorkletNode, ev: ErrorEvent) => any) | null' is not assignable to type '((event: Event) => void) | null'.
      Type '(this: AudioWorkletNode, ev: ErrorEvent) => any' is not assignable to type '(event: Event) => void'.
        Types of parameters 'ev' and 'event' are incompatible.
          Type 'Event' is missing the following properties from type 'ErrorEvent': colno, error, filename, lineno, message
```

## build failure log
```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/audio/msfaAudioWorklet.ts(154,3): error TS2322: Type 'AudioWorkletNode' is not assignable to type 'AudioWorkletNodeLike'.
  Types of property 'onprocessorerror' are incompatible.
    Type '((this: AudioWorkletNode, ev: ErrorEvent) => any) | null' is not assignable to type '((event: Event) => void) | null'.
      Type '(this: AudioWorkletNode, ev: ErrorEvent) => any' is not assignable to type '(event: Event) => void'.
        Types of parameters 'ev' and 'event' are incompatible.
          Type 'Event' is missing the following properties from type 'ErrorEvent': colno, error, filename, lineno, message
```
