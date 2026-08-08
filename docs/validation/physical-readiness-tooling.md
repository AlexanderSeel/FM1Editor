# Physical validation and protocol-discovery tooling

Source commit: `945539c39048ca6a7a8ec0a709f999adee633656`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| focused-midi | 0 |
| focused-fm1 | 0 |
| focused-dx7 | 0 |
| full-test | 0 |
| build | 0 |

This exact repository state contains target-specific FM-1 and stock-Yamaha-DX7 evidence recorders inside the MIDI monitor, raw MIDI JSON export, deterministic latest same-direction SysEx byte-delta analysis, FM-1 physical protocol sections A–F including sequencer discovery, the stock DX7 physical protocol, current PLAN links, and the synchronized support/recovery matrix.

The FM-1 and DX7 evidence records start physical result fields pending. The DX7 manifest requires a verified recovery-bank SHA-256 before export. The SysEx delta analyzer reports structural differences only. Neither frame recognition, delta analysis, software tests nor builds assign hardware semantics or close any hardware-dependent PLAN item.
