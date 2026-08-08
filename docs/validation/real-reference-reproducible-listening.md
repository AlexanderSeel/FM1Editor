# Real-reference reproducible listening evidence acceptance

Source commit: `4a9a75e563f561ef4c550ff3c7ae50c38c42e4fb`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-reconstruction | 0 |
| audit-learned | 0 |
| typecheck | 0 |
| lint | 0 |
| benchmark | 0 |
| aggregate | 0 |
| full-test | 0 |
| build | 0 |

- current benchmark receipts retain the exact semantic DX7 winner for every successful retrieval, CMA and learned row
- each retained winner is bound to the recorded approach id, best distance and source-initialization string and is standard single-voice SysEx encodable
- packed/unpacked catalog provenance bytes and raw reference samples are excluded from receipts
- benchmark and evidence-set UIs expose the exact winners for local audition and single-voice SysEx export
- legacy receipts remain parseable, but final aggregate closure requires all retained receipts to carry complete exact-winner audition evidence
- this closes software reproducibility of listening evidence only; actual 2+2+2 recordings and human listening verdicts remain external evidence

