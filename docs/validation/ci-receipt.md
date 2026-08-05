# CI validation receipt

- Validation revision: `5`
- Validated commit: `b6b3053a26a9d5448424176d4a7e1ea69ef61003`
- Node: `v22.23.1`
- npm install: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity: **PASS**
- npm run typecheck: **FAIL (2)**
- npm run test: **PASS**
- npm run build: **FAIL (1)**

Expected archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

Actual archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

## install output

```text

added 70 packages in 9s

```

## typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/library/backup.ts(197,82): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'string'.

```

## test output

```text

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 73[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 310[2mms[22m[39m
     [33m[2m✓[22m[39m is the exact audited ZIP and indexes all supported banks [33m 308[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m      Tests [22m [1m[32m37 passed[39m[22m[90m (37)[39m
[2m   Start at [22m 09:31:43
[2m   Duration [22m 1.43s[2m (transform 497ms, setup 0ms, import 871ms, tests 625ms, environment 2ms)[22m


```

## build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build

src/library/backup.ts(197,82): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'string'.

```
