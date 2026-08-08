# FM-1 hash-bound delivery evidence software acceptance

Source commit: `6b67ed196a079230f9aaf845d6dca5a9c8ac6932`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| base-delivery | 0 |
| delivery-integrity | 0 |
| consistency | 0 |
| package | 0 |
| full-test | 0 |
| build | 0 |

- the historical v1 evaluator remains the manifest-completeness layer
- final v2 READY requires each selected Chrome/Edge manifest SHA-256 to have exactly one structurally-consistent raw-MIDI correlation link
- Chrome and Edge must use distinct manifest hashes and distinct raw MIDI capture hashes
- the v2 receipt contains source/hash bindings and validation metadata only; imported manifest bodies and raw MIDI payloads are not copied into the receipt
- hash/session correlation is an integrity prerequisite and never derives physical PASS observations

