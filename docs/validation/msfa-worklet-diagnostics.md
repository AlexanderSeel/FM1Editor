# MSFA AudioWorklet measured diagnostics

Source commit: `c8190a3b5415ee480bb0d364b1183d6ff940a407`

Overall software gate: **SUCCESS**

The AudioWorklet measures render callback duration using  when available. Every 128 rendered callbacks it reports mean/max render milliseconds, audio-quantum budget, mean/max utilization, callbacks exceeding the budget, active voices and configured polyphony. If the high-resolution clock is unavailable, no diagnostic sample is emitted rather than fabricating CPU data.

The main-thread controller validates these messages, exposes only the latest accepted sample read-only, and clears it on shutdown. The local-audition typed mock was updated to the expanded controller contract. Worklet syntax check, virtual-engine audit, typecheck, lint, focused diagnostics/audition tests, the full test suite and production build all passed.

Branded-browser performance evidence is still required before the expanded renderer regression/performance PLAN item can close.
