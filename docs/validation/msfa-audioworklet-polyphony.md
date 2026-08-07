# MSFA AudioWorklet polyphony validation

Validated source/workflow commit: `50841e86921caad3446665ea09f8fc01ff569cf8`

Overall polyphony gate: **SUCCESS**

- Same-commit software suite: **SUCCESS**
- Audited WASM identity remains unchanged; polyphony is orchestration over 16 stateful sessions in the repository-owned AudioWorklet.

| Browser | Result | Version | Duration | Cycles | Allocation | 17th-note steal | Peak | Processor errors | Suspensions |
| --- | --- | --- | ---: | ---: | --- | --- | ---: | ---: | ---: |
| chrome | **SUCCESS** | Chrome/151.0.7922.72 | 30374 ms | 39 | 0–15 | voice 0 | 0.039886474609375 | 0 | 0 |
| edge | **SUCCESS** | Edg/150.0.4078.99 | 30383 ms | 39 | 0–15 | voice 0 | 0.039886474609375 | 0 | 0 |

## Acceptance scope

- Manifest and controller require exactly 16 worklet voices.
- Initial simultaneous allocation must return voice indices `0` through `15` in deterministic order.
- With all 16 voices held, the 17th note must deterministically steal the oldest held voice, index `0`.
- Repeated triads must use distinct voices; releasing one MIDI note must leave the remaining chord active.
- All-notes-off must return the analyser to silence with zero processor errors, window errors, unhandled rejections or unresolved AudioContext suspension.
- The single-note synthesis engine and WASM hash are unchanged. The worklet sums stateful sessions and applies a final safety clamp; this is not a physical DX7/FM-1 headroom or voice-stealing equivalence claim.
- Hardware MIDI/SysEx and physical FM-1/DX7 behavior are outside this gate.

## chrome
```json
{
  "ok": true,
  "browserName": "chrome",
  "browserProduct": "Chrome/151.0.7922.72",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36",
  "protocolVersion": "1.3",
  "requestedSoakSeconds": 30,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "workletPolyphony": 16,
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
  "wasmSha256": "623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 30374,
  "cycles": 39,
  "maxPeak": 0.039886474609375,
  "activeSamples": 78,
  "partialChordSamples": 39,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running",
  "allocationSatisfied": true,
  "stealSatisfied": true,
  "durationSatisfied": true
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
  "requestedSoakSeconds": 30,
  "engineVersion": "msfa-2e182b3-fm1-v3-stateful",
  "workletPolyphony": 16,
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
  "wasmSha256": "623cf6f5695184861fd5ca17e6f66723426b6d03cfc81d84c02cd734a00e097a",
  "sampleRate": 48000,
  "baseLatency": 0.010020833333333333,
  "outputLatency": 0.032,
  "durationMs": 30383,
  "cycles": 39,
  "maxPeak": 0.039886474609375,
  "activeSamples": 78,
  "partialChordSamples": 39,
  "silencePeak": 0,
  "processorErrors": 0,
  "windowErrors": [],
  "unhandledRejections": [],
  "suspendedObservations": 0,
  "audioContextState": "running",
  "allocationSatisfied": true,
  "stealSatisfied": true,
  "durationSatisfied": true
}
```
