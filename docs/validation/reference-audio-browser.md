# Local reference audio browser acceptance

Source commit: `cf37d84543bb356e83194813836542341892c8a1`

Overall browser gate: **FAILED**

| Browser | Product | Manual pitch override | New network fetches | Result |
| --- | --- | --- | ---: | --- |
| Chrome | FAILED | — | — | Timed out waiting for condition: document.body.textContent.includes('440.') || document.body.textContent.includes('441.') || document.body.textContent.includes('439.') |
| Edge | FAILED | — | — | Timed out waiting for condition: document.body.textContent.includes('440.') || document.body.textContent.includes('441.') || document.body.textContent.includes('439.') |

A generated local WAV with leading/trailing silence is selected through the real mounted file input. Acceptance requires local decode, region controls, silence trimming, normalization, SHA-256 display, detected pitch, manual pitch override, explicit local-only privacy copy and zero new network fetches caused by reference processing.

No server upload or physical-hardware claim is part of this acceptance.
