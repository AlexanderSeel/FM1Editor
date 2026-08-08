# Learned reconstruction initializer admission review

Last reviewed: 2026-08-08

This review distinguishes a research checkpoint that is publicly usable from a production initializer that can be admitted into FM1 Editor's current reconstruction pipeline.

## Admission criteria

A learned initializer may participate in the repository benchmark or optional acceleration service only when all of the following are true:

1. source implementation has a compatible explicit license;
2. the exact trained checkpoint/weights are published with compatible rights or an equally clear license covering the repository artifacts;
3. checkpoint identity can be pinned by version/hash;
4. preprocessing and inference are reproducible from documented code;
5. output parameters can be mapped deterministically into the current semantic `Dx7Voice` model without guessing byte semantics;
6. unsupported/frozen parameters have an explicit initialization/merge policy;
7. inference does not require an unlicensed/proprietary dependency that prevents reproducible service deployment;
8. the initializer can be evaluated by the same real-reference benchmark used for retrieval and CMA-ES before it is promoted to a production path.

A paper, demo video, code repository without weights, or model that only controls an incompatible synthesizer subset is not sufficient by itself.

## SpiegeLib `vst-fm-sound-match`

Repository:

- https://github.com/spiegelib/vst-fm-sound-match

Current findings:

- the repository identifies itself as MIT licensed;
- its root contains a `saved_models` directory and the README explicitly states that pre-trained models are included and can be used;
- the experiment compares four learned estimators (MLP, LSTM, LSTM++, CNN) against genetic algorithms on Dexed;
- the documented `synth_config.ipynb` workflow selects a **subset of parameters to automatically program and freezes the rest**;
- the documented runtime requires the Dexed VST, Python/SpiegeLib and RenderMan rather than the repository's browser MSFA engine or the current optional accelerator contract.

Decision: **admissible research checkpoint candidate, not yet an FM1 Editor learned initializer**.

The MIT repository plus included saved models is materially stronger license evidence than a paper-only result. However, the checkpoint cannot be inserted into the current comparison row until its exact saved-model files are pinned/hashes recorded, the trained input/output tensors are reproduced, the selected/frozen Dexed parameter subset is mapped into `Dx7Voice`, and a deterministic merge policy is defined for every untouched semantic parameter. Its desktop VST/RenderMan dependencies also need to be separated from any eventual service implementation.

A future repository-side admission task may therefore reproduce one included model in an isolated research environment and write a conversion/compatibility report. Do not label the current benchmark's `learned-initialization` row as available until that mapping exists.

## Sound2Synth

Repositories:

- https://github.com/Sound2Synth/Sound2Synth
- https://github.com/Sound2Synth/Sound2Synth-Plug-Ins

Current findings:

- the public code repository implements training, server and plug-in integration for Dexed parameter estimation;
- it documents a model/server architecture and the IJCAI 2022 result;
- the README currently states that a trained model is required for the server and that **pre-trained checkpoints may be released in the future**;
- the repository therefore does not currently provide the production-ready checkpoint that FM1 Editor would need to pin and benchmark;
- the public repository page reviewed on 2026-08-08 does not present a root license for the model code/weights comparable to the explicit MIT license shown by SpiegeLib;
- dataset generation also depends on separately obtained Dexed preset libraries, so dataset provenance must remain distinct from code/model licensing.

Decision: **not admissible as a checkpoint dependency**. Continue using it as research evidence that learned Dexed parameter estimation is feasible, but do not construct a production model dependency from the paper/code alone.

## DDX7 and DDSP

DDX7 and Magenta DDSP remain useful differentiable-resynthesis references, but neither is a complete drop-in initializer for the standard Yamaha 155-byte voice semantic model used by FM1 Editor. Their reproduction/licensing status is documented elsewhere in the repository. They should not be relabeled as a full DX7 learned initializer merely because they provide differentiable FM/audio modeling components.

## Current decision

The repository now has a **license-credible research checkpoint candidate** in SpiegeLib, but no learned initializer is admitted into the product benchmark yet.

Before changing the benchmark row from explicitly unavailable, complete all of the following repository-side work for one pinned SpiegeLib saved model:

- record upstream commit and model-file SHA-256;
- reproduce preprocessing/inference in an isolated environment;
- document exact predicted Dexed parameter subset, ranges and encoding;
- map each predicted parameter to the current semantic `Dx7Voice` fields;
- define values/merge behavior for frozen and unsupported fields;
- produce a standards-valid 155-byte candidate voice from the mapped output;
- run synthetic compatibility checks and then the same real-reference 2+2+2 benchmark;
- only then decide whether the optional accelerator should host the model.

Until that work is complete, the existing `learned-initialization` comparison row must continue to fail explicitly rather than silently substituting another method.
