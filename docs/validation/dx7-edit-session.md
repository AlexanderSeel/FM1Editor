# DX7 edit-session operator mask validation

Validated source commit: `ae9cd428f0e488884f87dea716f95ecd1375a602`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **SUCCESS**
- npm run build: **SUCCESS**
- edit-session boundary marker check: **SUCCESS**

- parameter 155 is modeled as separate edit-session state.
- OP1 maps to bit 5 and OP6 maps to bit 0.
- all 64 valid masks round-trip.
- session state is excluded from 155-byte single-voice and 128-byte packed voice payloads.
- parameter-change transmission remains disabled.
