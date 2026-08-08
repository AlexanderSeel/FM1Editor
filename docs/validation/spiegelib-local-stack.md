# SpiegeLib local learned-stack software acceptance

Source commit: `12f8e6b58e746f981433ff81f01586ae087f415d`

Software acceptance: **FAILED**

| Stage | Exit |
| --- | ---: |
| typecheck | 1 |
| lint | 0 |
| initializer | 0 |
| mlp | 0 |
| model | 0 |
| scaler | 0 |
| full-test | 0 |
| build | 1 |

This gate validates only repository-local model tensor loading/execution, nine-output semantic mapping, Librosa-compatible MFCC source compilation and the scaler/input contract. It does not establish the archived scaler conversion or raw-audio MFCC numerical compatibility unless their separate receipts are present.


## typecheck failure tail

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/audio/spiegelibSimpleFmMlp.ts(95,37): error TS2322: Type 'Float32Array<ArrayBufferLike>' is not assignable to type 'Float32Array<ArrayBuffer>'.
  Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
    Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
      Types of property '[Symbol.toStringTag]' are incompatible.
        Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.
src/audio/spiegelibSimpleFmModel.test.ts(40,52): error TS2345: Argument of type 'Float32Array<ArrayBufferLike>' is not assignable to parameter of type 'readonly number[]'.
  Type 'Float32Array<ArrayBufferLike>' is missing the following properties from type 'readonly number[]': concat, flatMap, flat, [Symbol.unscopables]

```

## build failure tail

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/audio/spiegelibSimpleFmMlp.ts(95,37): error TS2322: Type 'Float32Array<ArrayBufferLike>' is not assignable to type 'Float32Array<ArrayBuffer>'.
  Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
    Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
      Types of property '[Symbol.toStringTag]' are incompatible.
        Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.
src/audio/spiegelibSimpleFmModel.test.ts(40,52): error TS2345: Argument of type 'Float32Array<ArrayBufferLike>' is not assignable to parameter of type 'readonly number[]'.
  Type 'Float32Array<ArrayBufferLike>' is missing the following properties from type 'readonly number[]': concat, flatMap, flat, [Symbol.unscopables]

```
