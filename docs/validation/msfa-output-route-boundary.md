# MSFA AudioWorklet optional output-route boundary

Source commit: `791374a06ae55858baccd60c95c8ba9a98cd2923`

Overall software gate: **SUCCESS**

The local AudioWorklet controller now accepts an optional output-route factory. Without one, the existing audited dry behavior is unchanged: the worklet connects directly to . With a route, the worklet connects to that route's destination and disposes the route on normal close and initialization failure before closing the AudioContext.

This boundary allows the Virtual FM-1 preview to opt into the validated FX/master/limiter graph without changing catalog audition, sequencer local audio, or the default dry DX7-compatible preview. Virtual-DX7 source audit, typecheck, lint, focused routing tests, the full test suite and production build passed.
