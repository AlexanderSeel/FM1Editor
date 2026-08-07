# Virtual FM-1 note/chord WAV renderer software validation

Source commit: `a49dc0f7c7dd1c81508b1adfffe8cbe80195e322`

Overall software gate: **SUCCESS**

The preview export path renders one to sixteen semantic MIDI notes through the validated deterministic offline MSFA engine, mixes simultaneous notes with deterministic square-root headroom plus a 0.98 peak safety guard, and preserves per-note render keys. Browser export can route that dry mix through the same FM-1-inspired FX/master/limiter graph in an OfflineAudioContext before using the repository PCM16 WAV encoder.

Focused tests cover unattenuated single-note rendering, deterministic chord headroom, injected preview processing, RIFF/WAVE emission and invalid-note rejection. Virtual-DX7 source audit, typecheck, lint, full tests and production build passed.

Real OfflineAudioContext FX rendering still requires branded-browser evidence before the overall Virtual FM-1 preview roadmap item can close.
