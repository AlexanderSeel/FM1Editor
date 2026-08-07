# Local virtual preview integration

Validated source/workflow commit: `f9d8fd0def1c7b89fc57825bca5b70bf81f909fe`

Overall integration gate: **SUCCESS**

| Check | Result |
| --- | --- |
| mount | **SUCCESS** |
| install | **SUCCESS** |
| audit | **SUCCESS** |
| typecheck | **SUCCESS** |
| lint | **SUCCESS** |
| tests | **SUCCESS** |
| build | **SUCCESS** |

## Boundary

- `App.tsx` mounts a separate local-preview section above hardware audition.
- The preview does not impersonate a `MidiOutputTarget`.
- No `AudioContext` is created during render; the user must explicitly choose **Enable local audio**.
- After activation, only the current semantic `Dx7Voice` is mapped into the audited v3-stateful worklet.
- Voice changes use local all-notes-off before semantic resynchronization.
- Blur/visibility/unmount cleanup remains centralized in `VirtualPiano`; the preview additionally closes its AudioWorklet controller on unmount/disable.
- The exposed renderer remains explicitly monophonic; no polyphony claim is made.
- Hardware MIDI/SysEx audition remains a separate panel and action path.
