# Renderer-backed CMA-ES browser acceptance

Source commit: `eb7f9546a5633702ca97067081ec7d17ca6e83df`

Overall browser gate: **SUCCESS**

| Browser | Product | Refined candidates | Improved starts | Refined audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | Chrome/151.0.7922.72 | 3 | 3 | 0.13589478 | 0 | PASS |
| Edge | Edg/151.0.4129.59 | 3 | 3 | 0.13589478 | 0 | PASS |

This clean run starts from a software-green head, prepares a local reference, performs Quick-scan retrieval and explicit seeded constrained CMA-ES refinement, validates structural numeric distances, refined dry audition PCM, explicit-only load, zero Web MIDI and no external/write fetches.

Transient result JSON is ignored and removed. No exact source-recovery or physical FM-1 equivalence is claimed.
