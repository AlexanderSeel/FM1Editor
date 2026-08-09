# Real-reference 2+2+2 evidence runner acceptance

Source commit: `a67894d1fa66457a1e8659255a9915796e3a3398`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-reconstruction | 0 |
| audit-learned | 0 |
| typecheck | 0 |
| lint | 0 |
| runner | 0 |
| full-test | 0 |
| build | 0 |

- requires exactly two FM-friendly electronic, two pitched acoustic and two difficult/noisy isolated files
- requires one explicit isolation/classification declaration and never silently chooses a region from clips longer than 30 seconds
- full bundled catalog is the default final-evidence scope; quick 256-voice scope remains explicit
- catalog candidates are loaded once and the same local MSFA engine/fingerprint cache are reused across all six sequential benchmarks
- each completed run retains prepared reference PCM only in browser memory for listening plus an exact winner-bearing receipt and receipt SHA-256
- exact retrieval/CMA/learned winners can be auditioned and exported as single-voice SysEx before structured listening verdicts are entered
- aggregate readiness reuses the existing fail-closed learned/listening/exact-winner/receipt-integrity gates
- evidence ZIP contains the six receipt JSON files and aggregate JSON; closure-ready sets additionally include the generated SHA-bound Markdown; source WAV/MP3 files are never included

