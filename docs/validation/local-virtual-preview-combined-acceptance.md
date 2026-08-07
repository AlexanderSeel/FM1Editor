# Local virtual preview combined acceptance

Validated source/workflow commit: `d3fbfac54ccb4b114c74be0e90154897da41f476`

Overall combined gate: **SUCCESS**

- Same-commit software suite: **SUCCESS**
- Chrome/Edge runtime: **SUCCESS**

## Accepted scope

- Explicit local audio activation; no automatic Web MIDI/SysEx.
- Audited dry renderer with 16-voice worklet polyphony, deterministic stealing and per-note release.
- Local DX7-style pitch bend, modulation, sustain and aftertouch performance controls remain outside `Dx7Voice` and hardware transmission.
- Fixed offline PCM identity and physical-device equivalence remain separate evidence domains.
- Browser CI is headless/muted; audible physical-device dropout/headroom is not claimed.

## chrome
```json
{
  "ok": true,
  "browserName": "chrome",
  "browserProduct": "Chrome/150.0.7871.187",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 10,
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
  "durationMs": 10261,
  "cycles": 13,
  "maxPeak": 0.039825439453125,
  "activeSamples": 26,
  "partialChordSamples": 13,
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
  "requestedSoakSeconds": 10,
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
  "durationMs": 10258,
  "cycles": 13,
  "maxPeak": 0.039825439453125,
  "activeSamples": 26,
  "partialChordSamples": 13,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running"
}
```
