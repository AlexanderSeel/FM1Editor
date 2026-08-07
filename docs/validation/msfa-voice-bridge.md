# MSFA-compatible voice bridge validation

Date: 2026-08-07

Implementation commits:

- `9737e20942cd366fbd559cf126d038a075c0495e` — semantic MSFA voice bridge;
- `a94aa0a53769df3940309378f1271a46e7a3715c` — bridge tests;
- `fff7b148d06866df59fefa66d950cb950eab1622` — updated feasibility architecture and blockers.

## Scope

This receipt covers only the TypeScript semantic-to-engine buffer boundary. It does **not** claim that MSFA source has been vendored, that WebAssembly exists, that PCM has been rendered, or that Dexed, Yamaha DX7 or M-VAVE FM-1 audio equivalence has been demonstrated.

## Mapping decision

`src/audio/msfaVoiceBridge.ts` accepts only a validated `VirtualDx7RenderPlan`. It cannot accept an arbitrary byte buffer.

The bridge uses the repository's existing `encodeSingleVoiceData()` implementation to produce the standard 155-byte unpacked Yamaha voice representation from the semantic snapshot. The render-plan snapshot has no `name` or imported `source` bytes; the bridge supplies an empty canonical name before encoding so display metadata does not change engine input.

The bridge then keeps Yamaha edit-session parameter `155` separate and derives the initial all-operators-enabled mask through the existing `Dx7EditSession` encoder. The private compatibility buffer is exactly 156 bytes:

- offsets `0..154`: canonical semantic voice data;
- offset `155`: initial operator-enable mask `0x3f`.

This does not change `.syx` semantics: parameter `155` remains excluded from the 155-byte single-voice payload and from packed 128-byte voice data.

The pinned Dexed application source independently shows the same conceptual split: single-voice SysEx export copies 155 voice bytes, while its internal `data[155]` is populated separately from `controllers.opSwitch`. This observation is used only to define the private virtual-engine boundary; no GPL application code is copied into FM1 Editor.

## Safety properties

The bridge:

- has no Web MIDI dependency;
- has no SysEx-send function;
- has no FM-1 parameter-write function;
- does not expose the 156-byte compatibility buffer to hardware workflows;
- cannot inherit arbitrary imported packed/unpacked bytes because the render plan excludes `source`;
- cannot vary with voice display name because the name is canonicalized;
- uses the same semantic range validation and Yamaha encoder already used for file export;
- leaves future operator enable control as semantic edit-session state rather than raw-byte mutation.

The future C/C++ adapter must explicitly initialize its controller/operator state from the separate mask. It must not assume `Dx7Note::init()` itself consumes byte 155.

## Test coverage added

`src/audio/msfaVoiceBridge.test.ts` covers:

1. exactly 155 voice bytes plus a 156-byte private compatibility buffer;
2. parameter-155/all-operators-on state remains separate and equals `0x3f`;
3. the first 155 compatibility-buffer bytes exactly equal the semantic voice encoder output;
4. names and imported raw source bytes do not change the bridge buffer;
5. decoding the 155-byte bridge voice reproduces the semantic operators, pitch envelope, algorithm, feedback, key sync, LFO and transpose;
6. a legal semantic voice change changes engine input without changing the separate operator mask.

## Execution status

No full repository execution is claimed by this receipt. The connected GitHub interface accepted the source/test commits on `main`, but it exposed no completed check/status evidence for the latest commit at the time this receipt was written. The execution container cannot resolve `github.com`, so it cannot clone the repository and run the complete command set locally.

The normal read-only CI workflow remains responsible for `npm run audit:virtual-dx7`, typecheck, lint, full Vitest and production build. Browser audio validation remains not applicable until a renderer and AudioWorklet exist.
