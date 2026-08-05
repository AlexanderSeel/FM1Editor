# Catalog download integrity validation

Validated source commit: `3a8d399bab7d39bf1019805237c4264b25f6030b`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Verified behavior:

- Yamaha Black Boxes downloads must be complete 4104-byte DX7 bank messages;
- Yamaha manufacturer, bank format, declared payload, framing and checksum are validated;
- HTML, JSON, truncated and checksum-invalid responses are rejected;
- invalid downloads are not written to the build mirror or manifest;
- cached mirror files are independently validated before reuse;
- runtime loading validates the mirror and falls back to the direct source only when needed.
