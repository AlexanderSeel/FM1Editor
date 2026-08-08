# FM-1 packaged delivery evidence software acceptance

Source commit: `c5ea96742fcd32cc04a0c085edff7a58ef485372`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| base-delivery | 0 |
| delivery-v2 | 0 |
| delivery-v3 | 0 |
| consistency | 0 |
| package | 0 |
| full-test | 0 |
| build | 0 |

- v1 remains the physical-manifest completeness evaluator and v2 remains the manifest/raw-MIDI SHA binding layer
- final v3 READY requires one unique FM-1 package index for each selected Chrome/Edge session containing that exact manifest hash and raw-MIDI hash
- each selected package must also contain at least one WAV artifact, one SysEx artifact and screenshot-or-notes evidence
- Chrome and Edge must use distinct package-index hashes and distinct WAV hashes; the same known merged-bank SysEx may legitimately be reused
- v3 persists artifact identities/hashes only and does not copy WAV audio, SysEx bytes or raw MIDI payloads
- package completeness and hashing are integrity prerequisites and never derive physical PASS observations

