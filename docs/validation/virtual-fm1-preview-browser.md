# Complete Virtual FM-1 preview browser acceptance

Source commit: `f73c8a3a1211a4fd4ab45d79554f53da68af0431`

Overall browser gate: **FAILED**

| Browser | Product | Dry peak | FX peak | Attenuated peak | Reference A peak | Current B peak | WAV downloads | Measured utilization | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Chrome | FAILED | — | — | — | — | — | — | — | Master gain did not attenuate output enough: fx=0.07193171232938766, attenuated=0.07192932814359665 |
| Edge | FAILED | — | — | — | — | — | — | — | Master gain did not attenuate output enough: fx=0.07193171232938766, attenuated=0.07193083316087723 |

This clean-state branded-browser run exercises the mounted Virtual FM-1 preview after the measured worklet clock fallback: local software FX, post-limiter dry/FX/master output, measured worklet diagnostics, prepared-reference A/current-B playback and valid note/chord RIFF/WAVE export.

Acceptance requires zero Web MIDI requests and no external/write fetches. This is DX7-compatible / FM-1-inspired browser evidence only; no physical FM-1 equivalence is claimed.
