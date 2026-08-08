# GitHub Pages repository-subpath readiness

Source commit: `83002dc9403fdcfb0733ccea58895d4d11d4d6c9`

Static routing/build acceptance: **SUCCESS**

| Stage | Exit |
| --- | ---: |
| audit-virtual | 0 |
| audit-research | 0 |
| typecheck | 0 |
| lint | 0 |
| full-test | 0 |
| pages-build | 0 |
| pages-subpath-smoke | 0 |

The Pages build uses `/FM1Editor/` as the deployment base. The smoke serves the generated `dist` only beneath that prefix and verifies the application entry, manifest, service worker, icons, virtual-DX7 manifest/module/WASM/AudioWorklet, catalog ZIP and sync manifest resolve under the prefix while equivalent root-only catalog/WASM requests fail.

PWA registration already derives `sw.js` and scope from `import.meta.env.BASE_URL`; the service worker derives its navigation fallback from `self.registration.scope`; the web manifest uses relative start/scope/icon URLs. Catalog and virtual-DX7 runtime loaders use the Vite base URL.

This is static/subpath/PWA routing evidence only. It does not verify Web MIDI permission, SysEx, USB audio or AudioWorklet behavior on the final GitHub Pages HTTPS origin with physical hardware, so deployment remains disabled until the existing physical browser/hardware prerequisite is recorded.
