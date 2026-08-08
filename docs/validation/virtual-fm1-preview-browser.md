# Complete Virtual FM-1 preview browser acceptance

Source commit: `ca46e89aa865d9c862952b0306deab9cb09ed2ce`

Overall browser gate: **FAILED**

| Browser | Product | Dry peak | FX peak | Attenuated peak | Reference A peak | Current B peak | WAV downloads | Measured utilization | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Chrome | FAILED | — | — | — | — | — | — | — | Timed out waiting for condition: !document.body.textContent.includes('measurement pending') |
| Edge | FAILED | — | — | — | — | — | — | — | Timed out waiting for condition: !document.body.textContent.includes('measurement pending') |

The mounted preview is discovered by semantic DOM labels, configures local software FX with hardware Live send off, measures post-limiter dry/FX/master behavior and worklet diagnostics, and validates prepared-reference A/current-B plus note/chord RIFF/WAVE output.

Acceptance requires zero Web MIDI requests and no external/write fetches. This validates browser-local DX7-compatible / FM-1-inspired behavior only; it does not claim physical FM-1 equivalence.
