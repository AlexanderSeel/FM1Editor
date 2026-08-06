# Virtual DX7 renderer boundary validation

Date: 2026-08-06

Baseline main head: `360f5d635d64792cb14a67483b9f637248ac9da7`

Implementation commits:

- `716b0029acb3a45dd5484d545406cab8b03d5c98` — semantic render boundary;
- `369c6b7f0bf14268a0a801d89642d2e000195e47` — boundary tests;
- `bbec46a8c6cf8132a976daa4a8e263ee434007bb` — feasibility and license-boundary record;
- `799b359ff5a8180915435a511a482ac64fb10285` — initial validation receipt;
- `44d73406ce475b6a6c5770d3ed9b627c7e313234` — unresolved-only plan refinement.

## Scope

This receipt covers the dependency-free feasibility boundary only. It does not claim that an MSFA engine was compiled, that WebAssembly or an `AudioWorklet` rendered audio, or that any result matches Dexed, a Yamaha DX7 or an M-VAVE FM-1.

Files introduced:

| File | SHA-256 of reviewed content | Purpose |
| --- | --- | --- |
| `src/audio/virtualDx7Engine.ts` | `ea7e6f2e8cf7d28178a409a0bb64ff3f78748e36bb9749bc4151663ce4f3a1b6` | Semantic render plan, deterministic identity, engine interface and PCM validation |
| `src/audio/virtualDx7Engine.test.ts` | `5168ed361ffb547fe6341528a6d0ae3e38104671765f666a9fc1ad0c88cb9fed` | Determinism, metadata exclusion, semantic change, range and PCM tests |

## Boundary assertions

Source review confirms that the new public render boundary:

- accepts `Dx7Voice`, not arbitrary packed/unpacked bytes;
- validates the documented editable semantic ranges before creating a plan;
- snapshots six operators, pitch envelope, algorithm, feedback, key sync, LFO and transpose;
- excludes voice name and `source.packed` / `source.unpacked` from the render identity;
- fixes the feasibility sample rates to 44.1 kHz or 48 kHz;
- includes note, velocity, frame counts and an explicit random seed in the deterministic identity;
- exposes cancellation through `AbortSignal` on the future offline engine interface;
- accepts only dry mono normalized Float32 PCM matching the requested frame count and render key;
- contains no Web MIDI, SysEx, FM-1 parameter write, bank send or automatic hardware action;
- contains no third-party source, WebAssembly binary, model, dataset, patch bank or reference audio.

## Checks performed

| Check | Result | Evidence boundary |
| --- | --- | --- |
| Standalone TypeScript 5.8.3 compile of `virtualDx7Engine.ts` against the current `Dx7Voice` type shape with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` | PASS | Local isolated compiler execution on 2026-08-06; this is not a full repository typecheck |
| Standalone TypeScript syntax/type compile of the test file with a minimal Vitest declaration | PASS | Local isolated compiler execution on 2026-08-06; tests were not executed by this check |
| Isolated runtime smoke of the compiled boundary | PASS | Deterministic plan, metadata exclusion, semantic-change identity, illegal-range rejection and invalid-PCM rejection passed; fixed request produced `dx7-render-v1-37f5d4e6` and 72,000 frames |
| File-content SHA-256 calculation | PASS | Hashes recorded above |
| `npm run typecheck` in the complete repository | NOT RUN | No repository checkout was available in the execution container |
| `npm run lint` | NOT RUN | No repository checkout/dependency installation was available |
| Full `npm run test` | NOT RUN | Test source was added but Vitest was not executed in the repository |
| `npm run build` | NOT RUN | No repository checkout/dependency installation was available |
| Chrome/Edge renderer check | NOT RUN | No renderer, WebAssembly or AudioWorklet exists yet |
| Physical FM-1 / Yamaha DX7 check | NOT APPLICABLE | This boundary has no hardware path and provides no physical validation |

The isolated TypeScript and runtime checks must not be substituted for the required full repository checks. The normal read-only `CI` workflow remains configured to run on pushes to `main`, but no run/status evidence was available through the connected execution interface for the final commit at the time of this receipt. A later commit may update this receipt only when GitHub Actions or a complete local checkout provides command output and commit identity.

## Test source coverage

`src/audio/virtualDx7Engine.test.ts` covers:

1. identical semantic requests create identical plans and render keys;
2. voice name and imported raw source bytes do not affect render identity;
3. a legal semantic change changes render identity;
4. illegal Yamaha-compatible semantic values are rejected;
5. PCM must match plan identity, sample rate, mono channel count, frame count and normalized finite sample limits.

## Remaining validation

The unresolved feasibility acceptance criteria are maintained in `docs/research/virtual-dx7-renderer-feasibility-spike.md`. They include the complete source/license manifest, reproducible Emscripten build, deterministic PCM hash, trusted MSFA/Dexed reference comparison, AudioWorklet execution and Chrome/Edge soak evidence.
