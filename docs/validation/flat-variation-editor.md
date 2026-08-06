# Flat hardware and voice variation validation

Validated source commit: `90eb88d7204e5e74e51df5738cf3dbe22ef60941`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**
- flat chassis and button geometry: **PASS**
- six non-overlapping two-line algorithm nodes: **PASS**
- compact envelope and range controls: **PASS**
- constrained randomization and A/B recall: **PASS**
- Chromium desktop render capture: **PASS**

Verified behavior:

- surfaces use a flatter short-bevel hardware treatment;
- algorithm labels stay inside their nodes without node collisions;
- envelope summaries and range modules remain compact;
- initialized variants, randomization and mutation produce valid DX7 voices;
- transformed voices discard stale encoded source representations;
- generated results stage the prior voice in A and the result in B;
- applied changes remain part of normal undo/redo history.
