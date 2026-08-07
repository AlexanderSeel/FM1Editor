# MSFA AudioWorklet real-browser smoke

Validated source commit: `ad955172d33e6a2e83f431ba41d1329b2c46f1d6`

Overall smoke gate: **SUCCESS**

| Browser | Result | Version | Sample rate | Duration | Peak | Processor errors |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| chrome | **SUCCESS** | Chrome/150.0.7871.187 | 48000 | 20516 ms | 0.013580322265625 | 0 |
| edge | **SUCCESS** | Edg/151.0.4129.59 | 48000 | 20525 ms | 0.013580322265625 | 0 |

## Scope

- Runs the actual packaged stateful WASM inside installed branded Chrome and Edge AudioWorklet environments on `windows-latest`.
- Verifies manifest/WASM identity, initialization, pre-voice silent callbacks, reference voice load, repeated note lifecycle, non-silent graph output, return to silence and zero processor/window/unhandled-rejection errors.
- Browser audio is headless and muted in CI; this validates graph/processor stability, not audible hardware dropout quality.
- This 20-second smoke is a prerequisite only; the separate 600-second soak remains required.

## chrome
```json
{
  "ok": true,
  "browserName": "chrome",
  "browserProduct": "Chrome/150.0.7871.187",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 20,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "wasmSha256": "623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 20516,
  "cycles": 27,
  "maxPeak": 0.013580322265625,
  "activeSamples": 54,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running"
}
```

## edge
```json
{
  "ok": true,
  "browserName": "edge",
  "browserProduct": "Edg/151.0.4129.59",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 20,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "wasmSha256": "623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 20525,
  "cycles": 27,
  "maxPeak": 0.013580322265625,
  "activeSamples": 54,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running"
}
```
