# SpiegeLib archived learned-label order audit

FM1 Editor source commit: `44ca1e9fbd7d13745cd104033520f908782a51a0`

Audit status: **SUCCESS**

- pinned experiment commit: `e1baab7fbeb0bc3f4d4946f8348e77dd18028080`
- pinned config SHA-256: `3f604ba1b45fa9dcfdaabe7b1f4d5b7a074b0812cb9e5cd0a9e31625bdcf75bc`
- historical interpreter: Python 3.7.7
- training/get-patch order: `[46, 47, 48, 50, 51, 52, 55, 56, 57]`
- prediction/expand-sub-patch order: `[46, 47, 48, 50, 51, 52, 55, 56, 57]`
- labels: `['OP2 EG RATE 2', 'OP2 EG RATE 3', 'OP2 EG RATE 4', 'OP2 EG LEVEL 2', 'OP2 EG LEVEL 3', 'OP2 EG LEVEL 4', 'OP2 F COARSE', 'OP2 F FINE', 'OP2 OSC DETUNE']`

Both historical code paths resolve to the same nine-column order used by FM1 Editor. The previous unique-value-cardinality audit was invalid because the archived training targets are continuous normalized VST values; this exact code/config audit replaces that failed inference.
