# Local reference audio browser acceptance

Source commit: `ca0a798daa211ee228005b1d1262f17749e3bb41`

Overall browser gate: **SUCCESS**

| Browser | Product | Detected pitch | Manual override | New network fetches | Result |
| --- | --- | --- | --- | ---: | --- |
| Chrome | Chrome/151.0.7922.72 | 441.00 Hzdetected pitch | True | 0 | PASS |
| Edge | Edg/151.0.4129.59 | 441.00 Hzdetected pitch | True | 0 | PASS |

The real mounted reference input receives a generated PCM16 A4 WAV with leading/trailing silence. Acceptance requires fundamental-range pitch detection, region/trim/normalization controls, SHA-256 display, 330 Hz manual override, local-only privacy status and zero reference-processing network fetches. Browser startup is retried once to separate CDP startup flakes from product behavior.

No server upload or physical-hardware claim is part of this acceptance.
