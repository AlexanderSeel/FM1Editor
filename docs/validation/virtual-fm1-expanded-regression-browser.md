# Expanded Virtual FM-1 renderer browser performance gate

Source commit: `0249269a60e1a0b93adae9d10d2fece06a606c57`

Overall browser performance gate: **SUCCESS**

| Browser | Product | Mean utilization | Max utilization | Over budget | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Chrome | Chrome/151.0.7922.72 | 0.29% | 37.50% | 0/128 | PASS |
| Edge | Edg/151.0.4129.59 | 0.29% | 37.50% | 0/128 | PASS |

Enforced repository limits: mean utilization <= 5%, max utilization <= 60%, and zero callbacks over the 128-frame audio-quantum budget. The same acceptance run also requires dry/FX/master behavior, prepared-reference A/B, valid WAV output, no uncaught browser errors/rejections, zero Web MIDI requests and no external/write fetches.

These are browser-software limits derived from measured Chrome/Edge observations with margin; no physical FM-1 performance equivalence is claimed.
