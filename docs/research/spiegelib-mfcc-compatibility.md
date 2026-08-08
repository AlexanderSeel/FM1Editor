# SpiegeLib MFCC preprocessing compatibility

FM1 Editor source commit: `e8167e0ec8b18a039debb2c331fd172b15595d06`

Compatibility status: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| reference | 0 |
| compare | 0 |

- oracle: Python 3.7.7 + Librosa 0.7.2; Numba JIT disabled
- unused native soundfile IO and Resampy imports are inert stubs; Librosa import-time bandwidth constants use placeholder finite values but no resampling path is invoked
- settings: 44.1 kHz, 2048 FFT, 1024 hop, 13 MFCC, one-second input
- fixture SHA-256: `f95233e6f6f79fd5f4520c476429c7ae93e4caefad1f755df551e1582d90e571`
- max absolute error: `0.00006103515625`
- RMS error: `0.000007443322801521254`

A SUCCESS means the independent TypeScript extractor matches all 572 historical Librosa coefficients within the recorded tolerance.

