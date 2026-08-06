# Current software and browser validation

Validated source commit: `ffb582b5245d5de6cffbeaf3cceac212dce04f1a`

- Ubuntu software job: **SUCCESS**
- Windows Chrome/Edge job: **FAILURE**
- Overall gate: **FAILED**

The software job runs dependency installation, TypeScript typecheck, ESLint and JSX accessibility, the full Vitest suite, and the production build.

Browser coverage includes:

- FM-1 wide desktop, compact desktop, tablet and mobile layouts;
- 340–410 px desktop sidebar width, vertical-only scrolling and long-label containment;
- FM-1 bank controls and 25-key virtual piano bounds;
- Yamaha DX7 guarded voice parameters `0–155` and function parameters `64–77`;
- exactly one voice/function panel, locked without output, SysEx and hardware confirmations;
- DX7 operator-mask controls and 25-key virtual piano bounds.

No physical FM-1 or Yamaha DX7 hardware behavior was validated by this workflow.
