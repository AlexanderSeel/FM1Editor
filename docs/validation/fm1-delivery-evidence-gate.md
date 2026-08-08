# FM-1 delivery evidence gate software acceptance

Source commit: `dd52cfaeeb372c8d52aaaa51fe29521013e89367`

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

The accepted state contains the FM-1 hardware manifest fields for note-off recovery and channel selection, the deterministic Chrome/Edge delivery evidence evaluator, the in-app multi-manifest importer/exporter, the physical protocol instructions, support-matrix boundary and PLAN linkage.

READY requires matching complete physical Chrome and Edge sessions for one HTTPS origin, FM-1 firmware, editor commit and Windows build, including USB-audio measurements, a captured standard 4,104-byte bank send, destination/persistence/recovery observations, note-off recovery and channel selection. The software tests use synthetic manifests only and do not satisfy or close the physical PLAN items.
