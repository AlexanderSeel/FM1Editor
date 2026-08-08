# Current same-source software and responsive browser gate

Source commit: `c08a3c64987467b5edb04c54aaf90bf18525292c`

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
| chrome | FM1 | FAILED | — | — | — | — | result missing |
| chrome | DX7 | FAILED | — | — | — | — | result missing |
| edge | FM1 | FAILED | — | — | — | — | result missing |
| edge | DX7 | FAILED | — | — | — | — | result missing |

All software checks and browser matrices ran from the same Windows checkout/build. The responsive matrix covers 1440×900, 1024×768 and 390×844 touch emulation for both FM-1 and DX7 target modes in branded Chrome and Edge. This is software/layout/browser evidence only and does not validate physical MIDI/audio hardware.
