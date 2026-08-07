# MSFA AudioWorklet ten-minute Chrome/Edge soak

Validated source commit: `22d6a5c036c80c7799c2ddd28dd12ab6cfc1bd7f`

Overall real-time gate: **SUCCESS**

- Same-commit software suite: **SUCCESS**

| Browser | Result | Version | Sample rate | Duration | Cycles | Peak | Processor errors | Suspensions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| chrome | **SUCCESS** | Chrome/150.0.7871.187 | 48000 | 600612 ms | 798 | 0.013580322265625 | 0 | 0 |
| edge | **SUCCESS** | Edg/150.0.4078.99 | 48000 | 600630 ms | 798 | 0.013580322265625 | 0 | 0 |

## Acceptance scope

- Executes the actual packaged `msfa-2e182b3-fm1-v3-stateful` WASM in installed branded Chrome and Edge AudioWorklets on Windows GitHub-hosted runners for at least ten minutes per browser.
- Continuously cycles note-on, release and all-notes-off through the repository-owned synthetic voice while checking analyser PCM for finite/non-silent output and clean return to silence.
- Requires zero `onprocessorerror`, zero window errors, zero unhandled rejections and no unresolved AudioContext suspension.
- The CI audio device is headless/muted. No browser API exposes a hardware underrun counter here, so dropout evidence is limited to processor errors, context suspension and graph-output observations; audible physical-device dropout quality is not claimed.
- No Web MIDI, SysEx, FM-1 effects or physical Yamaha/M-VAVE hardware behavior is part of this gate.

## chrome
```json
{
  "ok": true,
  "browserName": "chrome",
  "browserProduct": "Chrome/150.0.7871.187",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 600,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "wasmSha256": "623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 600612,
  "cycles": 798,
  "maxPeak": 0.013580322265625,
  "activeSamples": 1596,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running",
  "tenMinuteDurationSatisfied": true
}
```

## edge
```json
{
  "ok": true,
  "browserName": "edge",
  "browserProduct": "Edg/150.0.4078.99",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 600,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "wasmSha256": "623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 600630,
  "cycles": 798,
  "maxPeak": 0.013580322265625,
  "activeSamples": 1596,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running",
  "tenMinuteDurationSatisfied": true
}
```
