# Physical evidence structural-consistency software acceptance

Source commit: `08e8fb55075bb302f4edb978651fdaa1a8b4b2fb`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| consistency | 0 |
| package | 0 |
| full-test | 0 |
| build | 0 |

- FM-1 and stock-DX7 manifests are correlated to exactly one raw version-1 MIDI-monitor export by recomputing the embedded capture summary
- mismatched message/SysEx counts, length histograms, port names and first/last timestamps are reported with closest-capture diagnostics
- the exported correlation receipt binds each linked manifest and raw MIDI export by SHA-256 while excluding MIDI event payloads
- ambiguous duplicate raw captures, target/selected-port inconsistencies and invalid DX7 recovery hashes fail structural consistency
- missing editor/device identity is surfaced for review
- structural consistency does not evaluate physical PASS/FAIL observations, device behavior, audio content or PLAN closure

