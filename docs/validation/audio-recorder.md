# FM-1 USB audio recorder validation

Validated source commit: `ec67ab50d1da75df7a58b027e0930eb0b2668b9d`

- npm install: **PASS**
- npm run typecheck: **FAIL**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **FAIL**
- Playwright and Chromium installation: **PASS**
- Chromium mocked-media recording check: **FAIL**

Validation scope:

- explicit permission/connect action;
- mocked audio-input connection and diagnostics;
- synthetic live input level;
- local PCM WAV start/stop/finalization;
- generated patch-aware filename;
- explicit monitoring warning and toggle;
- no physical FM-1 USB audio claim.
