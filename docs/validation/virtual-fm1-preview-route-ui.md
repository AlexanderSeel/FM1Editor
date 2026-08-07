# Virtual FM-1 preview routed-output UI validation

Source commit: `ebc838f0c2e630d1c9f41d9fe5e7bdd9b79892bc`

Overall software gate: **SUCCESS**

The existing local Voice preview now acts as the Virtual FM-1 target while retaining the audited DX7-compatible dry engine. Its default browser controller opts into the validated FM-1-inspired output route; injected/custom controllers remain unchanged.

Current semantic  and App  synchronize into the route. The panel exposes explicit dry/FX bypass, −48…+6 dB master gain and the accepted −1 dB/20:1 limiter; dry remains default. Catalog audition and sequencer local audio remain direct dry because they do not request the optional route.

Virtual-engine audit, typecheck, lint, focused preview/controller tests, full tests and production build passed. Measured diagnostics, browser offline WAV execution and shared-reference A/B still require integrated browser evidence before the overall preview item closes.
