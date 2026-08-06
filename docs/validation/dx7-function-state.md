# DX7 detached function-state validation

Validated source commit: `edde0cdd0e6ab00c57678ecad9f0795841dc7090`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **SUCCESS**
- npm run build: **SUCCESS**
- detached function marker check: **SUCCESS**

- function parameters 64 through 77 are modeled outside Dx7Voice.
- mono/poly, pitch bend, portamento and four controller assignments use documented semantic ranges.
- controller assignment masks 0 through 7 round-trip.
- function state does not change 155-byte or 128-byte voice payloads.
- no function parameter SysEx is constructed or transmitted.
