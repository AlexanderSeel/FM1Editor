# Renderer-backed CMA-ES browser acceptance

Source commit: `9eb09b47c561735f2dbf2f474d70e1eabef1f16d`

Overall browser gate: **FAILED**

| Browser | Product | Refined candidates | Improved starts | Refined audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Unable to read refined distance pairs: [] |
| Edge | FAILED | — | — | — | — | Unable to read refined distance pairs: [] |

The mounted Audio → FM flow performs local reference preparation, Quick-scan retrieval and explicit seeded CMA-ES refinement. Raw structural distance metadata is returned over CDP and validated in the Node runner. Acceptance requires at least one improvement, measurable dry refined audition, no implicit editor load, explicit Load refined, zero Web MIDI requests and no external/write fetches.

This validates local semantic optimization against the DX7-compatible renderer/fingerprint objective only; it does not claim exact source recovery or physical FM-1 equivalence.
