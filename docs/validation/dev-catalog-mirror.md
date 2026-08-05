# Development catalog mirror validation

Validated source commit: `81aa8f213ee9862aa4aa50f57c2a893f48a16bab`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Verified behavior:

- npm run dev performs best-effort catalog synchronization before Vite starts;
- runtime skips local website mirrors when no validated sync manifest exists;
- missing mirror paths are no longer requested from Vite and cannot resolve to index.html;
- validated mirrors remain preferred, with direct-source fallback after validation failure.
