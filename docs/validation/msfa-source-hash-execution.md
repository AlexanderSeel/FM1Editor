# Pinned MSFA source audit execution

Validated FM1 Editor source commit: `1c0387def13c293993a928f6c09ee314e787534a`

Pinned upstream: `asb2m10/dexed@2e182b3db85c09083ab13c8b9b00565ce7d9ff85`

Overall provenance/software gate: **SUCCESS**

| Check | Result |
| --- | --- |
| dependency install | **SUCCESS** |
| local source policy | **SUCCESS** |
| pinned upstream hash audit | **SUCCESS** |
| exact Dexed checkout | **SUCCESS** |
| source-root audit | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| full Vitest suite | **SUCCESS** |
| production build | **SUCCESS** |

Recorded candidate SHA-256 values: **23/23**.

The upstream audit fetched only the exact pinned candidate paths and did not retain MSFA source in the FM1 Editor repository. The source-root audit used a detached temporary checkout under the GitHub Actions runner and verified Git blob identities, file-level Apache-2.0 headers and the recorded SHA-256 values.

This workflow did not compile MSFA, generate WebAssembly, run an AudioWorklet or validate physical Yamaha DX7 / M-VAVE FM-1 audio. Chrome/Edge renderer validation is not applicable until a renderer exists.

The normal `.github/workflows/ci.yml` workflow remains read-only. This temporary write-enabled workflow removes itself in the result commit.
