# Renderer-backed CMA-ES browser acceptance

Source commit: `56cb49da90df1c4288e2f4c76c023dff02720cb3`

Overall browser gate: **FAILED**

| Browser | Product | Refined candidates | Improved starts | Refined audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | result missing |
| Edge | FAILED | — | — | — | — | result missing |

This clean-state run performs local reference preparation, Quick-scan retrieval and explicit seeded CMA-ES refinement. Raw structural distances are returned to Node, with at least one required improvement, measurable dry refined audition, no implicit editor load, explicit Load refined, zero Web MIDI requests and no external/write fetches.

Browser result JSON is ephemeral validation state and is removed before committing. This validates local semantic optimization only; it does not claim exact source recovery or physical FM-1 equivalence.
