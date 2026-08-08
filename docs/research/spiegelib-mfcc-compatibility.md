# SpiegeLib MFCC preprocessing compatibility

FM1 Editor source commit: `e43907c19352e5e76cb5e5c6893cfb9d82d929f1`

Compatibility status: **FAILED**

| Stage | Exit |
| --- | ---: |
| reference | 1 |
| compare | 1 |

- oracle: Python 3.7.7 + Librosa 0.7.2; Numba JIT disabled; native soundfile IO stubbed because the oracle receives an in-memory array
- settings: 44.1 kHz, 2048 FFT, 1024 hop, 13 MFCC, one-second input

The soundfile stub cannot load or write audio and is unused by the in-memory MFCC calculation. A SUCCESS means the TypeScript extractor matches all 572 Librosa coefficients within the recorded tolerance.


## reference failure tail

```text
sha256:26a6780e2d63eadb8270db4911187cb8b56549618ca86bc323ee83658aa5e6de
Traceback (most recent call last):
  File "/opt/generate.py", line 2, in <module>
    import librosa,numpy as np,scipy
  File "/usr/local/lib/python3.7/site-packages/librosa/__init__.py", line 12, in <module>
    from . import core
  File "/usr/local/lib/python3.7/site-packages/librosa/core/__init__.py", line 126, in <module>
    from .audio import *  # pylint: disable=wildcard-import
  File "/usr/local/lib/python3.7/site-packages/librosa/core/audio.py", line 14, in <module>
    import resampy
  File "/usr/local/lib/python3.7/site-packages/resampy/__init__.py", line 7, in <module>
    from .core import *
  File "/usr/local/lib/python3.7/site-packages/resampy/core.py", line 11, in <module>
    from .interpn import resample_f_s, resample_f_p
  File "/usr/local/lib/python3.7/site-packages/resampy/interpn.py", line 75, in <module>
    nopython=True,
TypeError: guvectorize() missing 1 required positional argument: 'signature'

```

## compare failure tail

```text

```
