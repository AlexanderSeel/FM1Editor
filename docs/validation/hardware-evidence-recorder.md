# Hardware evidence recorder software acceptance

Source commit: `5e22ef590da682f0f1f193cab15ae3c365957285`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| focused-test | 0 |
| full-test | 0 |
| build | 0 |

The accepted in-app helper is explicitly scoped to the FM-1 physical protocol. It summarizes current MIDI traffic, recognizes outgoing standard Yamaha 4,104-byte bank and 163-byte single-voice frames, records test identity/audio measurements plus explicit protocol observations, and exports a sanitized summary manifest beside the raw MIDI-monitor JSON.

No traffic pattern or software test can set a physical result to PASS. Stock Yamaha DX7 validation is intentionally kept in the separate `docs/validation/dx7-hardware-test-protocol.md` procedure. This receipt validates evidence tooling only and closes no hardware-dependent PLAN item.
