# PWA foundation validation

Validated source commit: `120d3d2608b80a473d685245f98d32f5b0ad2a6e`

Merged to `main` as: `cb1e7eece66b6a457d54b09e5689deab64cbe4da`

GitHub Actions PR run: `31007433025`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**

Verified behavior and build guarantees:

- the web app manifest provides standalone display metadata, theme/background colors and 192/512 install icons;
- service-worker registration is production-only and respects Vite's deployment base path;
- the production build injects the exact hashed JavaScript, CSS, manifest and icon assets into the service-worker precache;
- unresolved service-worker build placeholders fail the production build;
- navigation uses network-first behavior with a cached application-shell fallback;
- static scripts, styles, images and fonts use cache-first runtime behavior;
- the large SysEx patch archive and remote catalog data are intentionally excluded from the shell precache;
- waiting service-worker updates require an explicit reload action, preserving the existing unsaved-change browser guard;
- the UI reports offline mode and notes that local library and MIDI functions remain available while remote catalog access requires a connection.
