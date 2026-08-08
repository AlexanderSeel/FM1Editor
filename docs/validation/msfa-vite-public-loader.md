# Vite-safe MSFA public-module loader acceptance

Source commit: `e1ea6ac84928a9ecafe87c5776915f73208e2c23`

Software acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| install | 0 |
| audit | 0 |
| typecheck | 0 |
| lint | 0 |
| msfa-test | 0 |
| full-test | 0 |
| build | 0 |
| dev-static | 0 |

- `public/virtual-dx7/fm1-msfa.mjs` is fetched as a static asset rather than dynamically imported through Vite source transforms
- the fetched module text is imported from a temporary blob URL
- Emscripten `locateFile` resolves `fm1-msfa.wasm` beside the original public module URL, not beside the blob URL
- the regression test asserts the public URL is fetched without Vite `?import` semantics
- the dev-server smoke confirms the committed public `.mjs` and `.wasm` are served directly

