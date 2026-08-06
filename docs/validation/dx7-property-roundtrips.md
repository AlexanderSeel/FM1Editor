# DX7 generated codec property validation

Validated source commit: `7b52c8fabbd728a73e04bb882549f011be388d0e`

- generated codec property suite: **SUCCESS**
- typecheck, lint, full tests and production build: **FAILURE**

- deterministic generated cases sweep every declared numeric parameter range family.
- single-voice messages round-trip across all 16 MIDI channels with valid Yamaha checksums.
- packed voices round-trip byte-for-byte while preserving legal seven-bit reserved fields.
- 32-voice banks round-trip across all 16 MIDI channels with valid Yamaha checksums.
- no hardware transmission behavior was added or changed.
