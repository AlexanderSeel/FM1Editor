# Complete Virtual FM-1 preview browser acceptance

Source commit: `9ab676f48e3c90da980bc4f266bf1a108fc5a97d`

Overall browser gate: **FAILED**

| Browser | Product | Dry peak | FX peak | Attenuated peak | Reference A peak | Current B peak | WAV downloads | Measured utilization | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Chrome | FAILED | — | — | — | — | — | — | — | Timed out waiting for condition: document.body.textContent.includes('Reference A/B · offline render') && document.body.textContent.includes('Virtual FM-1 render diagnostics') |
| Edge | FAILED | — | — | — | — | — | — | — | Timed out waiting for condition: document.body.textContent.includes('Reference A/B · offline render') && document.body.textContent.includes('Virtual FM-1 render diagnostics') |

The real mounted preview uses idempotent workspace/section navigation, configures a non-zero local software Filter with hardware Live send off, measures post-limiter dry and FX output, verifies master attenuation and measured worklet diagnostics, and scopes prepared-reference A/current-B/WAV actions specifically to the Virtual FM-1 A/B section.

Acceptance requires zero Web MIDI requests and no external/write fetches. This validates browser-local DX7-compatible / FM-1-inspired behavior only; it does not claim physical FM-1 algorithm or audio equivalence.
