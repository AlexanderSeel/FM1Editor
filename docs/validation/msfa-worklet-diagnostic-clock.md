# AudioWorklet diagnostics clock fallback

Source commit: `0197769adf6d2c5312a15b88a573e9feb3475e52`

Overall software gate: **SUCCESS**

The AudioWorklet now uses high-resolution `performance.now()` when available and a measured `Date.now()` fallback otherwise. Each accepted diagnostic sample records the clock source; the UI labels the fallback as 1 ms precision rather than presenting it as a high-resolution CPU profiler. Callback duration, audio-quantum budget, mean/max utilization and over-budget counts remain measured values.

Worklet syntax, engine audit, strict typecheck, lint, focused diagnostics/UI tests, the full test suite and production build passed. Branded-browser evidence remains required before the Virtual FM-1 preview and expanded performance roadmap items close.
