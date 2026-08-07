# Local sequence audio real-browser UI acceptance

Validated source/workflow commit: `e80a18a488f393548763f9692b7953574f27a70f`

Overall UI route gate: **SUCCESS**

- Same-commit software suite: **SUCCESS**
- Branded Chrome/Edge mounted UI: **SUCCESS**

| Browser | Result | Version | Worklet nodes | Active peak | Silence peak |
| --- | --- | --- | ---: | ---: | ---: |
| chrome | **SUCCESS** | Chrome/151.0.7922.72 | 1 | 0.125 | 0 |
| edge | **SUCCESS** | Edg/151.0.4129.59 | 1 | 0.125 | 0 |

## Acceptance scope

- Loads the production build, switches to the persistent Sequencer workspace and operates the mounted **Local sequence audio** controls through DOM clicks.
- Verifies explicit local-audio activation creates exactly one worklet node for the route.
- Connects a zero-gain analyser branch to that actual UI-created worklet, requires non-silent PCM during **Play local**, then requires silence after **Stop local**.
- Requires no window errors or unhandled rejections in the browser run.
- Hardware MIDI controls are not clicked and no MIDI output is required.
- External MIDI-clock local playback remains intentionally unsupported and is not claimed by this gate.
- Headless/muted CI validates graph execution, not audible physical-device output.

## chrome
```json
{
  "ok": true,
  "browserName": "chrome",
  "browserProduct": "Chrome/151.0.7922.72",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36",
  "workletNodeCount": 1,
  "activePeak": 0.125,
  "silencePeak": 0,
  "errors": [],
  "rejections": [],
  "ready": true,
  "playheadVisible": false,
  "hardwareTextPresent": true
}
```

## edge
```json
{
  "ok": true,
  "browserName": "edge",
  "browserProduct": "Edg/151.0.4129.59",
  "browserUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0",
  "workletNodeCount": 1,
  "activePeak": 0.125,
  "silencePeak": 0,
  "errors": [],
  "rejections": [],
  "ready": true,
  "playheadVisible": false,
  "hardwareTextPresent": true
}
```
