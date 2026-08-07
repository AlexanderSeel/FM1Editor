# Imported-bank virtual audio browser acceptance

Source commit: `949aa7e3ee8154ea341b5e34ef4f5e08bc91fde0`

Overall browser gate: **SUCCESS**

| Browser | Product | Loaded bank PCM peak | Catalog audition peak | Saved-library audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | Chrome/151.0.7922.72 | 0.47958374 | 0.42092896 | 0.47866821 | 0 | PASS |
| Edge | Edg/151.0.4129.59 | 0.47940063 | 0.47866821 | 0.47225952 | 0 | PASS |

Exact flow: Library → query ROM1A → load the filtered valid bank → Voice → Enable local audio → play BRASS 1; then catalog Audition first voice; then saved-library Audition local. The runner uses filtered catalog actions rather than assuming the filename is rendered, and accepts Yamaha-padded voice names.

All three paths require measurable AudioWorklet PCM and zero Web MIDI requests. Software/browser validation only; no physical FM-1 or DX7 equivalence claim.
