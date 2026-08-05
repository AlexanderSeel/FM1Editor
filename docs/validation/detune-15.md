# Detune 15 compatibility validation

Validated commit: `854879bf2dada4e0714e7bf2a23baa69fce81f8b`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Compatibility behavior:

- packed DX7 detune nibble 15 is normalized to valid detune 14;
- upper reserved bits remain preserved;
- an existing in-memory detune 15 no longer blocks single-voice encoding;
- an existing in-memory detune 15 no longer blocks a complete 32-voice bank encoding;
- normalization happens before the Yamaha checksum is calculated.
