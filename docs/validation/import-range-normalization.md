# Imported legacy range normalization

Validated source commit: `9ecd9f006b041e32f3995ec80201371ab403a18f`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Verified behavior:

- OP6 envelope rate 3 value 127 imports as 99;
- all DX7 parameters documented as 0-99 normalize values 100-127 to 99;
- breakpoint, operator envelopes, pitch envelopes, scaling depths, output level, fine frequency and LFO fields are covered;
- narrower bit-field parameters remain unchanged and strictly validated;
- normalized single voices and complete 32-voice banks re-encode with a new Yamaha checksum.
