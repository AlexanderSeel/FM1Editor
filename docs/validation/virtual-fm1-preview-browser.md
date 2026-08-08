# Complete Virtual FM-1 preview browser acceptance

Source commit: `a01fbe2658c1e766aa5098833a5092cf82b3ac74`

Overall browser gate: **SUCCESS**

| Browser | Product | Dry peak | FX peak | Attenuated peak | Reference A peak | Current B peak | WAV downloads | Measured utilization | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Chrome | Chrome/151.0.7922.72 | 0.06689654 | 0.07193171 | 0.01806843 | 0.89125091 | 0.00180026 | 2 | 0.30%, 37.50% | PASS |
| Edge | Edg/151.0.4129.59 | 0.06689649 | 0.07193171 | 0.01806843 | 0.89125091 | 0.00180026 | 2 | 0.60%, 37.50% | PASS |

This run waits for the controlled React master-gain state to commit before measuring post-limiter attenuation. It also validates dry/FX output, measured worklet diagnostics, prepared-reference A/current-B playback, valid note/chord RIFF/WAVE export, zero Web MIDI and no external/write fetches.

No physical FM-1 equivalence is claimed.
