# Renderer-backed CMA-ES browser acceptance

Source commit: `78ff8f0c8c49ae30306af13e3d86c317d41015f0`

Overall browser gate: **FAILED**

| Browser | Product | Refined candidates | Improved starts | Refined audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Runtime.evaluate: Object reference chain is too long |
| Edge | FAILED | — | — | — | — | Runtime.evaluate: Object reference chain is too long |

The mounted Audio → FM flow prepares a local A4 reference, runs Quick-scan retrieval, and then explicitly refines up to the top three retrieved candidates with seeded CMA-ES over six operator output levels plus feedback. Acceptance requires non-worsening reported best distances with at least one measured improvement, dry refined audition PCM, no editor change during retrieval/refinement/audition, an explicit Load refined transition, zero Web MIDI requests, and no external/write fetches.

This validates local semantic optimization against the DX7-compatible renderer/fingerprint objective only. It does not claim exact recovery of arbitrary source audio or physical FM-1 equivalence.
