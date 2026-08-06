# Keyboard scaling browser diagnostics

- open production preview: **PASS** — http://127.0.0.1:4173/
- locate scaling graph: **PASS** — slider count 3
- read initial breakpoint: **PASS** — graph 39, numeric 39
- drag breakpoint right: **PASS** — graph 52, numeric 52
- undo breakpoint drag: **PASS** — graph 39, numeric 39
- drag negative left depth down: **FAIL** — locator.inputValue: Error: strict mode violation: getByRole('slider', { name: 'Left depth' }) resolved to 2 elements:
    1) <g tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="99" aria-valuenow="68" aria-label="Operator 1 keyboard scaling left depth" class="cursor-ns-resize outline-none focus-visible:drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]">…</g> aka getByRole('slider', { name: 'Operator 1 keyboard scaling left depth' })
    2) <input min="0" max="99" step="1" value="68" type="range" aria-label="Left depth" class="accent-cyan-300"/> aka getByRole('slider', { name: 'Left depth', exact: true })

Call log:
  - waiting for getByRole('slider', { name: 'Left depth' })

    at /home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-keyboard-scaling.mjs:69:100
    at async step (/home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-keyboard-scaling.mjs:13:20)
    at async file:///home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-keyboard-scaling.mjs:67:1
- select positive right curve: **PASS** — positive-linear
- drag positive right depth up: **FAIL** — locator.inputValue: Error: strict mode violation: getByRole('slider', { name: 'Right depth' }) resolved to 2 elements:
    1) <g tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="99" aria-valuenow="68" aria-label="Operator 1 keyboard scaling right depth" class="cursor-ns-resize outline-none focus-visible:drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]">…</g> aka getByRole('slider', { name: 'Operator 1 keyboard scaling right depth' })
    2) <input min="0" max="99" step="1" value="68" type="range" class="accent-cyan-300" aria-label="Right depth"/> aka getByRole('slider', { name: 'Right depth', exact: true })

Call log:
  - waiting for getByRole('slider', { name: 'Right depth' })

    at /home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-keyboard-scaling.mjs:82:102
    at async step (/home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-keyboard-scaling.mjs:13:20)
    at async file:///home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-keyboard-scaling.mjs:80:1
- keyboard breakpoint Home and End: **PASS** — Home 0/0, End 99/99
- capture browser screenshot: **PASS**
