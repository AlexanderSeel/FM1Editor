# Virtual DX7 synthetic reference fixture

Date: 2026-08-07

Implementation:

- `src/audio/virtualDx7ReferenceFixture.ts`
- `src/audio/virtualDx7ReferenceFixture.test.ts`

## Purpose

The virtual-renderer feasibility work needs one stable, legally clean voice that can be loaded through a Yamaha-compatible `.syx` path and rendered by native/MSFA and WebAssembly builds under identical conditions.

The fixture is defined directly in FM1 Editor source from semantic `Dx7Voice` fields. It is not copied from a Yamaha factory bank, the tracked patch catalog, Dexed cartridges or another third-party patch source.

Fixture identity:

- id: `fm1-editor-reference-voice-v1`
- generated filename: `fm1-editor-reference-voice-v1.syx`
- Yamaha single-voice message length: 163 bytes
- generated `.syx` SHA-256: `45aa70a4755c802b1657e522c5bbbd6d1162893aef781923676962766d4b8410`
- 155-byte named voice-data SHA-256: `d694dafd4a1d5eb7746169fbb0ade7f0a7a53215678f7e47de355cb91da50055`
- private canonical 156-byte MSFA bridge SHA-256: `fd435cb7a1c75c05eccb9d084278244074b1a2c17c0e074f6f7ede0606c67a98`

The `.syx` and bridge hashes intentionally differ because the Yamaha message retains the synthetic display name while the virtual engine bridge canonicalizes name bytes and appends separate all-operators-enabled edit state. Name bytes are excluded from audio identity.

## Fixed render request

- MIDI note: 60
- velocity: 100
- sample rate: 48,000 Hz
- note-on window: 1.0 s
- release window: 0.5 s
- total output: 72,000 mono frames
- random seed: 42
- dry output only

This is the fixture named by the feasibility acceptance criteria. Reference audio must not add effects, resampling, limiter processing or undocumented controller state.

## Test assertions

The fixture tests require:

- deterministic byte-for-byte `.syx` generation;
- Yamaha envelope/checksum decoding succeeds;
- channel is 0 and semantic fixture fields round-trip;
- generated `.syx`, voice-data and private bridge hashes remain pinned;
- the render request remains fixed at 72,000 frames and seed 42;
- bridge synthesis bytes `0..144` match the `.syx` synthesis parameter bytes while display-name bytes are canonicalized;
- the repository-defined voice has no imported `source.packed` or `source.unpacked` bytes.

## Validation boundary

The expected hashes were independently derived from the documented semantic fixture and Yamaha message format while preparing this receipt. Full Vitest execution for the committed test source is **not claimed here** because the connected execution container cannot clone GitHub and the latest push exposed no completed check/status evidence through the connected interface.

A passing future CI receipt is required before these hashes are treated as validated executable regression fixtures. Neither this fixture nor its virtual rendering can establish physical Yamaha DX7 or M-VAVE FM-1 equivalence.
