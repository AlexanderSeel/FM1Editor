# Imported-bank virtual audio browser acceptance

Source commit: `81dfd07cf7edda84514c30260d9b8c4f6eb862c4`

Overall browser gate: **FAILED**

| Browser | Product | Loaded bank PCM peak | Catalog audition peak | Saved-library audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Timed out waiting for http://127.0.0.1:56855/json/version: TypeError: fetch failed |
| Edge | FAILED | — | — | — | — | Timed out waiting for browser condition: (document.querySelector('.fm1-lcd-title')?.textContent ?? '').replace(/s+/g, ' ').includes('BRASS 1') |

Exact flow: Library → query ROM1A → load the filtered valid bank → Voice → Enable local audio → play BRASS 1; then catalog Audition first voice; then saved-library Audition local. Filename filtering and padded Yamaha display names are handled independently from visible catalog labels.

All three paths require measurable AudioWorklet PCM and zero Web MIDI requests. Software/browser validation only; no physical FM-1 or DX7 equivalence claim.
