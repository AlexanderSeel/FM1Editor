# Integrated MSFA offline engine validation

Validated source commit: `8776013471cc1255a5a3a357657ef8ab51adaf94`

Overall gate: **SUCCESS**

| Check | Result |
| --- | --- |
| identity | **SUCCESS** |
| artifact | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| tests | **SUCCESS** |
| build | **SUCCESS** |

## Boundary evidence

- `createMsfaOfflineEngine()` loads the packaged local `public/virtual-dx7/fm1-msfa.mjs` artifact through the semantic `VirtualDx7Engine` contract.
- The TypeScript wrapper accepts a validated render plan, creates the private 156-byte semantic bridge, forwards note/velocity/sample rate/block-aligned durations/random seed, copies normalized mono PCM, validates it, and releases both WASM allocations.
- Cancellation is checked before module load, before the synchronous native call and after it. The current WASM call itself is synchronous and therefore cannot be preempted mid-call.
- The default loader performs local browser module loading only; it contains no Web MIDI, SysEx, upload or hardware-send path.
- Packaged fixed render: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`, 72000 frames, seed 42, peak 0.125518799, RMS 0.00961926.

This receipt validates the dry **offline** DX7-compatible renderer only. It does not claim AudioWorklet execution or physical Yamaha DX7 / M-VAVE FM-1 equivalence.

The temporary workflow removes itself; normal CI remains read-only.
