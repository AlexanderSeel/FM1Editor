# Renderer-backed CMA-ES browser acceptance

Source commit: `3e72adf9771f08552b1e118621cbfc364bd40659`

Overall browser gate: **FAILED**

| Browser | Product | Refined candidates | Improved starts | Refined audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Unable to read refined distance pairs: [] |
| Edge | FAILED | — | — | — | — | Unable to read refined distance pairs: [] |

The mounted Audio → FM flow performs local reference preparation, Quick-scan retrieval and an explicit seeded CMA-ES refinement over the top retrieved voices. Distances are read from structural numeric result metadata rather than formatted display text. Acceptance requires non-worsening best distance with at least one improvement, measurable dry refined audition, no implicit editor load, explicit Load refined, zero Web MIDI requests and no external/write fetches.

This validates local semantic optimization against the DX7-compatible renderer/fingerprint objective only; it does not claim exact source recovery or physical FM-1 equivalence.
