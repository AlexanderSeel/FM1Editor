# Plan sections 3–7 validation

Validated source commit: `e2066c749bb948ab34bd1d19b69c8583fb78c2ed`

- npm install: **SUCCESS**
- TypeScript typecheck: **FAILURE**
- ESLint and JSX accessibility: **SUCCESS**
- Full Vitest suite: **SUCCESS**
- Production build: **FAILURE**

- Algorithm selection is displayed directly with the operator routing area.
- Target-aware Live MIDI controls appear directly above the virtual piano.
- Direct controls are limited to Program Change, transport, Clock, All Notes Off and documented FM-1 CC 0–23 effects.
- The sequencer includes piano-roll mono/poly entry, transforms, presets, pattern chaining, arrangement, playhead diagnostics and internal/external 24-PPQN clock.
- Physical FM-1 audio, bank mapping, acknowledgements, readback, performance semantics and internal pattern transfer remain unverified.
