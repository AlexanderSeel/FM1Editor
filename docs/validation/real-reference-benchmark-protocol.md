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

Older exported receipts created before learned-model admission may still contain the explicit unavailable learned row. The aggregator accepts those for provenance/history, but they cannot satisfy current closure readiness. The final retained 2+2+2 evidence set must be rerun with successful current learned rows so all three approaches are measured on the same references.

## Per-reference procedure

1. Open the audio-to-FM reference workspace and prepare the desired region.
2. Verify the displayed duration, detected/manual pitch and SHA-256-backed file identity.
3. In **Comparison receipt · real isolated reference**, confirm the isolation declaration.
4. Run the quick benchmark first. Run the full bundled-catalog benchmark for the final retained receipt when browser performance permits.
5. Confirm that retrieval, seeded CMA-ES and **SpiegeLib learned** each have a result row. The learned row should contain one candidate and no failure.
6. Confirm the **Exact benchmark winners · reproducible listening** controls are present for retrieval, CMA and learned. These voices are the exact semantic candidates at the best indices recorded in the metrics.
7. While the reference is still loaded, listen to the exact retrieval and refined CMA winners, then choose the structured **Retrieval / CMA listening** verdict.
8. Listen to the exact learned winner against the better local alternative and choose the structured **Learned listening** verdict: learned best, perceptually similar, clearly worse, or poor/out-of-scope.
9. Export the JSON receipt only after confirming all three exact winner voices are retained; the receipt contains semantic DX7 parameters but no raw reference audio or packed catalog bytes.
10. Use optional notes for concrete perceptual details such as attack, decay, brightness, pitch character, noise/transient mismatch or the fixed-base learned-model limitation.
11. Keep the reference file outside the repository unless its redistribution rights are explicit. The repository needs the receipt/hash and summary, not copyrighted source audio.

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
- exact semantic DX7 winner voice, source label and recorded best distance for each successful retrieval/CMA/learned row;
- no embedded raw audio samples and no packed/unpacked catalog provenance bytes.

The learned source/status should identify the admitted local SpiegeLib simple-FM MLP and its nine-OP2-controls + fixed-training-base limitation. A learned failure is evidence and must not be silently replaced by another approach, but a receipt with no successful learned row cannot satisfy the current final-evidence closure gate.

## Aggregate evidence requirements

Import the retained JSON receipts into the in-app **Evidence set · aggregate real-reference receipts** panel, assign the three evidence classes and complete both structured listening fields.

The aggregate remains privacy-safe and stores classifications, metrics, runtimes, listening verdicts and optional notes, not raw reference samples. It reports:

- category counts for the 2+2+2 minimum set;
- median/range for retrieval, CMA and successful learned distances;
- median/range for retrieval, CMA and successful learned runtimes;
- CMA metric-improvement count/rate;
- retrieval/CMA listening outcomes and metric/listening disagreement count;
- learned success/unavailable/failure counts;
- learned listening counts for best, similar, worse and poor/out-of-scope outcomes.

### Closure readiness

The panel may report **Current three-way mixed evidence set complete** only when all of the following are true:

1. at least two retained receipts exist in each of the three evidence classes;
2. no retrieval/CMA listening assessment is `not-assessed`;
3. no successful learned row has a `not-assessed` learned listening verdict;
4. every retained receipt contains a successful current admitted learned row;
5. every retained receipt contains all three exact semantic winner voices matching the recorded best indices/distances/source labels, so the listening evidence is reproducible.

Legacy blocked learned receipts remain parseable and can be inspected, but `currentThreeWayComplete` is false while any such receipt remains in the retained aggregate.

## Closure artifact export

When the aggregate is closure-ready, export both artifacts from the evidence panel:

1. **Export aggregate JSON** — the machine-readable aggregate used as the evidence source of truth;
2. **Export closure Markdown + SHA-256** — a repository-ready summary containing the SHA-256 of the exact UTF-8 JSON serialization exported by the panel.

Both exports use the same aggregate serialization function. The SHA-256 in the Markdown therefore identifies the exact aggregate JSON bytes, including the trailing newline; do not reformat the JSON before verifying or committing the pair.

The generated Markdown contains:

- aggregate schema, creation time, receipt count and aggregate JSON SHA-256;
- 2+2+2/current-three-way closure state;
- distance and runtime median/range for all three approaches;
- CMA metric/listening summary;
- structured learned listening distribution;
- every retained reference filename/SHA/class/metrics/listening verdict and optional note;
- the interpretation/privacy boundary.

The Markdown exporter fails closed while `readyForAggregateEvidence` is false, so a historical or incomplete set cannot be accidentally emitted as final closure evidence.

## Closing the PLAN item

Commit the six exact per-reference benchmark receipt JSON files, the unmodified exported aggregate JSON and its generated closure Markdown together. The aggregate rows contain the receipt SHA-256 values, so the exact winner-bearing receipts used for listening remain cryptographically auditable without committing source audio. The Markdown is the short aggregate validation document; its embedded hash binds it to the JSON evidence.

The roadmap item can be closed when the current three-way mixed real-reference set has been run, both structured listening assessments are complete, the aggregate reports closure ready, and the generated JSON/Markdown hash evidence is committed. Exact reconstruction and learned-model superiority are not acceptance criteria.
