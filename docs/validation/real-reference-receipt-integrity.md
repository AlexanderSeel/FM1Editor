# Real-reference per-receipt integrity acceptance

Source commit: `81cfeaddf69b78c55467bb287471ff1d801e8a85`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-reconstruction | 0 |
| audit-learned | 0 |
| typecheck | 0 |
| lint | 0 |
| aggregate | 0 |
| full-test | 0 |
| build | 0 |

- evidence-set import hashes the exact per-reference receipt file bytes before parsing/aggregation
- aggregate rows retain each exact receipt SHA-256 alongside the reference-audio SHA-256
- final closure requires receipt hashes for every retained row in addition to learned/listening/exact-winner gates
- closure Markdown exposes receipt-integrity count and per-row receipt hashes
- exact winner voices remain in the per-reference receipts and are not duplicated into the aggregate
- raw source audio remains excluded; final evidence can retain receipt JSON without retaining copyrighted recordings

