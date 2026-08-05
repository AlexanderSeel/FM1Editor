# Draggable envelope browser diagnostics

- open production preview: **PASS** — http://127.0.0.1:4173/
- locate pitch envelope group: **PASS** — slider count 8
- read initial pitch rate: **PASS** — graph 99, numeric 99
- drag pitch rate horizontally: **PASS** — graph 99, numeric 99
- undo pitch rate drag: **FAIL** — locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Undo last editor change' })
    - locator resolved to <button disabled type="button" title="Undo (Ctrl/Cmd+Z)" aria-label="Undo last editor change" class="px-3 py-2 text-[10px] font-black uppercase tracking-[0.11em]">Undo</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    58 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

    at /home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-envelopes.mjs:54:14
    at step (/home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-envelopes.mjs:13:26)
    at /home/runner/work/FM1Editor/FM1Editor/artifacts/diagnose-envelopes.mjs:52:7
- keyboard Home and End on pitch rate: **PASS** — Home 0/0, End 99/99
- drag pitch level vertically: **PASS** — graph 81, numeric 81
- drag operator level vertically: **PASS** — graph 99, numeric 99
- capture browser screenshot: **PASS**
