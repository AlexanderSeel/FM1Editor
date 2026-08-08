# SpiegeLib MFCC preprocessing compatibility

FM1 Editor source commit: `1381d840a626f58cc0ad272999f61fa8fb150b88`

Compatibility status: **FAILED**

| Stage | Exit |
| --- | ---: |
| reference | 1 |
| compare | 1 |

- oracle: Python 3.7.7 + Librosa 0.7.2; Numba JIT disabled only to avoid old cache initialization
- settings: 44.1 kHz, 2048 FFT, 1024 hop, 13 MFCC, one-second input

The historical container writes only its JSON oracle to stdout. A SUCCESS means the TypeScript extractor matches all 572 Librosa coefficients within the recorded tolerance.


## reference failure tail

```text
sha256:0aec1bb092e0759c8ad02d76339b4dd4c85f7dfbe9ea962e5fd315e7567c8609
Traceback (most recent call last):
  File "/opt/generate.py", line 2, in <module>
    import librosa,numpy as np,scipy
  File "/usr/local/lib/python3.7/site-packages/librosa/__init__.py", line 12, in <module>
    from . import core
  File "/usr/local/lib/python3.7/site-packages/librosa/core/__init__.py", line 126, in <module>
    from .audio import *  # pylint: disable=wildcard-import
  File "/usr/local/lib/python3.7/site-packages/librosa/core/audio.py", line 10, in <module>
    import soundfile as sf
  File "/usr/local/lib/python3.7/site-packages/soundfile.py", line 142, in <module>
    raise OSError('sndfile library not found')
OSError: sndfile library not found

```

## compare failure tail

```text

```
