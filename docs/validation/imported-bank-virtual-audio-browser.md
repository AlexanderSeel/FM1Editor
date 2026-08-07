# Imported-bank virtual audio browser acceptance

Source commit: `bb3c23c2f30527cb037c2b14904b4fda5bf3b735`

Overall browser gate: **FAILED**

| Browser | Product | Loaded bank PCM peak | Catalog audition peak | Saved-library audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Runtime.evaluate: Object reference chain is too long |
| Edge | FAILED | — | — | — | — | Runtime.evaluate: Object reference chain is too long |

Exact flow: Library → ROM1A → Load bank → Voice → Enable local audio → play BRASS 1; then Catalog Audition first voice; then saved-library Audition local. All three paths require measurable AudioWorklet PCM and zero Web MIDI requests.

Software/browser validation only; no physical FM-1 or DX7 equivalence claim.
