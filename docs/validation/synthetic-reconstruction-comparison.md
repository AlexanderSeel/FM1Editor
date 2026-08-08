# Packaged-engine synthetic reconstruction comparison

Source commit: `6db91e6efdb90596223fb278eaa6d5d1c170c4c6`

Overall benchmark gate: **SUCCESS**

| Approach | Candidates | Best distance | Runtime ms | Source / failure |
| --- | ---: | ---: | ---: | --- |
| Retrieval only | 3 | 0.04095621 | 0.456 | Repository-owned synthetic start 1 |
| Seeded constrained CMA-ES | 2 | 0.00751358 | 761.021 | CMA from Repository-owned synthetic start 1 |
| Learned initialization | 0 | — | 0.108 | No license-admitted learned initializer/checkpoint is available yet. |

Retrieval minus evolutionary best-distance delta: `0.03344264`. Positive means CMA-ES produced the lower fingerprint distance on this fixture.

Engine: `fm1-editor-msfa-compatible` / `msfa-2e182b3-fm1-v3-stateful` at 48 kHz using probe `c4-main`.

Scope remains one repository-owned synthetic ground-truth case. It is not a real isolated-sound benchmark. The learned row intentionally records the absence of a license-admitted implementation/checkpoint; therefore the broader comparison roadmap item remains open.

Upstream audit, strict typecheck, lint, packaged benchmark, full tests and production build passed.
