# Renderer-backed CMA-ES browser acceptance

Source commit: `93335ffdd05e46459d4769094667326c78544960`

Overall browser gate: **FAILED**

| Browser | Product | Refined candidates | Improved starts | Refined audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Unable to read refined distance pairs: [] |
| Edge | FAILED | — | — | — | — | Unable to read refined distance pairs: [] |

The mounted Audio → FM flow prepares a local A4 reference, performs Quick-scan retrieval, then explicitly refines up to the top three retrieved candidates using seeded CMA-ES over six operator output levels plus feedback. It requires non-worsening best distances with at least one improvement, measurable dry refined audition PCM, no implicit editor load, explicit Load refined, zero Web MIDI requests and no external/write fetches.

This validates local semantic optimization against the DX7-compatible renderer/fingerprint objective only; it does not claim exact source recovery or physical FM-1 equivalence.
