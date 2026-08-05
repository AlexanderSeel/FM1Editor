# Draggable envelope validation

Validated source commit: `385b8e33a7aa5ff1215724f259ebd839db940409`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**
- Chromium horizontal rate dragging: **PASS**
- Chromium stage-4 rate dragging: **PASS**
- Chromium vertical level dragging: **PASS**
- Chromium keyboard precision controls: **PASS**
- numeric/graph synchronization: **PASS**
- single-step undo after pointer drag: **PASS**
- Chromium desktop render capture: **PASS**

Verified behavior:

- operator and pitch envelopes expose four horizontal rate handles and four vertical level handles;
- all handles support mouse, touch/pointer capture and keyboard adjustment;
- relative drag deltas remain stable across responsive SVG scaling;
- fixed graph timing keeps rate 4 directly movable instead of pinning the final point to the right edge;
- pointer movement updates a local draft and commits once on release;
- pointer cancellation restores the source envelope;
- pitch rate and level numeric controls remain available for exact values;
- selected-operator numeric controls stay synchronized with graph edits;
- graph edits flow through voice history, SysEx export and bank merge data.
