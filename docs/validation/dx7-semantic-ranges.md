# DX7 semantic range and normalization validation

Validated source commit: `8cad42fb9a5803b90d5072d1cc49f267e6e714be`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **SUCCESS**
- npm run build: **SUCCESS**
- semantic range and normalization marker check: **SUCCESS**

- raw legacy breakpoint 127 is normalized to 99 during import.
- raw legacy detune 15 is normalized to 14 during import.
- edited/in-memory breakpoint values above 99 are rejected.
- edited/in-memory detune values above 14 are rejected.
- every compatibility normalization is retained as structured path/from/to metadata.
- every normalization is emitted as a visible import warning diagnostic.

Exact untouched-file download remains unresolved; physical FM-1 and Yamaha DX7 behavior remains unverified.
