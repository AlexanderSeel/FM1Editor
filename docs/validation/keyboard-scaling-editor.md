# Keyboard scaling editor validation

Validated source commit: `e04ea6ee37235c45ca28bd5634613a0df43ee5b9`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**
- Chromium breakpoint dragging: **PASS**
- Chromium negative left-depth dragging: **PASS**
- Chromium positive right-depth dragging: **PASS**
- curve selector synchronization: **PASS**
- keyboard precision and range boundaries: **PASS**
- numeric/graph synchronization: **PASS**
- single-step undo after pointer drag: **PASS**
- Chromium desktop render capture: **PASS**

Verified behavior:

- keyboard scaling is visualized around the selected operator breakpoint;
- left and right sides independently render negative/positive linear or exponential curves;
- breakpoint, left depth and right depth expose accessible draggable sliders;
- mouse, touch/pointer capture and keyboard input are supported;
- responsive SVG scaling uses relative pointer deltas;
- graph edits commit once on pointer release and cancel safely;
- breakpoint, depths, rate scaling and curve selects remain available as precise controls;
- edits flow through voice history, SysEx export and bank merge data.
