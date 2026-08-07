# Local virtual preview performance-control final gate

Validated source/workflow commit: `9f580c4dd0e5db7208ba2d97ff9755942216543d`

Overall final gate: **FAILED**

- Typecheck/lint/tests/build: **FAILED**
- Chrome/Edge performance runtime: **SUCCESS**

## Accepted scope

- Explicit browser-local audio enable remains required.
- Current semantic voice is synchronized into the audited renderer without changing hardware transmission behavior.
- 16-voice polyphony, per-note release and deterministic voice stealing are enabled for the local piano.
- Local pitch bend, modulation, sustain and aftertouch are exposed with documented DX7-style range/assignment controls.
- Performance state is separate from `Dx7Voice` and never automatically sent over Web MIDI/SysEx.
- Fixed offline PCM and physical DX7/FM-1 equivalence remain separate evidence domains.

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
  "durationMs": 20326,
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
  "durationMs": 20320,
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
