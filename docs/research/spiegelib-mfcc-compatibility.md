# SpiegeLib MFCC preprocessing compatibility

FM1 Editor source commit: `18934c281e815f2d031630d71383e0233442cd76`

Compatibility status: **FAILED**

| Stage | Exit |
| --- | ---: |
| reference | 0 |
| compare | 1 |

- oracle: Python 3.7.7 + Librosa 0.7.2; in-memory 44.1 kHz input
- corrected extractor uses the historical Librosa 0.7.2 mel default `norm=1` (discrete L1 normalization), not later Slaney-area normalization
- settings: 2048 FFT, 1024 hop, 128 mel bands, 13 MFCC, one-second input

A SUCCESS is the admission evidence for the raw-MFCC preprocessing path. The earlier large-error receipt used the wrong later mel normalization and is superseded by this exact-version comparison.

## compare failure tail

```text

added 321 packages in 5s

[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/home/runner/work/FM1Editor/FM1Editor[39m

[90mstdout[2m | src/audio/spiegelibSimpleFmMfcc072.compat.test.ts[2m > [22m[2mSpiegeLib exact Librosa 0.7.2 MFCC compatibility[2m > [22m[2mmatches all 572 coefficients
[22m[39mMFCC072 compatibility maxError=150.78644943237305 rms=41.1107307145127

 [31m❯[39m src/audio/spiegelibSimpleFmMfcc072.compat.test.ts [2m([22m[2m1 test[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 66[2mms[22m[39m
[31m     [31m×[31m matches all 572 coefficients[39m[32m 64[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/audio/spiegelibSimpleFmMfcc072.compat.test.ts[2m > [22mSpiegeLib exact Librosa 0.7.2 MFCC compatibility[2m > [22mmatches all 572 coefficients
[31m[1mAssertionError[22m: expected 150.78644943237305 to be less than 0.01[39m
[36m [2m❯[22m src/audio/spiegelibSimpleFmMfcc072.compat.test.ts:[2m10:473[22m[39m


[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m   Start at [22m 11:25:35
[2m   Duration [22m 327ms[2m (transform 87ms, setup 0ms, import 132ms, tests 66ms, environment 0ms)[22m


::error file=/home/runner/work/FM1Editor/FM1Editor/src/audio/spiegelibSimpleFmMfcc072.compat.test.ts,title=src/audio/spiegelibSimpleFmMfcc072.compat.test.ts > SpiegeLib exact Librosa 0.7.2 MFCC compatibility > matches all 572 coefficients,line=10,column=473::AssertionError: expected 150.78644943237305 to be less than 0.01%0A ❯ src/audio/spiegelibSimpleFmMfcc072.compat.test.ts:10:473%0A%0A

```
