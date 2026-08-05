# CI validation receipt

Validated on GitHub Actions with Node `v22.23.1`.

- Validated commit: `4f085a18593558c2c3655ffac64b4d2106d0610f`
- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Validated FM-1 transfer boundary:

- unsafe isolated single-voice and byte-index parameter-stream transports are removed from the UI and transfer module;
- one selected slot is merged into a complete 32-voice base bank;
- the encoded transfer is one checksum-valid 4,104-byte Yamaha DX7 bank message;
- bank A/B/C/D plus slot 1–32 resolves to preset 1–128;
- the UI requires an explicit whole-bank overwrite confirmation and retains base/merged bank export;
- preset recall and virtual-piano note audition remain available.

## typecheck output

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false


```

## lint output

```text

> fm1-editor@0.1.0 lint
> eslint src vite.config.ts


```

## test output

```text

> fm1-editor@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

 [32m✓[39m src/sysex/dx7.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/catalog/patchCatalog.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/library/backup.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/midi/fm1BankTransfer.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/sysex/importSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/library/storageMigration.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/library/model.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/midi/voiceAudition.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/monitor.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/catalog/catalogManifest.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/midi/fm1Protocol.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/midi/fxProtocol.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/midi/sequenceScheduler.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/catalog/remoteSysex.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 40[2mms[22m[39m
 [32m✓[39m src/catalog/trackedArchive.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 183[2mms[22m[39m
 [32m✓[39m src/domain/bank.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m      Tests [22m [1m[32m46 passed[39m[22m[90m (46)[39m
[2m   Start at [22m 10:58:00
[2m   Duration [22m 989ms[2m (transform 330ms, setup 0ms, import 578ms, tests 392ms, environment 2ms)[22m


```

## build output

```text

> fm1-editor@0.1.0 prebuild
> node scripts/sync-patch-catalog.mjs --best-effort

Patch catalog synchronized: 35 website banks merged with the tracked sysexFinal.zip.

> fm1-editor@0.1.0 build
> tsc -b && vite build

[36mvite v8.2.0 [32mbuilding client environment for production...[36m[39m
[2Ktransforming...✓ 56 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.55 kB │ gzip:  0.34 kB
dist/assets/index-Db6y5iBn.css   38.23 kB │ gzip:  7.17 kB
dist/assets/index-DsyoPw18.js   309.39 kB │ gzip: 93.81 kB

[32m✓ built in 161ms[39m

```
