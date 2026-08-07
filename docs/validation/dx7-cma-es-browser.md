# Renderer-backed CMA-ES browser acceptance

Source commit: `9da709a56575863b110c4e450198743df2955d98`

Overall browser gate: **FAILED**

| Browser | Product | Refined candidates | Improved starts | Refined audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | result missing |
| Edge | FAILED | — | — | — | — | result missing |

The mounted Audio → FM flow prepares a local A4 reference, runs Quick-scan retrieval, then explicitly refines the top retrieved candidates with seeded CMA-ES over six operator output levels plus feedback. Acceptance requires non-worsening reported best distances with at least one improvement, measurable dry refined audition PCM, no editor change during search/refinement/audition, an explicit Load refined transition, zero Web MIDI requests, and no external/write fetches.

This validates only local semantic optimization against the DX7-compatible renderer/fingerprint metric. It does not claim exact recovery of a physical source sound or FM-1 hardware equivalence.
