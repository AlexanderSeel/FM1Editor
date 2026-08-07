# Compact preset fingerprint index core

Source commit: `2ad3471e67f7ce6d3be3e43aeb6e3998a7bbeeee`

Overall software gate: **SUCCESS**

The reconstruction path has a compact fingerprint representation for scalable catalog retrieval: resampled RMS/peak envelopes, per-resolution mean log-mel/MFCC vectors, and centroid/rolloff/flatness moments rather than retaining STFT matrices in the in-memory search index.

A separate local IndexedDB fingerprint cache is keyed by engine id/version, deterministic semantic render key, fingerprint schema and descriptor configuration. Unchanged standardized probes bypass rendering. The compact index is cancellable, uses C3/C4/C5 probes, handles unresolved pitch by falling back to the C4 probe, and returns ranked semantic voices with a metric breakdown.

Focused tests prove deterministic compactness, timbre separation, exact indexed-fingerprint ranking and renderer bypass on cache hits. Virtual-DX7 source audit, typecheck, lint, the full test suite and production build passed.

This is retrieval infrastructure only; nearest-preset remains open until its mounted UI supplies several ranked candidates, dry A/B playback and explicit load actions.
