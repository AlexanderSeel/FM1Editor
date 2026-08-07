# Virtual FM-1 reference A/B and WAV UI software validation

Source commit: `c71e18d2e6ec6b1af9901ce34ba7db24d2fb6c5d`

Overall software gate: **SUCCESS**

The accepted routed Virtual FM-1 preview now mounts the shared prepared-reference controls. Reference A is the in-memory prepared local PCM published by the Audio → FM panel; Current B is the current semantic voice rendered through the deterministic offline engine and the same dry/FX/master/limiter preview route.

Explicit actions provide Reference A playback, Current B playback, note WAV download and chord WAV download. The prepared-reference store is in-memory only and clears when the reference panel unmounts; no audio is persisted or uploaded by this bridge. No action requests Web MIDI or transmits hardware data.

Virtual-engine audit, typecheck, lint, focused preview/A-B/WAV tests, the full test suite and production build passed. Branded-browser A/B and OfflineAudioContext execution remain required before the overall Virtual FM-1 preview item closes.
