# Imported-bank virtual audio browser acceptance

Source commit: `94bfa6d08abc659899c42083d173d5bab146afb5`

Overall browser gate: **FAILED**

| Browser | Product | Loaded bank PCM peak | Catalog audition peak | Saved-library audition peak | Web MIDI requests | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Chrome | FAILED | — | — | — | — | Timed out waiting for browser condition: [...document.querySelectorAll('article')].some((article) => article.textContent?.includes('ROM1A') && [...article.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Load bank' && !button.disabled)) |
| Edge | FAILED | — | — | — | — | Timed out waiting for browser condition: [...document.querySelectorAll('article')].some((article) => article.textContent?.includes('ROM1A') && [...article.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Load bank' && !button.disabled)) |

Exact flow: Library → ROM1A → Load bank → Voice → Enable local audio → play BRASS 1; then Catalog Audition first voice; then saved-library Audition local. All three paths require measurable AudioWorklet PCM and zero Web MIDI requests.

Software/browser validation only; no physical FM-1 or DX7 equivalence claim.
