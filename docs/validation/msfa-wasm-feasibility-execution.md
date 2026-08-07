# Isolated MSFA WebAssembly feasibility execution

Validated FM1 Editor source commit: `b5a4702f63f7fc9ffa349b5f7fc16c8da8ad6c87`

Pinned MSFA upstream: `asb2m10/dexed@2e182b3db85c09083ab13c8b9b00565ce7d9ff85`
Requested Emscripten SDK image: `emscripten/emsdk:4.0.7`
Resolved Emscripten image digest: `not produced`

Overall offline feasibility gate: **FAILED**

| Check | Result |
| --- | --- |
| dependency install | **SUCCESS** |
| source closure/materialization | **FAILURE** |
| native build | **SKIPPED** |
| native reference render | **SKIPPED** |
| Emscripten image | **SKIPPED** |
| two WASM builds | **SKIPPED** |
| deterministic WASM render | **SKIPPED** |
| native/WASM reference comparison | **SKIPPED** |
| five-second performance | **SKIPPED** |
| bundle-size gate | **SKIPPED** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| full Vitest suite | **SUCCESS** |
| production build | **SUCCESS** |

## Measurements

- WASM build 1 SHA-256: `not produced`
- WASM build 2 SHA-256: `not produced`
- Native reference PCM SHA-256: `not produced`

The source materialization and all engine binaries existed only under the GitHub Actions runner temporary directory. No MSFA source, native executable, WASM binary or generated glue was committed by this workflow.

This validates only the dry offline DX7-compatible feasibility path. It does not run an AudioWorklet and does not validate a physical Yamaha DX7 or M-VAVE FM-1.

The normal `.github/workflows/ci.yml` remains read-only. This temporary workflow removes itself in the result commit.

## Failure log tails

### `materialize.log`

```text
hint: Using 'master' as the name for the initial branch. This default branch name
hint: will change to "main" in Git 3.0. To configure the initial branch name
hint: to use in all of your new repositories, which will suppress this warning,
hint: call:
hint:
hint: 	git config --global init.defaultBranch <name>
hint:
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint:
hint: 	git branch -m <name>
hint:
hint: Disable this message with "git config set advice.defaultBranchName false"
Initialized empty Git repository in /home/runner/work/_temp/dexed/.git/
From https://github.com/asb2m10/dexed
 * branch            2e182b3db85c09083ab13c8b9b00565ce7d9ff85 -> FETCH_HEAD
HEAD is now at 2e182b3 Change runner version from ubuntu-24.04 to ubuntu-22.04

> fm1-editor@0.1.0 audit:virtual-dx7
> node scripts/verify-msfa-source-audit.mjs --source-root /home/runner/work/_temp/dexed --require-hashes

MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
MSFA source audit verified: 23 candidate files, 3 explicit upstream exclusions, distribution=not-vendored.
file:///home/runner/work/FM1Editor/FM1Editor/scripts/materialize-msfa-spike.mjs:61
  if (index < 0) throw new Error(`Expected source fragment not found while patching ${label}`)
                       ^

Error: Expected source fragment not found while patching env.cc standard-library include
    at replaceExact (file:///home/runner/work/FM1Editor/FM1Editor/scripts/materialize-msfa-spike.mjs:61:24)
    at file:///home/runner/work/FM1Editor/FM1Editor/scripts/materialize-msfa-spike.mjs:73:7
    at ModuleJob.run (node:internal/modules/esm/module_job:343:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:681:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)

Node.js v22.23.1
```

