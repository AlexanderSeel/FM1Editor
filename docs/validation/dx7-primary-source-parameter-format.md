# Yamaha DX7 primary-source parameter format

Primary source: Yamaha DX7 Operating Manual, MIDI Data Format, pages 30–32 (`DX7E1.pdf` in Yamaha's official manual library).

## Verified parameter-change frame

The original Yamaha table defines parameter change format 1-2-4 as:

```text
F0 43 1n 0gggggpp 0ppppppp 0ddddddd F7
```

- `n`: zero-based MIDI channel 0–15
- `g = 0`: DX common voice parameter group
- `g = 2`: DX7 function parameter group
- the low two bits of the group byte carry the high two parameter-number bits
- the next byte carries the low seven parameter-number bits
- data is seven-bit

## Implemented voice parameters

The semantic voice model is mapped to Yamaha common-voice parameters `0–154` by the existing 155-byte single-voice encoder, whose byte indexes are the documented parameter numbers:

- six 21-parameter operator blocks in Yamaha order OP6 through OP1;
- pitch envelope parameters `126–133`;
- algorithm, feedback, oscillator sync, LFO and transpose parameters `134–144`;
- ten printable voice-name bytes `145–154`.

Edit-only parameter `155` remains separate from voice and bank payloads and is represented as the six-operator enable mask, with OP1 on bit 5 through OP6 on bit 0.

The selected DX7 target offers two explicitly confirmed operations:

1. send all 156 current semantic parameters to the edit buffer with 8 ms message spacing;
2. enable throttled live updates that coalesce graphical editor changes for 75 ms and send only changed parameters.

No arbitrary raw parameter-number or raw data entry is exposed. The controls require a manually selected SysEx-capable output, matching MIDI channel, System Info confirmation, Memory Protect confirmation, session enable confirmation and operation-specific confirmation.

## Implemented function parameters

Documented function parameters `64–77` use Yamaha group `2` and the printed semantic ranges. They are exposed through the selected DX7 target with a separate session enable and a parameter-specific confirmation. Function state remains separate from voice files and bank payloads.

## Dump-request decision

The original MIDI Data Format defines transmission and reception formats for one-voice and 32-voice bulk data. It does not define a programmatic single-voice or bank dump-request frame for the stock DX7.

The application therefore constructs no dump-request message. Voice and bank dumps must continue to be initiated from the DX7 front panel unless a later primary Yamaha source proves another supported request workflow.

## Hardware boundary

Software encoding is not physical-device validation. Stock DX7 reception still requires hardware verification with matching MIDI channel, System Info available, Memory Protect off and recovery testing after interrupted operations.

The current software changes also require a complete typecheck, lint, test, production-build and Chrome/Edge responsive validation run. That gate is not marked complete until an executable checkout or GitHub Actions result is available.
