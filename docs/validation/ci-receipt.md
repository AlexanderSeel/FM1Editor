# CI validation receipt

Validated on GitHub Actions with Node `v22.23.1`.

- Validated commit: `b44ac9c0344bea7c7ce329b0b7c62dba66ae8763`
- `npm install --no-audit --no-fund`: **PASS**
- tracked archive SHA-256: **PASS**
- tracked archive ZIP integrity (`unzip -t`): **PASS**
- `npm run typecheck`: **PASS**
- `npm run test`: **PASS** — 11 test files, 30 tests
- `npm run build`: **PASS**

Tracked archive:

- path: `public/catalog/sysexFinal.zip`
- size: 2,785,215 bytes
- SHA-256: `fde5aad29b215aa3ea67e9f57bf55d4443cc6efe7562d6cb6dc375b3c780b263`
- catalog regression test: 1,304 archive banks, 1,288 checksum-valid banks, 16 diagnostic files

Production build output:

- `dist/index.html`: 0.55 kB
- CSS bundle: 30.01 kB (6.05 kB gzip)
- JavaScript bundle: 281.74 kB (86.62 kB gzip)
