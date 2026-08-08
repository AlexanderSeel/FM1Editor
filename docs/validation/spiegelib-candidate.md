# SpiegeLib composed learned-candidate software acceptance

Source commit: `3ebf07bbe8178ac08568a4660d64ed774d271f2d`

Software acceptance: **FAILED**

| Stage | Exit |
| --- | ---: |
| install | 1 |
| audit | ? |
| typecheck | ? |
| lint | ? |
| scaler | ? |
| model | ? |
| adapter | ? |
| full-test | ? |
| build | ? |

This gate covers dependency installation, learned-asset provenance, TypeScript/lint, scaler/model/adapter focused tests, full tests and production build for the locally composed SpiegeLib candidate. Historical MFCC numerical compatibility remains a separate admission condition.


## install failure tail

```text
npm error code ETARGET
npm error notarget No matching version found for eslint-plugin-react-hooks@^6.10.2.
npm error notarget In most cases you or one of your dependencies are requesting
npm error notarget a package version that doesn't exist.
npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2026-08-08T11_12_09_912Z-debug-0.log

```

## audit failure tail

```text
stage not run
```

## typecheck failure tail

```text
stage not run
```

## lint failure tail

```text
stage not run
```

## scaler failure tail

```text
stage not run
```

## model failure tail

```text
stage not run
```

## adapter failure tail

```text
stage not run
```

## full-test failure tail

```text
stage not run
```

## build failure tail

```text
stage not run
```
