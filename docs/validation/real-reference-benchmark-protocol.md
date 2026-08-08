# Real isolated-sound reconstruction benchmark protocol

This protocol defines the remaining evidence needed to close the real-sound comparison item in `PLAN.md`. It validates reconstruction quality and runtime only; it does not validate physical FM-1 equivalence.

## Preconditions

- Use an uploaded WAV or MP3 file so the app can record a SHA-256 identity for the source.
- Select one short, genuinely isolated sound or note. Do not use a full song, chord, polyphonic mixture, mastered loop, or synthetic ground-truth fixture.
- Keep processing local. The current benchmark must not upload reference audio.
- Override the detected pitch when it is clearly wrong and record that fact in the exported receipt.
- Use the **real isolated reference** declaration only when the selected region actually meets these conditions.

## Evidence set

Use a small but deliberately mixed set rather than only examples that FM synthesis is expected to reproduce well. A useful minimum set contains:

1. at least two sustained electronic/synth tones that are plausibly representable by six-operator sine FM;
2. at least two real pitched acoustic/instrument tones with a stable fundamental;
3. at least two transient, noisy, strongly nonlinear, layered, or otherwise difficult isolated sounds that are expected to expose model limitations.

The set should preferably include more than one pitch register. Do not discard poor results: failure cases are part of the acceptance evidence.

## Per-reference procedure

1. Open the audio-to-FM reference workspace and prepare the desired region.
2. Verify the displayed duration, detected/manual pitch and SHA-256-backed file identity.
3. In **Comparison receipt · real isolated reference**, confirm the isolation declaration.
4. Run the quick benchmark first. Run the full bundled-catalog benchmark for the final retained receipt when browser performance permits.
5. Export the JSON receipt.
6. Listen to the best retrieval and refined candidate separately from the numerical score. Record obvious perceptual mismatches in the accompanying summary.
7. Keep the reference file outside the repository unless its redistribution rights are explicit. The repository needs the receipt/hash and summary, not copyrighted source audio.

## Required report fields

Each retained receipt must contain:

- reference filename and SHA-256;
- selected region, sample rate, duration and pitch metadata;
- catalog scope/candidate count and standardized render probe;
- deterministic CMA-ES seed and constrained parameter group;
- retrieval-only candidate count, best distance and runtime;
- evolutionary candidate count, best distance and runtime;
- learned-initialization status/failure;
- retrieval-minus-evolutionary distance delta;
- no embedded raw audio samples.

## Closing the PLAN item

Create a short aggregate validation document that lists every retained receipt and reports:

- median and range of retrieval and evolutionary distances;
- median and range of runtimes;
- how often constrained CMA-ES improved the retrieval start;
- cases where the metric improved but listening quality did not;
- clear failure classes and known six-operator-FM limitations;
- learned-initialization results only if a separately license-admitted implementation/checkpoint has been added. Until then, retain the explicit unavailable row rather than substituting an unreviewed model.

The roadmap item can be closed when the mixed real-reference set has been run and the aggregate evidence is committed. Exact reconstruction is not an acceptance criterion.
