# Breakpoint 127 compatibility validation

Validated source commit: `0ad72e917b858724a40eb2fa037df0821f5baf55`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Verified behavior:

- packed and unpacked keyboard-scaling breakpoint 127 normalizes to 99;
- imported voices remain editable and exportable;
- existing in-memory breakpoint 127 no longer blocks single-voice encoding;
- existing in-memory breakpoint 127 no longer blocks complete 32-voice bank encoding;
- Yamaha checksum is recalculated after normalization.
