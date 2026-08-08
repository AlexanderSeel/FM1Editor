# Current same-source software and responsive browser gate

Source commit: `1f7cf0bf805def731ebdc507ed23bb46671a2276`

Overall gate: **FAILED**

| Software stage | Exit |
| --- | ---: |
| auditVirtual | 0 |
| auditResearch | 0 |
| typecheck | 0 |
| lint | 0 |
| tests | 0 |
| build | 0 |

| Browser | Target | Product | Desktop | Narrow | Mobile touch | MIDI requests | Result |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| chrome | FM1 | FAILED | — | — | — | — | Timed out waiting for document.body?.textContent?.includes('FM1 Editor') |
| chrome | DX7 | FAILED | — | — | — | — | Timed out waiting for document.body?.textContent?.includes('FM1 Editor') |
| edge | FM1 | FAILED | — | — | — | — | Timed out waiting for document.body?.textContent?.includes('FM1 Editor') |
| edge | DX7 | FAILED | — | — | — | — | Timed out waiting for document.body?.textContent?.includes('FM1 Editor') |

All software checks and branded-browser matrices are executed from the same checkout/build. The responsive matrix covers desktop 1440×900, desktop-narrow 1024×768 and mobile-touch 390×844 for both FM-1 and DX7 target modes in Chrome and Edge. It validates application layout/navigation/error containment only; it does not validate physical MIDI/audio hardware.
