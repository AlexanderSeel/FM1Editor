# DX7 generated codec property validation

Validated source commit: `9c408d91f8245e8226a150c0c285685d44f47245`

- generated codec property suite: **SUCCESS**
- typecheck, lint, full tests and production build: **SUCCESS**

- deterministic generated cases sweep every declared numeric parameter range family.
- single-voice messages round-trip across all 16 MIDI channels with valid Yamaha checksums.
- packed voices round-trip byte-for-byte while preserving legal seven-bit reserved fields.
- 32-voice banks round-trip across all 16 MIDI channels with valid Yamaha checksums.
- no hardware transmission behavior was added or changed.
