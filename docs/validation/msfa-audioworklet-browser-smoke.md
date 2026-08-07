# MSFA AudioWorklet real-browser smoke

Validated source commit: `e28ced0f8064bb7a8f9660bf723e81ecb295fc9b`

Overall smoke gate: **FAILED**

| Browser | Result | Version | Sample rate | Duration | Peak | Processor errors |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| chrome | **FAILURE** | n/a | n/a | n/a ms | n/a | n/a |
| edge | **FAILURE** | n/a | n/a | n/a ms | n/a | n/a |

## Scope

- Executes the actual packaged stateful WASM inside a real `AudioWorklet` on the Windows GitHub-hosted runner.
- Verifies local WASM SHA-256 against the manifest, worklet initialization, semantic reference patch load, repeated note on/off/all-notes-off command flow, non-silent analyser output, return to silence and absence of processor/window/unhandled-rejection errors.
- Browser audio is headless and muted in CI, so this smoke validates the browser audio graph and processor execution, not audible hardware dropout quality.
- This 20-second smoke is a prerequisite only; the required ten-minute Chrome/Edge soak remains open until a separate 600-second run passes.

## chrome
```json
{
  "ok": false,
  "browserName": "chrome",
  "requestedSoakSeconds": 20,
  "error": "Error: URL is not defined\n    at node.port.onmessage (http://127.0.0.1:50695/__msfa-worklet-smoke.html:80:23)"
}
```

## edge
```json
{
  "ok": false,
  "browserName": "edge",
  "requestedSoakSeconds": 20,
  "error": "Error: URL is not defined\n    at node.port.onmessage (http://127.0.0.1:53407/__msfa-worklet-smoke.html:80:23)"
}
```
