# External audio-reconstruction upstream and license audit

Status: **research-only; no external model/runtime admitted**

This audit records the exact upstream revisions reviewed for the Audio → FM reconstruction roadmap. It deliberately separates source-code licensing from synthesizer plug-ins, model checkpoints, training datasets, preset libraries, demo audio and preprocessing outputs. A repository-level open-source license is not treated as permission for independently hosted weights or datasets.

## Admission rules

Before any external implementation, model, checkpoint, dataset or preprocessing pipeline is copied into or downloaded by FM1 Editor:

1. pin the exact upstream repository and commit or immutable artifact hash;
2. identify the license for the specific files/artifact, not merely the surrounding repository;
3. preserve required attribution/NOTICE material;
4. audit training/preset/audio datasets separately;
5. keep GPL plug-in/application code outside the current Apache/MSFA browser-engine boundary unless the application distribution strategy is intentionally changed;
6. do not ship or fetch checkpoints whose redistribution/use terms are absent or ambiguous;
7. prefer reproducing ideas against FM1 Editor's repository-owned semantic `Dx7Voice`, deterministic renderer and synthetic fixtures rather than importing an upstream synthesizer wrapper.

## Sound2Synth

Pinned research repository: `Sound2Synth/Sound2Synth@44d9176176d794f7fe3ec96573ce758f4a56896c`.

Observed boundary:

- The pinned root contains the IJCAI 2022 implementation and setup/training/server instructions, but a root `LICENSE` file is not present at the reviewed revision and repository code search did not expose a project license. **Do not copy or redistribute this source as production code without an explicit license grant.**
- Its dataset-generation instructions explicitly tell users to obtain Dexed preset libraries from online communities or other sources. Those presets are therefore separate third-party inputs whose licenses/provenance are not established by the Sound2Synth repository.
- The README says pretrained checkpoints “may be released in the future”; the reviewed pinned repository does not establish a production checkpoint artifact/license that FM1 Editor can admit.
- The application design uploads a waveform to a Sound2Synth server and automatically reassigns Dexed parameters. FM1 Editor must not inherit either behavior silently: local processing remains default, server upload requires explicit future consent, and generated patches are never auto-sent/loaded.

Pinned modified plug-in repository: `Sound2Synth/Sound2Synth-Plug-Ins@560ba5772118712eca78a3583023c366817fcfa9`.

- The included `Dexed/README.md` explicitly states that the Sound2Synth Dexed modification is governed by **GNU GPL v3.0** and that modifications are labeled accordingly.
- The same README distinguishes Dexed's GPLv3 application/plugin wrapper from its Apache-2.0 MSFA component. FM1 Editor already uses a separately audited Apache-only MSFA closure; the Sound2Synth modified Dexed plug-in is **not admitted** as a runtime/build dependency.
- A root repository license was not found at the pinned revision. File-level and inherited Dexed licensing must therefore be respected rather than assuming a permissive license for the whole repository.

Decision: **paper/methodology reference only** until an explicit license exists for any Sound2Synth code/checkpoint artifact proposed for reuse. Do not import the modified Dexed wrapper.

## SpiegeLib / Dexed sound matching

Pinned repository: `hjdeheer/spiegelib@1a3fa1a172c89b869928005874071d0220fc9ccc`.

- Root license: **MIT**.
- The library provides synthesizer dataset generation, VST rendering/control, feature extraction, deep-learning models and evolutionary search; its README points to a Dexed sound-matching example.
- VST control depends on RenderMan, which is a separate dependency and must be audited before production use.
- The pinned HEAD is a merge titled `12 import sound2synth multimodal backbone`. Because the upstream Sound2Synth codebase reviewed above lacks an explicit root license, any SpiegeLib files copied/derived from Sound2Synth require **file-level provenance review** before reuse; SpiegeLib's root MIT file must not be assumed to cure an upstream licensing gap.
- FM1 Editor does not need SpiegeLib to implement the accepted browser-local retrieval/CMA-ES pipeline, so there is no current runtime-admission need.

Decision: **MIT research framework is reference-eligible, but no code is admitted until the relevant file/dependency provenance is checked; Sound2Synth-derived portions are blocked pending clarification.**

## DDX7

Pinned repository: `fcaspe/ddx7@11d04fc16475ff81454f7436f318df9836971a0c`.

- Root license: **Apache-2.0**.
- The repository is the official implementation of “DDX7: Differentiable FM Synthesis of Musical Instrument Sounds”.
- Its README trains on the external **URMP** dataset and uses `torchcrepe` in preprocessing. Apache-2.0 on DDX7 source does not grant rights to URMP recordings, derived datasets, or third-party model artifacts; each must be audited independently before a reproducible training corpus is created or redistributed.
- No production pretrained checkpoint/license is established by the reviewed README. FM1 Editor must therefore treat DDX7 primarily as an architectural/research reference unless a separately licensed checkpoint is selected and hashed.

Decision: **Apache-2.0 source is potentially reusable after dependency/file audit, but no DDX7 code, data or weights are admitted yet.** A future reproduction should use repository-owned/synthetic audio where possible to avoid importing dataset rights into the baseline experiment.

## Magenta DDSP

Pinned repository: `magenta/ddsp@cf5e62dfe5d5c80aa14761832233a2e68e840e53`.

- Root license: **Apache-2.0**, copyright Google LLC.
- The library exposes differentiable synthesizers, filters/effects, spectral losses and training utilities. This makes it useful as a learned/differentiable comparison reference, but it is not a DX7 semantic parameter model by itself.
- The README advertises demos using a selection of pretrained timbre-transfer models. Those remotely supplied model artifacts are not automatically covered merely because the source repository is Apache-2.0; their individual artifact/license metadata must be captured before use.
- DDSP's TensorFlow/Python training stack would also create a separate execution/dependency boundary from the current browser-local TypeScript/WASM baseline.

Decision: **Apache-2.0 concepts/source are eligible for a separately audited experiment, but pretrained models are blocked until artifact-specific licensing and hashes are recorded. No DDSP runtime dependency is currently admitted.**

## Current production decision

The only reconstruction implementations admitted to the application remain repository-owned TypeScript plus the already-audited local MSFA renderer:

- deterministic prepared-reference preprocessing and descriptors;
- deterministic compact catalog fingerprints and local cache;
- nearest-preset retrieval;
- seeded constrained CMA-ES over legal semantic `Dx7Voice` fields.

No Sound2Synth, SpiegeLib, DDX7 or DDSP source, checkpoint, dataset, preset pack, remote inference service or preprocessing output is currently bundled or fetched by the application.

## Reproduction gate still required

The roadmap item remains unresolved until controlled reproductions are recorded. A safe next comparison should:

1. use synthetic ground-truth `Dx7Voice` fixtures rendered by the accepted local engine;
2. record dependency locks and environment identity for each external method;
3. avoid unlicensed community preset/audio datasets;
4. reproduce only code paths whose licenses are explicit;
5. report failures caused by obsolete dependencies/platform assumptions rather than patching upstream silently;
6. record runtime, objective metrics and candidate quality against the existing retrieval/CMA-ES baseline;
7. keep learned initialization behind the same explicit local candidate/audition/load boundary.
