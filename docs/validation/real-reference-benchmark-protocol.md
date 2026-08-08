# Real isolated-sound reconstruction benchmark protocol

This protocol defines the remaining evidence needed to close the real-sound comparison item in `PLAN.md`. It validates reconstruction quality and runtime only; it does not validate physical FM-1 equivalence.

## Preconditions

- Use an uploaded WAV or MP3 file so the app can record a SHA-256 identity for the source.
- Select one short, genuinely isolated sound or note. Do not use a full song, chord, polyphonic mixture, mastered loop, or synthetic ground-truth fixture.
- Keep processing local. Retrieval, constrained CMA-ES and the admitted SpiegeLib learned initializer all run locally; the benchmark must not upload reference audio.
- Override the detected pitch when it is clearly wrong and record that fact in the exported receipt.
- Use the **real isolated reference** declaration only when the selected region actually meets these conditions.

## Evidence set

Use a small but deliberately mixed set rather than only examples that FM synthesis is expected to reproduce well. The minimum retained set contains:

1. at least two sustained electronic/synth tones that are plausibly representable by six-operator sine FM;
2. at least two real pitched acoustic/instrument tones with a stable fundamental;
3. at least two transient, noisy, strongly nonlinear, layered, or otherwise difficult isolated sounds that are expected to expose model limitations.

The set should preferably include more than one pitch register. Do not discard poor results: failure cases are part of the acceptance evidence.

## Compared approaches

Each current receipt compares the same reference against three distinct approaches:

- **retrieval only** — ranked bundled-catalog candidates;
- **seeded constrained CMA-ES** — repository-defined refinement from retrieval starts;
- **SpiegeLib learned initialization** — one local simple-FM MLP candidate predicting nine historical Dexed OP2 controls over its fixed training base.

The learned row is intentionally not CMA-refined. It is not a full 155-parameter DX7 predictor and must not be described as original-patch recovery. Its preprocessing/model admission is documented in [`../research/learned-initializer-admission.md`](../research/learned-initializer-admission.md) and [`spiegelib-learned-benchmark-admission.md`](./spiegelib-learned-benchmark-admission.md).

Older exported receipts created before learned-model admission may still contain the explicit unavailable learned row. The aggregator accepts those for provenance/history, but the final retained 2+2+2 evidence set should be rerun with the admitted learned row so all three current approaches are measured on the same references.

## Per-reference procedure

1. Open the audio-to-FM reference workspace and prepare the desired region.
2. Verify the displayed duration, detected/manual pitch and SHA-256-backed file identity.
3. In **Comparison receipt · real isolated reference**, confirm the isolation declaration.
4. Run the quick benchmark first. Run the full bundled-catalog benchmark for the final retained receipt when browser performance permits.
5. Confirm that retrieval, seeded CMA-ES and **SpiegeLib learned** each have a result row. The learned row should contain one candidate and no failure.
6. Export the JSON receipt.
7. Listen to the best retrieval, refined CMA and learned candidate separately from the numerical score. The aggregate panel currently records one listening assessment focused on retrieval-versus-CMA; use the notes field to record whether the learned candidate is perceptually better, similar, worse, or clearly outside its nine-control/fixed-base scope.
8. Keep the reference file outside the repository unless its redistribution rights are explicit. The repository needs the receipt/hash and summary, not copyrighted source audio.

## Required report fields

Each retained current receipt must contain:

- reference filename and SHA-256;
- selected region, sample rate, duration and pitch metadata;
- catalog scope/candidate count and standardized render probe;
- deterministic CMA-ES seed and constrained parameter group;
- retrieval-only candidate count, best distance and runtime;
- evolutionary candidate count, best distance and runtime;
- learned candidate count, best distance, runtime and source/status;
- retrieval-minus-evolutionary distance delta;
- no embedded raw audio samples.

The learned source/status should identify the admitted local SpiegeLib simple-FM MLP and its nine-OP2-controls + fixed-training-base limitation. A learned failure is evidence and must not be silently replaced by another approach.

## Closing the PLAN item

Before creating the final aggregate validation document, import the retained JSON receipts into the in-app **Evidence set · aggregate real-reference receipts** panel, assign the three evidence classes and listening assessments, add learned perceptual notes, and export the aggregate JSON. The panel must report **Minimum mixed evidence set complete**.

Create a short aggregate validation document that lists every retained receipt and reports:

- median and range of retrieval, evolutionary and learned distances;
- median and range of retrieval, evolutionary and learned runtimes;
- how often constrained CMA-ES improved the retrieval start;
- cases where the metric improved but listening quality did not;
- learned success/failure counts and cases where the learned metric disagrees with perceptual notes;
- clear failure classes and known six-operator-FM / fixed-base learned-model limitations.

The roadmap item can be closed when the mixed real-reference set has been run with the current three-way benchmark, listening assessments/notes are complete, and the aggregate evidence is committed. Exact reconstruction and learned-model superiority are not acceptance criteria.
