# Sequencer loop, viewport and cursor validation

Validated source commit: `39b221cc1b2c14e2c1beb64209bb0459b45042de`

- deterministic patch: **SUCCESS**
- npm install: **SUCCESS**
- TypeScript typecheck: **SUCCESS**
- ESLint and JSX accessibility: **SUCCESS**
- Full Vitest suite: **SUCCESS**
- Production build: **SUCCESS**

Covered changes:

- internal-clock playback repeats until Stop or the Loop control is disabled;
- external-clock playback follows Start/Clock continuously until MIDI Stop;
- Stop and a new Play invalidate previous loop generations and clear scheduled output;
- octave controls move a 24-note piano-roll viewport across MIDI notes 0–127;
- note edits outside the current viewport reveal the edited note automatically;
- grid and primary-note edits move a visible step/note cursor immediately.
