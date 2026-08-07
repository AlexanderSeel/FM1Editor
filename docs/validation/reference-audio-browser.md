# Local reference audio browser acceptance

Source commit: `6edb5db4c63c0946a6d07d264d94ee13c80d3825`

Overall browser gate: **FAILED**

| Browser | Product | Manual pitch override | New network fetches | Result |
| --- | --- | --- | ---: | --- |
| Chrome | FAILED | — | — | Expected a resolved A4-range detected pitch, got 109.98 Hzdetected pitch |
| Edge | FAILED | — | — | Expected a resolved A4-range detected pitch, got 109.98 Hzdetected pitch |

A generated local WAV with leading/trailing silence is selected through the real mounted file input. Detected pitch is accepted within a plausible A4 range rather than requiring an exact autocorrelation-bin rounding. Acceptance also requires region controls, silence trimming, normalization, SHA-256 display, manual pitch override, explicit local-only privacy copy and zero new network fetches caused by reference processing.

No server upload or physical-hardware claim is part of this acceptance.
