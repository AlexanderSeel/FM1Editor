# Exact SysEx import preservation validation

Validated source commit: `76927ddf2c92e6af058f582e6839ac3fec1508b2`

- Node setup: **SUCCESS**
- npm install: **SUCCESS**
- npm run typecheck: **SUCCESS**
- npm run lint: **SUCCESS**
- npm run test: **SUCCESS**
- npm run build: **SUCCESS**
- exact-import marker check: **SUCCESS**

- imported files are copied byte-for-byte before semantic normalization.
- exact originals can be downloaded unchanged from the import toolbar.
- original copies remain browser-memory-only until the next import or reload.
- normalized exports still use standards-valid values and recalculated checksums.
- every compatibility normalization remains available as structured metadata and a warning diagnostic.
