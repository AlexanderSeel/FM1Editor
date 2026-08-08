# SpiegeLib isolated environment reproduction

Pinned upstream: `hjdeheer/spiegelib@1a3fa1a172c89b869928005874071d0220fc9ccc`

Root code license reviewed: **MIT**

Environment smoke: **FAILED**

| Stage | Exit |
| --- | ---: |
| toolchain bootstrap |  |
| editable install + upstream dependencies |  |
| MIT-native top-level/import smoke |  |

Resolved imports: `not resolved`.

The pinned merge adds `conv_s2s.py`, `linear.py` and `lstm_s2s.py` explicitly labeled “From Sound2Synth”. Because the reviewed Sound2Synth core has no explicit root code license, those modules are treated as provenance-blocked. This smoke asserts that the normal SpiegeLib package/estimator import surface does not execute them.

No Dexed/VST binary, RenderMan dependency, preset library, training data or model weights are admitted into FM1 Editor by this reproduction.

Environment snapshot:
```text

```

Execution log:
```text
reproduction log unavailable
```
