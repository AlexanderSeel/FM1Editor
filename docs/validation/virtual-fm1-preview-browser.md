# Complete Virtual FM-1 preview browser acceptance

Source commit: `5672efd402221e8713a18270b67fb6cd3ce5fbaf`

Overall browser gate: **FAILED**

| Browser | Product | Dry peak | FX peak | Attenuated peak | Reference A peak | Current B peak | WAV downloads | Measured utilization | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Chrome | FAILED | — | — | — | — | — | — | — | Unable to enable software Filter state |
| Edge | FAILED | — | — | — | — | — | — | — | Unable to enable software Filter state |

The real mounted preview configures a non-zero local Filter state with hardware Live send off, measures post-limiter dry and FX output, verifies master attenuation, and waits for measured AudioWorklet diagnostics. Prepared-reference A, current B, note WAV and chord WAV actions are explicitly scoped to the Virtual FM-1 A/B section; downloaded blobs must contain valid RIFF/WAVE headers.

Acceptance requires zero Web MIDI requests and no external/write fetches. This validates browser-local DX7-compatible / FM-1-inspired behavior only; it does not claim physical FM-1 algorithm or audio equivalence.
