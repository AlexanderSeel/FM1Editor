# Reference-audio fundamental pitch regression

Source commit: `27365653865565f879701b0b4bfb3a6989389bda`

Overall software gate: **SUCCESS**

The local autocorrelation estimator now records the correlation curve and selects the earliest strong local peak within 98% of the global maximum. This prevents later integer-period multiples from winning by tiny PCM-quantization differences and being reported as subharmonics.

A regression reproduces the browser fixture: 440 Hz, PCM16-like quantization, 100 ms leading/trailing silence, local silence trimming and normalization. The detected pitch remains in the 436–444 Hz A4 range rather than the observed 109.98 Hz fourth-period subharmonic.

Typecheck, lint, focused reference-audio tests, the full test suite and production build passed. This is a local analysis fix only; no hardware claim is made.
