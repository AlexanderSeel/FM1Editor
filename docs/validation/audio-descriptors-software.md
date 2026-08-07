# Audio-to-FM deterministic descriptor validation

Validated source/workflow commit: `2d1292cd5d57767a10b67103b1c37e4b547b7b19`

Overall software gate: **SUCCESS**

## Accepted scope

- One pure TypeScript descriptor function accepts normalized mono Float32 PCM from either prepared reference audio or the deterministic virtual renderer.
- The descriptor schema is versioned as `fm1-editor.audio-descriptors.v1` with an explicit configuration snapshot.
- Amplitude descriptors contain RMS and peak envelopes using deterministic window/hop sizes.
- Spectral descriptors use deterministic Hann-windowed radix-2 FFT at 512, 1024 and 2048 samples by default.
- Long inputs are bounded by deterministic uniform frame sampling rather than allocating an unbounded STFT matrix.
- Every spectral resolution stores sampled log-magnitude STFT frames, 40-band log-mel spectra, 13 MFCCs, centroid, 85% rolloff and spectral flatness plus moments.
- Focused tests prove exact repeatability for identical PCM, 440 Hz localization, envelope tracking, lower tonal than broadband-noise flatness, and fail-closed validation for invalid/non-normalized PCM.
- Source audit, typecheck, lint, full tests and production build passed.

This validates deterministic software descriptors only. Retrieval weighting and similarity metrics remain separate roadmap work.
