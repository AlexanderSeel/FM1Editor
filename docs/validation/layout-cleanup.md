# Compact layout cleanup status

Implemented source commits:

- compact application chrome: `8957b11657d66248c3eba41587fd235ba6fb6d49`
- widened vertical-only sidebar: `e9836658e104ad530ce2eb9b6f3c8a1868bb2b3c`
- sidebar regression guard: `e0be53fe255e07daae3404433dbe4652a9ddfd77`

Implemented changes:

- removed decorative Master, Select, Algorithm and placeholder knobs from `App.tsx`;
- replaced duplicate two-line workspace labels with one functional label;
- removed the unused “Editor / Control Surface”, “Current program” and hardware-style helper copy;
- reduced brand, status-screen, sidebar and action-toolbar spacing;
- darkened the screen and active-control cyan gradients;
- consolidated application chrome around shared metadata, control and title text scales;
- widened the left sidebar to 340–380 px on desktop and 410 px on larger desktops;
- explicitly clipped horizontal sidebar overflow while retaining vertical wheel, scrollbar and touch scrolling;
- reserved stable space for the vertical scrollbar to avoid content-width jumps;
- retained all MIDI, SysEx, history, library, effects, recording, audition and persistent-sequencer controls.

Source-level regression coverage is defined in `src/layoutRefinements.test.ts`. The permanent Windows browser runner remains in `.github/workflows/browser-layout.yml` and covers installed Chrome and Microsoft Edge at desktop, tablet and narrow-mobile sizes.

The connector did not expose a scheduled CI or browser-layout result for the new source commits, and the local fallback environment could not resolve `github.com`. Therefore typecheck, lint, full tests, production build and the post-change Chrome/Edge matrix are **not claimed as completed** here. The exact remaining checks, including long MIDI endpoint and safety-text overflow, remain explicitly listed in `PLAN.md`.
