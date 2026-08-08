# Learned reconstruction initializer admission review

Last reviewed: 2026-08-08

This review distinguishes research checkpoints from learned initializers that are permitted to participate in FM1 Editor's reconstruction benchmark. Admission is intentionally narrower than claiming a full DX7 patch predictor or physical FM-1 equivalence.

## Admission criteria

A learned initializer may participate in the repository benchmark or optional acceleration service only when all of the following are true:

1. source implementation has a compatible explicit license;
2. the exact trained checkpoint/weights are published with compatible rights or an equally clear license covering the repository artifacts;
3. checkpoint identity can be pinned by version/hash;
4. preprocessing and inference are reproducible from documented code;
5. output parameters can be mapped deterministically into the current semantic `Dx7Voice` model without guessing byte semantics;
6. unsupported/frozen parameters have an explicit initialization/merge policy;
7. inference does not require an unlicensed/proprietary dependency that prevents reproducible product use;
8. the initializer can be evaluated by the same real-reference benchmark used for retrieval and CMA-ES before stronger quality claims are made.

A paper, demo video, code repository without weights, or model with ambiguous parameter semantics is not sufficient by itself.

## SpiegeLib `vst-fm-sound-match`

Repository:

- https://github.com/spiegelib/vst-fm-sound-match

Decision: **admitted as a local benchmark initializer with explicit scope limits**.

The admitted path is the repository's `simple_fm_mlp.h5` experiment pinned at upstream commit `e1baab7fbeb0bc3f4d4946f8348e77dd18028080`.

### Provenance and conversion

- upstream repository/model code: MIT;
- source H5 SHA-256: `96f1d58d3190fc7590f62d1293bb5d39d4d1dbde74c1a754ad5c576c26c32c4f`;
- the H5 Dense network is converted into browser-safe plain tensor JSON and audited by `npm run audit:learned-assets`;
- archived experiment MFCC scaler: Zenodo DOI `10.5281/zenodo.3722784`, CC BY 4.0;
- archived scaler SHA-256: `99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4`;
- converted scaler JSON SHA-256: `77494299cad04042c96574676eb9a573f534a0e83e2574683b661678b065f532`;
- required attribution is shipped in `THIRD_PARTY_NOTICES.md` and checked by the learned-asset audit.

The original scaler pickle is not a runtime dependency. It was converted in an isolated no-network, read-only, capability-dropped container; product code consumes the validated plain JSON derivative only.

### Historical preprocessing reproduction

The input pipeline is reproduced against Python 3.7.7 + Librosa 0.7.2 with the original one-second, 44.1 kHz, 2048-FFT, 1024-hop, 128-mel-band, 13-MFCC settings.

The independent 572-value numerical oracle in [`spiegelib-mfcc-compatibility.md`](./spiegelib-mfcc-compatibility.md) passes on the admitted repository implementation with:

- max absolute error: `0.00006103515625`;
- RMS error: `0.000007441914126331733`.

A later experimental duplicate that treated Librosa 0.7.2 `norm=1` as discrete L1 filter normalization was rejected and removed. Librosa 0.7.2's historical mel implementation applies the same Slaney-area factor for `norm=1` and `norm='slaney'`; the admitted implementation is the one proven by the oracle.

### Output scope and semantic mapping

The trained MLP has 572 inputs and nine normalized outputs. The historical training and prediction paths both resolve to the same Dexed host-parameter order:

`[46, 47, 48, 50, 51, 52, 55, 56, 57]`

Those values map to:

- OP2 EG rates 2, 3 and 4;
- OP2 EG levels 2, 3 and 4;
- OP2 frequency coarse;
- OP2 frequency fine;
- OP2 oscillator detune.

The values are quantized with the historical Dexed host-control semantics and merged into the pinned simple-FM training base. All other DX7 fields stay at that explicit fixed base. The semantic result is validated by the Yamaha single-voice encoder and produces exactly 155 voice-data bytes.

This is therefore **not a general 155-parameter learned DX7 predictor**. It is a nine-control learned initializer over a fixed training state.

### Product/benchmark boundary

The admitted initializer:

- runs completely locally in the browser;
- uploads no reference audio;
- is dynamically imported only when the real-reference benchmark runs;
- is not bundled into the initial application entry chunk;
- produces exactly one learned benchmark candidate;
- is scored independently from retrieval and CMA-ES;
- is not silently CMA-refined;
- is described as comparative reconstruction evidence, not original-patch recovery or FM-1 hardware equivalence.

The exact integrated acceptance is recorded in [`../validation/spiegelib-learned-benchmark-admission.md`](../validation/spiegelib-learned-benchmark-admission.md). That receipt covers clean install, provenance audits, typecheck, lint, MFCC oracle test, candidate test, benchmark/aggregate tests, full suite, production build and lazy-bundle isolation.

The remaining quality decision now belongs to the real 2+2+2 isolated-sound evidence set. The model's admission does not imply that it outperforms retrieval or constrained CMA-ES.

## Sound2Synth

Repositories:

- https://github.com/Sound2Synth/Sound2Synth
- https://github.com/Sound2Synth/Sound2Synth-Plug-Ins

Current findings:

- the public code repository implements training, server and plug-in integration for Dexed parameter estimation;
- it documents a model/server architecture and the IJCAI 2022 result;
- the README reviewed on 2026-08-08 states that a trained model is required for the server and that pre-trained checkpoints may be released in the future;
- the repository therefore does not currently provide an independently admitted checkpoint comparable to the pinned SpiegeLib asset;
- the public repository page reviewed on 2026-08-08 does not present a root license for model code/weights comparable to the explicit MIT evidence used for SpiegeLib;
- dataset generation also depends on separately obtained Dexed preset libraries, so dataset provenance must remain distinct from code/model licensing.

Decision: **not admitted as a checkpoint dependency**. It remains research evidence that learned Dexed parameter estimation is feasible.

## DDX7 and DDSP

DDX7 and Magenta DDSP remain useful differentiable-resynthesis references, but neither is a complete drop-in initializer for the standard Yamaha 155-byte voice semantic model used by FM1 Editor. Their reproduction/licensing status is documented elsewhere in the repository. They should not be relabeled as a full DX7 learned initializer merely because they provide differentiable FM/audio modeling components.

## Current decision

FM1 Editor now has one license-admitted, reproducible learned benchmark initializer: the local SpiegeLib simple-FM MLP described above.

Promotion beyond that boundary requires real-reference evidence. Run the same mixed 2+2+2 isolated-sound benchmark used for retrieval and CMA-ES, retain poor results, complete listening assessments and compare quality/runtime before changing reconstruction strategy or justifying a remote accelerator.
