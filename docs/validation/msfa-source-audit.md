# MSFA source-boundary audit receipt

Date: 2026-08-07

Pinned upstream: `asb2m10/dexed@2e182b3db85c09083ab13c8b9b00565ce7d9ff85`

Machine-readable audit: [`../research/msfa-source-audit.json`](../research/msfa-source-audit.json)

Local manifest/source verifier: [`../../scripts/verify-msfa-source-audit.mjs`](../../scripts/verify-msfa-source-audit.mjs)

Pinned network audit: [`../../scripts/audit-msfa-upstream.mjs`](../../scripts/audit-msfa-upstream.mjs)

## Result

The feasibility source boundary is defined, but **no third-party synthesis source is vendored yet**. This receipt does not approve the complete Dexed application and does not claim that WebAssembly audio has been rendered.

The pinned Dexed repository is GPL-3.0 at the application level. The reviewed low-level MSFA files in the candidate set carry Apache-2.0 headers. The candidate set is therefore admitted only file-by-file; directory membership is not treated as sufficient licensing evidence.

## Resolved transitive boundary

The minimal dry renderer will not compile or copy:

- `Source/Dexed.h` or the Dexed plugin/application wrapper;
- `Source/msfa/tuning.h` or `Source/msfa/tuning.cc`;
- JUCE;
- MTS-ESP;
- `surge-synthesizer/tuning-library`;
- Dexed UI, effects, cartridge, SysEx UI or plugin-format code.

For the initial standard-tuning renderer, FM1 Editor will own a small 12-TET adapter. Microtuning is explicitly deferred.

Three Apache-marked integration points require derived copies rather than blind copying:

1. `env.cc` includes GPL-licensed `../Dexed.h`; that include must be removed.
2. `controllers.h` includes GPL-licensed `../Dexed.h`; the derived renderer header must remove it and retain only state needed by the dry engine.
3. `dx7note.h/.cc` depend on the current tuning/MTS-ESP path; the feasibility copy must remove those optional dependencies while preserving the standard 12-TET note-frequency behavior.

`fm_core.h` is also marked patch-required so the isolated build can remove its unnecessary controller include when the bridge supplies controller state directly.

## Candidate set

The audit currently records 23 candidate source/header files from `Source/msfa`, each pinned by its upstream Git blob SHA-1 and a file-level Apache-2.0 conclusion. The set contains the oscillator lookup tables, envelopes, LFO, FM operator kernel, FM core, pitch envelope, portamento and the narrowly patched note/controller integration needed by the feasibility renderer.

SHA-256 fields intentionally remain empty while distribution status is `not-vendored`.

A networked checkout can verify the exact pinned raw files and print SHA-256 values without retaining source:

```bash
npm run audit:virtual-dx7:upstream
```

After reviewing that output, the same command can explicitly update only the manifest hash fields:

```bash
npm run audit:virtual-dx7:upstream -- --write-hashes
```

The updater does not store MSFA source files. It fetches the exact commit paths, reconstructs and checks each Git blob SHA-1, checks the Apache header, computes SHA-256 and refuses mismatches before modifying the manifest.

Once hashes are recorded, the verifier can be pointed at an exact local checkout:

```bash
npm run audit:virtual-dx7 -- --source-root /path/to/dexed --require-hashes
```

Any later derived file must retain its original Apache-2.0 header, document its modifications and separately record the derived-file hash.

## Automated guard

`npm run audit:virtual-dx7` is part of the normal verification path and the read-only CI workflow. It checks the policy manifest without adding a network dependency to normal builds. With `--source-root`, it additionally:

- reconstructs each Git blob identity and compares it with the pinned upstream blob SHA;
- checks the Apache-2.0 header;
- computes and compares SHA-256 values;
- rejects path traversal outside the supplied source root;
- rejects undeclared forbidden dependency crossings;
- refuses `copy-unmodified` status for files that contain forbidden GPL/JUCE/MTS/tuning includes.

`audit:virtual-dx7:upstream` is intentionally **not** part of normal CI or `release:verify`; it is an explicit provenance operation against a pinned external repository and cannot silently update hashes unless `--write-hashes` is supplied.

## Execution evidence

The connected execution container cannot resolve `github.com`, so the networked upstream audit was not run here and no SHA-256 values were invented. The connected GitHub API was used to inspect the pinned files and commit the policy/automation only. Full repository validation must come from GitHub Actions or a networked local checkout.

## Remaining gate before engine import

Do not vendor MSFA source until all of the following are recorded:

- SHA-256 for every candidate source/header;
- the exact derived-file plan and hashes for patched files;
- Apache-2.0 license text;
- NOTICE/attribution obligations for retained copyright holders;
- a passing source-root audit against the exact pinned checkout.

Only after that gate should the repository add the FM1 Editor-owned C/C++ bridge and reproducible Emscripten build.
