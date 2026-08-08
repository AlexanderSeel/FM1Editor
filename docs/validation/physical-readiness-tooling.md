# Physical validation and protocol-discovery tooling

Source commit: `5590e093131b742456c7edbaefbe72027e4b4489`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| focused-midi | 0 |
| focused-hardware | 0 |
| full-test | 0 |
| build | 0 |

This exact repository state contains the FM-1-only hardware evidence recorder inside the MIDI monitor, raw MIDI JSON export, deterministic latest same-direction SysEx byte-delta analysis, FM-1 protocol sections A–F including discovery-first sequencer validation, the dedicated stock Yamaha DX7 physical protocol, current PLAN links, and the synchronized support/recovery matrix.

The SysEx delta analyzer reports only structural evidence: lengths, common prefix/suffix and changed byte offsets/values. It does not assign device semantics. The hardware recorder recognizes outgoing standard Yamaha 4,104-byte bank and 163-byte single-voice frames as metadata only. Real FM-1/DX7 observations and captures remain required before any hardware-dependent PLAN item can close.
