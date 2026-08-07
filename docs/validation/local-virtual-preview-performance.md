# Local virtual preview performance-control integration

Validated source/workflow commit: `99f55ae563570ef9b69f125c523618c9b995bbc2`

Overall integration gate: **FAILED**

- Software/type/lint/test/build: **FAILED**
- Chrome/Edge accepted-package runtime: **SUCCESS**

## Boundary

- The visible preview exposes pitch bend, bend range/step, modulation range/assignment/value, sustain and aftertouch range/assignment/value only after explicit local-audio activation for live values.
- Local performance configuration is separate from `Dx7Voice`; no voice SysEx bytes are changed by these controls.
- The preview controller requires manifest/worklet performance ABI 1 and validates all documented ranges before posting commands.
- No performance action is routed to Web MIDI or a selected hardware output.
- Browser runtime coverage reuses the accepted package and verifies sustain, performance commands, polyphony, silence recovery and zero processor errors/suspensions.
- Physical DX7/FM-1 scaling/equivalence remains unverified.

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
  "durationMs": 20324,
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
  "durationMs": 20305,
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
