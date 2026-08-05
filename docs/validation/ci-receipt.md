# CI validation receipt

Validated on GitHub Actions with Node `v22.23.1`.

- Validated commit: `4f085a18593558c2c3655ffac64b4d2106d0610f`
- `npm install --no-audit --no-fund`: **PASS**
- `npm run typecheck`: **PASS**
- `npm run lint`: **PASS**
- `npm run test`: **PASS** — 16 test files, 46 tests
- `npm run build`: **PASS**

Validated FM-1 transfer boundary:

- unsafe isolated single-voice and guessed byte-index parameter-stream transports are removed from the UI and transfer module;
- one selected slot is merged into a complete 32-voice base bank;
- the encoded transfer is one checksum-valid 4,104-byte Yamaha DX7 bank message;
- bank A/B/C/D plus slot 1–32 resolves to preset 1–128;
- the UI requires an explicit whole-bank overwrite confirmation;
- unchanged base-bank and merged-bank export are available before transfer;
- preset recall and virtual-piano note audition remain available.

Production build output:

- `dist/index.html`: 0.55 kB
- CSS bundle: 38.23 kB (7.17 kB gzip)
- JavaScript bundle: 309.39 kB (93.81 kB gzip)

Physical acceptance of the merged bank by the FM-1, its destination prompt and preservation of the other 31 voices remain hardware tests.
