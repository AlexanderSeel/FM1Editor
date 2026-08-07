# Local Audio-to-FM reference input software validation

Overall software gate: **SUCCESS**

## Accepted scope

- Voice workspace exposes a separate **Audio → FM reference** panel.
- WAV and MP3 are accepted; other extensions/MIME combinations are rejected.
- File size is capped at 25 MB and decoded source duration at 120 seconds before region selection.
- Prepared analysis regions are limited to 30 seconds and at least 50 ms.
- Region selection, −60 dBFS leading/trailing silence trim, channel averaging to mono, optional −1 dBFS peak normalization, deterministic autocorrelation pitch estimate and 20–5000 Hz manual override are implemented.
- Source bytes receive a local SHA-256 identity.
- Decoding starts only after explicit file selection. The feature contains no upload/server path; privacy is explicitly local-browser-only.
- Typecheck, lint, full tests and production build passed with the panel mounted in the application.

Browser codec behavior still depends on the browser's decodeAudioData support for the specific WAV/MP3 encoding. Physical FM-1 audio is not involved in this validation.
