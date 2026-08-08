# Physical evidence structural-consistency software acceptance

Source commit: `031feb867eb88e41a85732856cfed7cf844c9b03`

Software acceptance: **FAILED**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 1 |
| lint | 0 |
| consistency | 0 |
| package | 0 |
| full-test | 0 |
| build | 1 |

- FM-1 and stock-DX7 manifests are correlated to exactly one raw version-1 MIDI-monitor export by recomputing the embedded capture summary
- mismatched message/SysEx counts, length histograms, port names and first/last timestamps are reported with closest-capture diagnostics
- ambiguous duplicate raw captures, target/selected-port inconsistencies and invalid DX7 recovery hashes fail structural consistency
- missing editor/device identity is surfaced for review
- structural consistency does not evaluate physical PASS/FAIL observations, device behavior, audio content or PLAN closure


## typecheck failure tail

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/validation/physicalEvidenceConsistency.ts(195,43): error TS2345: Argument of type '(this: undefined, artifact: NamedJsonArtifact) => { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[] | { name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to parameter of type '(this: undefined, value: NamedJsonArtifact, index: number, array: NamedJsonArtifact[]) => { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; } | readonly { ...; }[]'.
  Type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[] | { name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; } | readonly { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[]'.
    Type '{ name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; } | readonly { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[]'.
      Type '{ name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to type 'readonly { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[]'.
        Type '{ name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }' is not assignable to type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }'.
          Types of property 'target' are incompatible.
            Type '"dx7"' is not assignable to type '"fm1"'.
src/validation/physicalEvidenceConsistency.ts(205,59): error TS18046: 'manifest' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(206,59): error TS18046: 'manifest' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(218,30): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(218,41): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(218,54): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(219,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(219,45): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(219,58): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(223,57): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(229,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(229,53): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(232,57): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(232,91): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(233,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(233,53): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(237,36): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(237,72): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(239,81): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(240,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(240,53): error TS18046: 'item' is of type 'unknown'.

```

## build failure tail

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 validated website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build && node scripts/inject-service-worker-assets.mjs

src/validation/physicalEvidenceConsistency.ts(195,43): error TS2345: Argument of type '(this: undefined, artifact: NamedJsonArtifact) => { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[] | { name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to parameter of type '(this: undefined, value: NamedJsonArtifact, index: number, array: NamedJsonArtifact[]) => { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; } | readonly { ...; }[]'.
  Type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[] | { name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; } | readonly { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[]'.
    Type '{ name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; } | readonly { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[]'.
      Type '{ name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }[]' is not assignable to type 'readonly { name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }[]'.
        Type '{ name: string; target: "dx7"; manifest: Dx7HardwareEvidenceManifest; }' is not assignable to type '{ name: string; target: "fm1"; manifest: HardwareEvidenceManifest; }'.
          Types of property 'target' are incompatible.
            Type '"dx7"' is not assignable to type '"fm1"'.
src/validation/physicalEvidenceConsistency.ts(205,59): error TS18046: 'manifest' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(206,59): error TS18046: 'manifest' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(218,30): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(218,41): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(218,54): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(219,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(219,45): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(219,58): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(223,57): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(229,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(229,53): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(232,57): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(232,91): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(233,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(233,53): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(237,36): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(237,72): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(239,81): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(240,34): error TS18046: 'item' is of type 'unknown'.
src/validation/physicalEvidenceConsistency.ts(240,53): error TS18046: 'item' is of type 'unknown'.

```
