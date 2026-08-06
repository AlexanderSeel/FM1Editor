# Plan sections 3–7 TypeScript diagnostics

Source commit: `396f69e289020a9501b7e83483279d62e1dbe82a`

```text

> fm1-editor@0.1.0 typecheck
> tsc -b --pretty false

src/domain/sequenceOperations.test.ts(100,5): error TS2375: Type 'Fm1Sequence' is not assignable to type '{ length: number; direction: "reverse"; version: 1; name: string; bpm: number; swing: number; midiChannel: number; steps: readonly SequenceStep[]; clockMode?: SequenceClockMode; sendMidiClock?: boolean; patterns?: readonly SequencePattern[]; arrangement?: readonly SequenceArrangementEntry[]; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'direction' are incompatible.
    Type 'SequenceDirection' is not assignable to type '"reverse"'.
      Type '"forward"' is not assignable to type '"reverse"'.
```
