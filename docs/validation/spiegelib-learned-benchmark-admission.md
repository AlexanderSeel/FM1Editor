# SpiegeLib learned benchmark admission acceptance

Source commit: `087345a6b82b80b8e02eb8f5780e9e4ca44efc92`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-research | 0 |
| audit-learned | 0 |
| typecheck | 0 |
| lint | 0 |
| mfcc | 0 |
| candidate | 0 |
| benchmark | 0 |
| aggregate | 0 |
| full-test | 0 |
| build | 0 |
| lazy-bundle | 0 |

- numerical preprocessing evidence: `docs/research/spiegelib-mfcc-compatibility.md` (Python 3.7.7 + Librosa 0.7.2, strict 572-value comparison)
- learned row: one local SpiegeLib simple-FM MLP candidate; nine historical Dexed OP2 controls over a fixed training base; no CMA refinement
- privacy: selected reference remains local; benchmark receipt contains metadata/metrics only
- delivery: model/scaler are lazy-loaded for benchmark execution and are not embedded in the initial entry chunk
- legacy receipts with the earlier blocked learned row remain accepted by the evidence aggregator

