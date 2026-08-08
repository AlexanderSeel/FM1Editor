# SpiegeLib MFCC preprocessing compatibility

FM1 Editor source commit: `cee03fc97b0b5cdb3f26055a2d80bc79a4a1e064`

Compatibility status: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| reference | 0 |
| compare | 0 |
| typecheck | 0 |
| lint | 0 |
| candidate | 0 |
| full-test | 0 |
| build | 0 |

- oracle: Python 3.7.7 + Librosa 0.7.2 with in-memory 44.1 kHz input
- Librosa 0.7.2 mel filtering uses its default Slaney-area normalization; `norm=1` and `norm='slaney'` share the same historical area factor in that release
- settings: 2048 FFT, 1024 hop, 128 mel bands, 13 MFCC, one-second input
- fixture SHA-256: `803468ac0db6267959240db65e513862aa430403d1126c51b2d70c91c9cc27be`
- max absolute error: `0.00006103515625`
- RMS error: `0.000007441914126331733`

SUCCESS admits the repository preprocessing path used by Candidate072. The later discrete-L1 MFCC072 experiment was a regression and is not the admitted implementation.

