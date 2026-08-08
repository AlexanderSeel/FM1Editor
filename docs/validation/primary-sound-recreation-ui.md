# Primary Audio-to-FM sound recreation UI acceptance

Source commit: `7a279ace6c9670a85d8cb97cf5d795324e8a31fd`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit-virtual | 0 |
| audit-reconstruction | 0 |
| typecheck | 0 |
| lint | 0 |
| recreation-ui | 0 |
| full-test | 0 |
| build | 0 |

- `Recreate sound` is the primary Audio-to-FM action; similar-preset retrieval is explicitly secondary
- retrieval selects promising local DX7 seed voices but is not presented as the recreation result
- one recreation run automatically refines up to three seeds with deterministic CMA-ES over six operator output levels, feedback, twelve operator frequency controls and forty-eight operator envelope points
- recreated candidates remain explicit local results that can be auditioned, exported as single-voice SysEx or loaded into the editor
- no recreated candidate is automatically transmitted to physical hardware
- the smaller output/feedback-only quick refinement remains available after an explicit similar-preset search
- exact inverse recovery is not claimed; the result is an optimized DX7-compatible approximation measured against the prepared reference fingerprint

