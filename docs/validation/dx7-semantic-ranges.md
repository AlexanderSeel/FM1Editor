# DX7 semantic range validation

Validated source commit: `f1edd103c32a52db97426b5918cca316a895c8da`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **SUCCESS**
- npm run build: **SUCCESS**
- semantic range marker check: **SUCCESS**

- raw legacy breakpoint 127 is normalized to 99 during decoding.
- raw legacy detune 15 is normalized to 14 during decoding.
- edited/in-memory breakpoint values above 99 are rejected.
- edited/in-memory detune values above 14 are rejected.

Physical FM-1 and Yamaha DX7 hardware behavior remains unverified.
