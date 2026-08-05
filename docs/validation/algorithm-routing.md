# DX7 algorithm routing validation

Validated source commit: `dc80d5bd248444ded0910b7c21b17569dfcf44cf`

- npm install: **PASS**
- npm run typecheck: **PASS**
- npm run lint: **PASS**
- npm run test: **PASS**
- npm run build: **PASS**
- Chromium operator-routing interaction: **PASS**
- Chromium desktop render capture: **PASS**

Verified behavior:

- all 32 DX7 algorithms classify all six operators as carriers or modulators;
- modulation and feedback edges are derived from the reference operator-bus table;
- every topology lays out six finite operator positions inside the graph;
- carriers connect to the common audio output bus;
- selecting a graph node opens the corresponding numeric operator editor;
- OP1 mute writes output level 0 and Enable restores its remembered level;
- OP2 solo mutes the other five operators and exiting solo restores the captured levels;
- mute and solo changes flow through the application voice history and SysEx model;
- temporary solo state resets when another voice document is loaded;
- the interactive graph exposes controls as an accessible labelled group.
