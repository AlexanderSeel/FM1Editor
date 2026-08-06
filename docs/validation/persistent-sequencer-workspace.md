# Persistent sequencer workspace validation

Validated source commit: `891b3c63057d04a14841a159d7dfd12af5306ddb`

- npm install: **SUCCESS**
- TypeScript typecheck: **SUCCESS**
- ESLint and JSX accessibility: **SUCCESS**
- Full Vitest suite: **SUCCESS**
- Production build: **SUCCESS**

- The sequencer editor remains mounted when Voice, Library or Effects is selected.
- Inactive sequencer UI is removed from layout and the accessibility tree with the hidden attribute.
- Internal loop timers and scheduled MIDI survive application workspace navigation.
- Explicit Stop, component disposal and MIDI-output safety behavior remain unchanged.
- Live Program Change and FM-1 effect CC messages can be sent while the sequencer loop continues.
