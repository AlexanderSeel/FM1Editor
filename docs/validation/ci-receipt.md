# CI validation receipt

- Validation revision: `6`
- Validated commit: `c69483daf264a6b6cd5f2a8b60ebd82dc8fa07b0`
- Node: `v22.23.1`
- npm install: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity: **PASS**
- npm run typecheck: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Expected archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

Actual archive SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`

## install output

```text

added 70 packages in 15s

```

## typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false


```

## test output

```text

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 238[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 285[2mms[22m[39m

[2m Test Files [22m [1m[32m15 passed[39m[22m[90m (15)[39m
[2m      Tests [22m [1m[32m40 passed[39m[22m[90m (40)[39m
[2m   Start at [22m 09:49:05
[2m   Duration [22m 1.27s[2m (transform 367ms, setup 0ms, import 651ms, tests 710ms, environment 2ms)[22m


```

## build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build

[36mvite v8.2.0 [32mbuilding client environment for production...[36m[39m
[2Ktransforming...✓ 55 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.55 kB │ gzip:  0.34 kB
dist/assets/index-DDT8VE7t.css   36.92 kB │ gzip:  7.04 kB
dist/assets/index-A4RsAX4u.js   302.83 kB │ gzip: 92.15 kB

[32m✓ built in 203ms[39m

```
