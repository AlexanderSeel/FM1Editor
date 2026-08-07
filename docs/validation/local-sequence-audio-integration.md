# Local sequence audio UI integration

Validated source/workflow commit: `2d9459d6bb2e569d22817dd2872a2f76c717f3ec`

Overall software integration gate: **SUCCESS**

## Boundary

- The persistent sequencer workspace now exposes a separate **Local sequence audio** section above the existing hardware MIDI sequence editor.
- Local enable/play/stop actions use `createMsfaAudioWorkletController` plus the semantic local scheduler; they never adapt local audio into `MidiOutputTarget`.
- Existing hardware MIDI Play/Stop, MIDI clock and external-clock handling remain unchanged.
- Local sequence playback explicitly supports internal BPM clock only; external clock remains a hardware route until separately implemented.
- Sequence edits during local playback stop the local player and release local notes before a restart.
- Voice changes stop local playback, issue all-notes-off and synchronize the new semantic voice.
- Source audit, typecheck, lint, full tests and production build passed.
- Real browser end-to-end clicking of the new transport remains a separate validation step.
