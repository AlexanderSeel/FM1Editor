# SpiegeLib simple-FM MFCC scaler conversion

FM1 Editor source commit: `31ca5f243a6dae6ccedcbdcf8822abe6189a9d20`

Conversion status: **FAILED**

| Stage | Exit |
| --- | ---: |
| download | 0 |
| build | 0 |
| convert | 1 |
| train-array | 0 |

- DOI: `10.5281/zenodo.3722784`
- archive `data_simple_FM_mfcc.zip` MD5 `7c9357219b70c07a4ab115d332f78ef5`
- CC BY 4.0; creators: Jordie Shier, George Tzanetakis, Kirk McNally

The joblib pickle is deserialized only inside a no-network, read-only, capability-dropped Docker container without a repository mount. A failed conversion does not publish a scaler JSON.

## convert failure tail

```text
unexpected fit_shape: (10, 44, 13)

```
