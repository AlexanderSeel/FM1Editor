# FM-1 USB audio recorder validation

Validated source commit: `2bb3b49b830b174f389ab7732de085d36e5ad01e`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**
- Playwright and Chromium installation: **PASS**
- Chromium mocked-media recording check: **PASS**

Validation scope:

- explicit permission/connect action;
- mocked audio-input connection and diagnostics;
- synthetic live input level;
- local PCM WAV start/stop/finalization;
- generated patch-aware filename;
- explicit monitoring warning and toggle;
- no physical FM-1 USB audio claim.

## typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false


```

## build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

[36mvite v8.2.0 [32mbuilding client environment for production...[36m[39m
[2Ktransforming...✓ 78 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.96 kB │ gzip:   0.47 kB
dist/assets/index-CvKRiAsU.css   59.64 kB │ gzip:  11.80 kB
dist/assets/index-DJ4gdELS.js   377.48 kB │ gzip: 112.70 kB

[32m✓ built in 257ms[39m
Service worker generated with 7 precached URLs (2ef65b1d21311245).

```

## chromium output

```text
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0100   967  100   967    0     0   747k      0 --:--:-- --:--:-- --:--:--  944k

```
