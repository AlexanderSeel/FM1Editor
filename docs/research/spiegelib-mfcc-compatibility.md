# SpiegeLib MFCC preprocessing compatibility

FM1 Editor source commit: `3e2886e50bb2707643ec45893a7eba613642e5a5`

Compatibility status: **FAILED**

| Stage | Exit |
| --- | ---: |
| reference | 1 |
| compare | 1 |

- target reference: Python 3.7.7 + Librosa 0.7.2
- settings: 44.1 kHz, 2048 FFT, 1024 hop, 13 MFCC, one-second input

A SUCCESS means the independent TypeScript extractor numerically matches the historical Librosa reference fixture. A FAILED receipt does not admit the learned raw-audio preprocessing path.

## reference failure tail

```text
sha256:911c3445a6b4c84298147b94eefe587fd4fe1a21e6a1556d9730559105b0b3e5
Traceback (most recent call last):
  File "/opt/generate.py", line 3, in <module>
    import librosa, numpy as np, scipy
  File "/usr/local/lib/python3.7/site-packages/librosa/__init__.py", line 12, in <module>
    from . import core
  File "/usr/local/lib/python3.7/site-packages/librosa/core/__init__.py", line 125, in <module>
    from .time_frequency import *  # pylint: disable=wildcard-import
  File "/usr/local/lib/python3.7/site-packages/librosa/core/time_frequency.py", line 11, in <module>
    from ..util.exceptions import ParameterError
  File "/usr/local/lib/python3.7/site-packages/librosa/util/__init__.py", line 77, in <module>
    from .utils import *  # pylint: disable=wildcard-import
  File "/usr/local/lib/python3.7/site-packages/librosa/util/utils.py", line 1825, in <module>
    def __shear_dense(X, factor=+1, axis=-1):
  File "/usr/local/lib/python3.7/site-packages/numba/decorators.py", line 193, in wrapper
    disp.enable_caching()
  File "/usr/local/lib/python3.7/site-packages/numba/dispatcher.py", line 679, in enable_caching
    self._cache = FunctionCache(self.py_func)
  File "/usr/local/lib/python3.7/site-packages/numba/caching.py", line 614, in __init__
    self._impl = self._impl_class(py_func)
  File "/usr/local/lib/python3.7/site-packages/numba/caching.py", line 349, in __init__
    "for file %r" % (qualname, source_path))
RuntimeError: cannot cache function '__shear_dense': no locator available for file '/usr/local/lib/python3.7/site-packages/librosa/util/utils.py'

```

## compare failure tail

```text

```
