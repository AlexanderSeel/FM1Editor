# Current same-source software and responsive browser gate

Source commit: `c26be6ba7d1a116684a0a3368ed0db5950df697c`

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
| chrome | FM1 | FAILED | — | — | — | — | Timed out waiting for document.querySelector('.fm1-app') && document.querySelector('nav[aria-label="Workspace navigation"]') |
| chrome | DX7 | FAILED | — | — | — | — | Timed out waiting for document.querySelector('.fm1-app') && document.querySelector('nav[aria-label="Workspace navigation"]') |
| edge | FM1 | FAILED | — | — | — | — | Timed out waiting for document.querySelector('.fm1-app') && document.querySelector('nav[aria-label="Workspace navigation"]') |
| edge | DX7 | FAILED | — | — | — | — | Timed out waiting for document.querySelector('.fm1-app') && document.querySelector('nav[aria-label="Workspace navigation"]') |

All software checks and browser matrices ran from the same Windows checkout/build. The responsive matrix covers 1440×900, 1024×768 and 390×844 touch emulation for both FM-1 and DX7 target modes in branded Chrome and Edge. This is software/layout/browser evidence only and does not validate physical MIDI/audio hardware.
