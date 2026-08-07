# MSFA AudioWorklet real-browser smoke

Validated source commit: `c0f96b95f96a0710548649ecef7d3b69ccf45623`

Overall smoke gate: **FAILED**

| Browser | Result | Version | Sample rate | Duration | Peak | Processor errors |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| chrome | **FAILURE** | n/a | n/a | n/a ms | n/a | n/a |
| edge | **FAILURE** | n/a | n/a | n/a ms | n/a | n/a |

## Scope

- Runs the actual packaged stateful WASM inside the installed branded Chrome and Edge AudioWorklet environments on `windows-latest`.
- Verifies manifest/WASM identity, initialization, reference voice load, repeated note lifecycle, non-silent graph output, return to silence and zero processor/window/unhandled-rejection errors.
- Browser audio is headless and muted in CI; this validates graph/processor stability, not audible hardware dropout quality.
- This 20-second smoke is a prerequisite only; the separate 600-second soak remains required.

## chrome
```json
{
  "ok": false,
  "browserName": "chrome",
  "requestedSoakSeconds": 20,
  "error": "Error: MSFA render64 failed with status 2\n    at node.port.onmessage (http://127.0.0.1:53013/__msfa-worklet-smoke.html:80:23)"
}
```

## edge
```json
{
  "ok": false,
  "browserName": "edge",
  "requestedSoakSeconds": 20,
  "error": "Error: MSFA render64 failed with status 2\n    at node.port.onmessage (http://127.0.0.1:61325/__msfa-worklet-smoke.html:80:23)"
}
```
