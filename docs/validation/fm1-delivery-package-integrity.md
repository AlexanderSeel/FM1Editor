# FM-1 packaged delivery evidence software acceptance

Source commit: `86ed9bf79b6549e8170e89501fa133f02625e678`

Software acceptance: **FAILED**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 1 |
| lint | 0 |
| base-delivery | 0 |
| delivery-v2 | 0 |
| delivery-v3 | 0 |
| consistency | 0 |
| package | 0 |
| full-test | 0 |
| build | 1 |

- v1 remains the physical-manifest completeness evaluator and v2 remains the manifest/raw-MIDI SHA binding layer
- final v3 READY requires one unique FM-1 package index for each selected Chrome/Edge session containing that exact manifest hash and raw-MIDI hash
- each selected package must also contain at least one WAV artifact, one SysEx artifact and screenshot-or-notes evidence
- Chrome and Edge must use distinct package-index hashes and distinct WAV hashes; the same known merged-bank SysEx may legitimately be reused
- v3 persists artifact identities/hashes only and does not copy WAV audio, SysEx bytes or raw MIDI payloads
- package completeness and hashing are integrity prerequisites and never derive physical PASS observations


## typecheck failure tail

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/validation/fm1DeliveryEvidencePackageIntegrity.test.ts(111,228): error TS2379: Argument of type '{ omitWav: boolean | undefined; }' is not assignable to parameter of type '{ omitWav?: boolean; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'omitWav' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
      Type 'undefined' is not assignable to type 'boolean'.

```

## build failure tail

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/validation/fm1DeliveryEvidencePackageIntegrity.test.ts(111,228): error TS2379: Argument of type '{ omitWav: boolean | undefined; }' is not assignable to parameter of type '{ omitWav?: boolean; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'omitWav' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
      Type 'undefined' is not assignable to type 'boolean'.

```
