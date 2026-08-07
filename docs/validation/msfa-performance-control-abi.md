# MSFA performance-control ABI validation

Validated source/workflow commit: `3afdbbc82810a40a08d1b4e89d9999516512ade0`

Overall performance-control gate: **FAILED**

- Reproducible rebuild/software gate: **FAILED**
- WASM SHA-256: `n/a`
- Glue SHA-256: `n/a`
- Fixed offline PCM SHA-256: `n/a`

| Browser | Result | Version | Performance ABI | Sustain peak | Processor errors | Suspensions |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| chrome | **FAILURE** | n/a | n/a | n/a | n/a | n/a |
| edge | **FAILURE** | n/a | n/a | n/a | n/a | n/a |

## Scope

- Keeps the audited Apache MSFA source package unchanged; only the FM1-owned bridge, exported C ABI and generated Emscripten package change.
- Preserves the accepted fixed offline PCM hash exactly while adding live pitch bend, modulation and aftertouch setters.
- Uses documented DX7 function ranges/assignment masks; performance state remains separate from the 155-byte voice.
- Sustain is implemented in the repository-owned worklet note lifecycle and verified to keep a released note active until pedal release.
- Re-runs deterministic 16-voice allocation/stealing and Chrome/Edge processor stability on the rebuilt WASM.
- This does not claim physical Yamaha DX7 or M-VAVE FM-1 controller scaling/headroom equivalence.

## chrome
```json
{
  "ok": false,
  "browserName": "chrome",
  "error": "result artifact missing"
}
```

## edge
```json
{
  "ok": false,
  "browserName": "edge",
  "error": "result artifact missing"
}
```
