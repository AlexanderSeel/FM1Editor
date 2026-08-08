# SpiegeLib MFCC preprocessing compatibility

FM1 Editor source commit: `014583f7536ba7f022460c055624de8965b9e90c`

Compatibility status: **FAILED**

| Stage | Exit |
| --- | ---: |
| reference | 1 |
| compare | 1 |

- oracle: Python 3.7.7 + Librosa 0.7.2; Numba JIT disabled
- unused native soundfile IO and Resampy imports are stubbed; the oracle receives an in-memory 44.1 kHz array and never calls either path
- settings: 44.1 kHz, 2048 FFT, 1024 hop, 13 MFCC, one-second input

A SUCCESS means the independent TypeScript extractor matches all 572 historical Librosa coefficients within the recorded tolerance.


## reference failure tail

```text
sha256:0f0fe2898d6c5eaa9ecab605f715013cebc5af65cf824bf672ac73ec129db333
Traceback (most recent call last):
  File "/opt/generate.py", line 2, in <module>
    import librosa,numpy as np,scipy
  File "/usr/local/lib/python3.7/site-packages/librosa/__init__.py", line 12, in <module>
    from . import core
  File "/usr/local/lib/python3.7/site-packages/librosa/core/__init__.py", line 126, in <module>
    from .audio import *  # pylint: disable=wildcard-import
  File "/usr/local/lib/python3.7/site-packages/librosa/core/audio.py", line 30, in <module>
    BW_BEST = resampy.filters.get_filter('kaiser_best')[2]
AttributeError: module 'resampy' has no attribute 'filters'

```

## compare failure tail

```text

```
