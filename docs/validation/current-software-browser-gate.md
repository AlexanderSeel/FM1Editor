# Current same-source software and responsive browser gate

Source commit: `b07c5e6e5c394c5d495d47bafb452a3c0c9e0098`

Overall gate: **FAILED**

| Software stage | Exit |
| --- | ---: |
| auditVirtual | 0 |
| auditResearch | 0 |
| typecheck | 0 |
| lint | 0 |
| tests | 0 |
| build | 0 |
| smokeSyntax | 0 |

| Browser | Target | Product | Desktop | Narrow | Mobile touch | MIDI requests | Result |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| chrome | FM1 | Chrome/151.0.7922.72 | PASS | PASS | PASS | 0 | PASS |
| chrome | DX7 | FAILED | — | — | — | — | Unable to select DX7 target in the UI |
| edge | FM1 | Edg/151.0.4129.59 | PASS | PASS | PASS | 0 | PASS |
| edge | DX7 | FAILED | — | — | — | — | Unable to select DX7 target in the UI |

All software checks and browser matrices ran from the same Windows checkout/build. The responsive matrix covers 1440×900, 1024×768 and 390×844 touch emulation for both FM-1 and DX7 target modes in branded Chrome and Edge. This is software/layout/browser evidence only and does not validate physical MIDI/audio hardware.
