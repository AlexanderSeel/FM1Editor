# Preset descriptor cache and render-index validation

Source commit: `9b0069a35244844e48922511a802e4af91f8437f`

Overall software gate: **SUCCESS**

## Accepted scope

- Descriptor cache keys include engine id/version, deterministic semantic render key, descriptor schema and the complete descriptor configuration.
- Unchanged standardized preset probes reuse cached descriptors without invoking the synth renderer.
- Cache misses render through the validated offline engine and persist the resulting versioned descriptor profile.
- A browser IndexedDB adapter stores typed descriptor arrays locally; an isolated memory adapter provides deterministic test coverage.
- Cache reads return cloned descriptor snapshots so consumers cannot mutate cached state accidentally.
- The existing cancellable standardized preset index workflow now accepts the cache without changing semantic voices, probe definitions or physical-hardware boundaries.
- Virtual-DX7 source audit, typecheck, lint, focused cache/index tests, the full test suite and production build all passed.

No reference audio, descriptor or rendered PCM is uploaded by this cache. Physical FM-1/DX7 timing or fidelity is not part of this validation.
