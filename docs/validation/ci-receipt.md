# CI validation receipt

Validated on GitHub Actions with Node `v22.23.1`.

- Validated commit: `aad4626c8ff69c63980be4ba07bd23baa76c4d41`
- `npm install --no-audit --no-fund`: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity (`unzip -t`): **PASS**
- `npm run typecheck`: **PASS**
- `npm run test`: **PASS** — 12 test files, 32 tests
- `npm run build`: **PASS**

Validated catalog behavior:

- tracked archive path: `public/catalog/sysexFinal.zip`
- size: 2,785,215 bytes
- SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`
- 1,304 archive banks
- 1,288 checksum-valid banks
- 16 diagnostic files
- 35 Yamaha Black Boxes website banks merged during prebuild
- mixed/malformed SysEx diagnostics regression tests passed

Production build output:

- `dist/index.html`: 0.55 kB
- CSS bundle: 30.31 kB (6.09 kB gzip)
- JavaScript bundle: 285.29 kB (87.63 kB gzip)
