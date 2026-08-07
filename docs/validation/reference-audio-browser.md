# Local reference audio browser acceptance

Source commit: `18652a4159444d1730bc96bce8d7b5456e57c90a`

Overall browser gate: **FAILED**

| Browser | Product | Manual pitch override | New network fetches | Result |
| --- | --- | --- | ---: | --- |
| Chrome | FAILED | — | — | Timed out waiting for http://127.0.0.1:52879/json/version |
| Edge | Edg/151.0.4129.59 | True | 0 | PASS |

A generated PCM16 local WAV with leading/trailing silence is selected through the real mounted file input. Acceptance requires a resolved A4-range pitch after the fundamental-selection fix, region controls, silence trimming, normalization, SHA-256 display, 330 Hz manual override, explicit local-only privacy copy and zero new network fetches caused by reference processing.

No server upload or physical-hardware claim is part of this acceptance.
