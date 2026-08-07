# Complete Virtual FM-1 preview browser acceptance

Source commit: `ef01cbbdcafd98a4503640a4b7c430df52872076`

Overall browser gate: **FAILED**

| Browser | Product | Dry peak | FX peak | Attenuated peak | Reference A peak | Current B peak | WAV downloads | Measured utilization | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Chrome | FAILED | — | — | — | — | — | — | — | Unable to enable software Filter state |
| Edge | FAILED | — | — | — | — | — | — | — | Unable to enable software Filter state |

The real mounted preview configures a non-zero local Filter state with hardware Live send left off, measures post-limiter dry and FX output, verifies master-gain attenuation, waits for measured AudioWorklet diagnostics, prepares and plays a local reference A, renders/plays current B through OfflineAudioContext, and verifies note/chord downloads are non-empty RIFF/WAVE blobs.

Acceptance requires zero Web MIDI requests and no external/write fetches. This validates only the browser-local DX7-compatible / FM-1-inspired preview; it does not claim physical FM-1 algorithm or audio equivalence.
