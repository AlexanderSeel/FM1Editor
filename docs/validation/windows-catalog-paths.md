# Windows catalog path validation

Validated source commit: `d7e38ad6c0ae322ec2f395c4d1e94b641b2795b3`

- native path regression tests on Ubuntu and Windows: **SUCCESS**
- typecheck, lint, full tests and production build: **SUCCESS**

- file URLs are converted with fileURLToPath before native path operations.
- nested Yamaha mirror directories resolve under public/catalog on Windows.
- catalog-relative paths that escape the output root are rejected.
- the former C:\\C:\\... path duplication is covered by the Windows runner.
