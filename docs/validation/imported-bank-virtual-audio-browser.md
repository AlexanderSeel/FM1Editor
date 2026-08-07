# Imported-bank virtual audio browser acceptance

Source commit: `a95b48089045ed59dfee13797ecc4ab738350f07`

Overall browser gate: **FAILED**

| Browser | Product | Loaded bank PCM peak | Catalog audition peak | Saved-library audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Timed out waiting for browser condition: document.body.textContent.includes('Loaded') && document.body.textContent.includes('ROM1A') |
| Edge | FAILED | — | — | — | — | Timed out waiting for browser condition: document.body.textContent.includes('Loaded') && document.body.textContent.includes('ROM1A') |

Exact flow: Library → ROM1A → Load bank → Voice → Enable local audio → play BRASS 1; then Catalog Audition first voice; then saved-library Audition local. All three paths require measurable AudioWorklet PCM and zero Web MIDI requests.

Software/browser validation only; no physical FM-1 or DX7 equivalence claim.
