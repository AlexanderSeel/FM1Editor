# SpiegeLib simple-FM MFCC scaler conversion

FM1 Editor source commit: `aab087cff519488d7e619fb95810e032cd68f60d`

Conversion status: **FAILED**

| Stage | Exit |
| --- | ---: |
| download | 0 |
| convert | 1 |
| train-array | 0 |

- DOI: `10.5281/zenodo.3722784`
- archive MD5: `7c9357219b70c07a4ab115d332f78ef5`
- scaler SHA-256: `99ec4350f824017d3b9e36f17edf7753af954458ed4f01442c62f4e243704dc4`
- license: CC BY 4.0; creators: Jordie Shier, George Tzanetakis, Kirk McNally

The archived pickle reports fit_shape `(10,44,13)`. SpiegeLib transform uses this saved shape only for dimensionality/broadcasting; the persisted axis-0 mean/std matrices are 44×13. The pickle was deserialized only inside a no-network, read-only, capability-dropped Docker container without a repository mount.

## convert failure tail

```text
sha256:52b973a137ef30f04437ace5e9dc9d2691e42d9878d6d896dcbb54287d860d20
Traceback (most recent call last):
  File "/opt/extract.py", line 21, in <module>
    Path('/output/scaler.json').write_text(json.dumps(payload,separators=(',',':'))+'\n',encoding='utf-8')
  File "/usr/local/lib/python3.11/pathlib.py", line 1078, in write_text
    with self.open(mode='w', encoding=encoding, errors=errors, newline=newline) as f:
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/pathlib.py", line 1044, in open
    return io.open(self, mode, buffering, encoding, errors, newline)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
PermissionError: [Errno 13] Permission denied: '/output/scaler.json'

```
