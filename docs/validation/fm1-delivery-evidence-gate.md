# FM-1 delivery evidence gate software acceptance

Source commit: `c293ab37a8d5ea88364bca13964074f3927302b2`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| focused-hardware | 0 |
| focused-delivery | 0 |
| full-test | 0 |
| build | 0 |

The accepted state contains fail-closed FM-1 hardware-manifest parsing, explicit note-off recovery and MIDI-channel physical observations, deterministic Chrome/Edge evidence pairing, the in-app manifest importer/gate-receipt exporter, protocol instructions, support boundary and PLAN linkage.

READY requires matching complete physical Chrome and Edge sessions for one HTTPS origin, FM-1 firmware, editor commit and Windows build, including USB-audio measurements, a captured standard 4,104-byte bank send, destination/persistence/recovery observations, note-off recovery and channel selection. Malformed or incomplete imported JSON fails closed. Synthetic software tests do not satisfy or close the physical PLAN items.
