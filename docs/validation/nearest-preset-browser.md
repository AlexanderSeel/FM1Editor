# Nearest-preset reconstruction browser acceptance

Source commit: `03376de0d2aec89f964da58514b5de470624ddc9`

Overall browser gate: **SUCCESS**

| Browser | Product | Ranked results | Reference A peak | Candidate B peak | Web MIDI requests | Top candidate | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Chrome | Chrome/151.0.7922.72 | 8 | 0.89125091 | 0.24530029 | 0 | W.BASS   4 | PASS |
| Edge | Edg/151.0.4129.59 | 8 | 0.89125091 | 0.24273682 | 0 | W.BASS   4 | PASS |

The mounted Quick scan uses a generated local PCM16 A4 reference, up to 256 checksum-valid bundled catalog voices, the deterministic offline MSFA renderer and compact local fingerprint cache. Acceptance requires at least three ranked results, measurable reference A PCM, measurable dry candidate B AudioWorklet PCM, no implicit voice load during search/audition, an explicit Load into editor transition, zero Web MIDI requests and no external or write fetches.

Software/browser validation only; no physical FM-1/DX7 fidelity or transfer claim.
