# Audio → FM candidate artifacts UI validation

Source commit: `381fb37faedda3668d991307df312f546bcb3282`

Overall software gate: **SUCCESS**

Refined candidates expose semantic parameter differences from their retrieved initialization and a checksum-valid Yamaha DX7 single-voice `.syx` export. Packed/unpacked provenance bytes are ignored by semantic diffing. Export, audition and editor load remain separate explicit actions and do not open Web MIDI or transmit hardware data.

Engine audit, strict typecheck, lint, focused artifact/refinement/UI tests, full tests and production build passed.
