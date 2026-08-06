# FM-1 USB audio recorder validation

Validated source commit: `ef255649bd260cd750f6c54b6152ad47935b7682`

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

## typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/hooks/useAudioRecorder.ts(378,27): error TS2322: Type 'ArrayBufferLike' is not assignable to type 'BlobPart'.
  Type 'SharedArrayBuffer' is not assignable to type 'BlobPart'.
    Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
      Types of property '[Symbol.toStringTag]' are incompatible.
        Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.

```

## build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/hooks/useAudioRecorder.ts(378,27): error TS2322: Type 'ArrayBufferLike' is not assignable to type 'BlobPart'.
  Type 'SharedArrayBuffer' is not assignable to type 'BlobPart'.
    Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
      Types of property '[Symbol.toStringTag]' are incompatible.
        Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.

```

## chromium output

```text
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
curl: (22) The requested URL returned error: 404

```
