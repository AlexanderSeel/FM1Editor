# MSFA performance-control package validation

Validated source/workflow commit: `25ea9e6a2126c84cabc980e3728423bb18b3bc08`

Overall performance package gate: **SUCCESS**

- Reproducible build/software: **SUCCESS**
- Chrome/Edge runtime: **SUCCESS**
- Generated WASM SHA-256: `5aa3d9ee7aae93ae6b8f95accd95c72339aa8c495147161659c5fa98a4b8b624`
- Generated glue SHA-256: `e695050a852735923a2387e0cb37f270795f8b3baf448602dc11d4d0751d14ef`
- Fixed PCM SHA-256: `313be5ffcb29436e92ecce45b5e1002c72dd810c6999379844b82ce87a18cfc2`

| Browser | Result | Version | Perf ABI | Sustain peak | Processor errors | Suspensions |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| chrome | **SUCCESS** | Chrome/151.0.7922.72 | 1 | 0.01348876953125 | 0 | 0 |
| edge | **SUCCESS** | Edg/150.0.4078.99 | 1 | 0.01348876953125 | 0 | 0 |

## Boundary

- Generated package is published only when reproducible build/software validation and both branded-browser runtime tests succeed.
- Audited MSFA source files remain unchanged; only the FM1-owned bridge/export ABI and generated Emscripten artifacts change.
- Fixed offline PCM must remain byte-identical to the accepted reference.
- Live pitch bend, modulation and aftertouch use documented DX7 function ranges/assignment masks; sustain is worklet lifecycle state.
- No physical DX7/FM-1 controller scaling, headroom or voice-stealing equivalence is claimed.

## chrome
```json
{
  "ok": true,
  "browserName": "chrome",
  "browserProduct": "Chrome/151.0.7922.72",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 20,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "workletPolyphony": 16,
  "performanceControlAbi": 1,
  "performanceCommandsVerified": true,
  "sustainedPeak": 0.01348876953125,
  "allocationVoiceIndices": [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15
  ],
  "stolenVoiceIndex": 0,
  "wasmSha256": "5aa3d9ee7aae93ae6b8f95accd95c72339aa8c495147161659c5fa98a4b8b624",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 20318,
  "cycles": 26,
  "maxPeak": 0.03997802734375,
  "activeSamples": 52,
  "partialChordSamples": 26,
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
  "browserProduct": "Edg/150.0.4078.99",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 20,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "workletPolyphony": 16,
  "performanceControlAbi": 1,
  "performanceCommandsVerified": true,
  "sustainedPeak": 0.01348876953125,
  "allocationVoiceIndices": [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15
  ],
  "stolenVoiceIndex": 0,
  "wasmSha256": "5aa3d9ee7aae93ae6b8f95accd95c72339aa8c495147161659c5fa98a4b8b624",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 20313,
  "cycles": 26,
  "maxPeak": 0.039886474609375,
  "activeSamples": 52,
  "partialChordSamples": 26,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running"
}
```
