# Audio → FM candidate output browser acceptance

Source commit: `93bf2304ad5c1f640e15f3c325e0c5741488a9b8`

Overall browser gate: **SUCCESS**

| Browser | Product | .syx bytes | Downloads | FX restored | Web MIDI requests | Result |
| --- | --- | ---: | ---: | --- | ---: | --- |
| Chrome | Chrome/151.0.7922.72 | 163 | 1 | true | 0 | PASS |
| Edge | Edg/151.0.4129.59 | 163 | 1 | true | 0 | PASS |

The accepted flow starts from local reference retrieval/CMA refinement, exports a standard 163-byte Yamaha DX7 single-voice SysEx with valid checksum, attaches the current FM-1-inspired FX snapshot, auditions without loading, then uses only the explicit Load refined + FX action and verifies Filter enabled/Cutoff 22 after load. Semantic diffs, source initialization and metric breakdown are already displayed by the refined candidate UI.

Acceptance requires zero Web MIDI requests and no external/write fetches. No candidate is auto-sent to hardware and no physical FM-1 equivalence is claimed.
